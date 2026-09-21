import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DataPage, StatusBadge, AED } from "@/components/admin/DataPage";
import { ProductDetailView } from "@/components/admin/DetailViews";
import { Boxes } from "lucide-react";
import { fetchList, fetchProductDetail } from "@/lib/api/resources";
import { api, num, str } from "@/lib/api/client";
import { useAdminLookups } from "@/hooks/useAdminLookups";
import type { SelectOption } from "@/components/admin/SearchableSelect";

export const Route = createFileRoute("/_admin/catalog")({
  head: () => ({ meta: [{ title: "Product Catalog — ResPy" }] }),
  component: CatalogPage,
});

type ProductRow = {
  id: string;
  sku: string;
  name: string;
  category: string;
  categoryId: string;
  brand: string;
  unit: string;
  unitId: string;
  price: number;
  supplier: string;
  organizationId: string;
  stock: number;
  description: string;
  status: string;
  imageUrl: string;
  imageFileId: string;
  exciseApplicable: string;
  exciseRate: string;
  vatRate: string;
};

function mapProductRow(r: any): ProductRow {
  const attrs = (r.attributes && typeof r.attributes === "object" ? r.attributes : {}) as Record<
    string,
    unknown
  >;
  const inventoryTotal = Array.isArray(r.inventoryItems)
    ? r.inventoryItems.reduce((s: number, i: any) => s + num(i.stock ?? i.quantity), 0)
    : null;
  const latestPrice = Array.isArray(r.marketPrices) ? r.marketPrices[0] : null;
  const primaryImage =
    Array.isArray(r.images) && r.images[0]
      ? str(r.images[0]?.file?.cdnUrl ?? r.images[0]?.cdnUrl ?? r.images[0]?.url, "")
      : "";
  const primaryFileId =
    Array.isArray(r.images) && r.images[0]
      ? str(r.images[0]?.fileId ?? r.images[0]?.file?.id, "")
      : "";
  return {
    id: str(r.id),
    sku: str(r.sku ?? r.productCode ?? r.id),
    name: str(r.name, "—"),
    category: str(r.category?.name ?? "", "—"),
    categoryId: str(r.categoryId ?? r.category?.id, ""),
    brand: str(r.brand?.name ?? attrs.brand, "—"),
    unit: str(r.unit?.name ?? r.unit?.symbol ?? "", "—"),
    unitId: str(r.unitId ?? r.unit?.id, ""),
    price: num(attrs.price ?? latestPrice?.price ?? r.listPrice ?? r.basePrice ?? r.price),
    supplier: str(r.organization?.name ?? r.brand?.name ?? attrs.supplier, "—"),
    organizationId: str(r.organizationId ?? r.organization?.id, ""),
    stock: num(r.stock ?? inventoryTotal ?? attrs.stock),
    description: str(r.description ?? attrs.description, ""),
    status: str(r.status, "active"),
    // Preview only — API resolves from product_images (never products.image_url)
    imageUrl: str(primaryImage || r.imageUrl, ""),
    imageFileId: primaryFileId,
    exciseApplicable:
      r.exciseApplicable === true || r.exciseApplicable === "true" || r.exciseApplicable === 1
        ? "true"
        : "false",
    exciseRate: r.exciseRate != null && r.exciseRate !== "" ? String(r.exciseRate) : "",
    vatRate: r.vatRate != null && r.vatRate !== "" ? String(r.vatRate) : "",
  };
}

function toProductPayload(data: Record<string, any>) {
  const categoryId = data.categoryId ? String(data.categoryId) : undefined;
  const organizationId = data.organizationId ? String(data.organizationId) : undefined;
  const unitId = data.unitId ? String(data.unitId) : undefined;
  const fileId = data.imageFileId != null ? String(data.imageFileId).trim() : "";
  const preview = data.imageUrl != null ? String(data.imageUrl).trim() : "";
  // product_images only: send new file id, or clear when preview removed; omit if unchanged
  const imagePatch = fileId ? { imageFileId: fileId } : !preview ? { imageFileId: "" } : {};
  return {
    name: String(data.name || "").trim(),
    // SKU / item code is always system-generated on create
    ...(categoryId ? { categoryId } : {}),
    ...(organizationId ? { organizationId } : {}),
    ...(unitId ? { unitId } : data.unit && data.unit !== "—" ? { unit: String(data.unit) } : {}),
    status: data.status || "active",
    price: data.price === "" || data.price == null ? undefined : Number(data.price),
    stock: data.stock === "" || data.stock == null ? undefined : Number(data.stock),
    exciseApplicable:
      data.exciseApplicable === true ||
      data.exciseApplicable === "true" ||
      data.exciseApplicable === "yes" ||
      data.exciseApplicable === 1,
    exciseRate: data.exciseRate === "" || data.exciseRate == null ? null : Number(data.exciseRate),
    vatRate: data.vatRate === "" || data.vatRate == null ? null : Number(data.vatRate),
    ...imagePatch,
  };
}

function CatalogPage() {
  const qc = useQueryClient();
  const { categories, suppliers } = useAdminLookups(["categories", "suppliers"]);

  const {
    data: rows = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["catalog", "products"],
    queryFn: async () => {
      // Active only — archived/image-less seed leftovers clutter the picture column
      const list = await fetchList("/catalog/products", { status: "active", limit: 500 });
      return list.map(mapProductRow);
    },
  });

  const { data: unitOptions = [] } = useQuery({
    queryKey: ["catalog", "units"],
    queryFn: async () => {
      try {
        const list = await fetchList("/catalog/units");
        return list.map((u: any) => ({
          value: str(u.id),
          label: str(u.name || u.symbol || u.id),
        })) as SelectOption[];
      } catch {
        return [] as SelectOption[];
      }
    },
    staleTime: 60_000,
  });

  const fallbackUnitOptions: SelectOption[] = useMemo(() => {
    if (unitOptions.length) return unitOptions;
    const seen = new Set<string>();
    const out: SelectOption[] = [];
    for (const r of rows) {
      const label = String(r.unit ?? "").trim();
      const value = String(r.unitId || label).trim();
      if (!label || label === "—" || !value || seen.has(value)) continue;
      seen.add(value);
      out.push({ value, label });
    }
    return out.sort((a, b) => a.label.localeCompare(b.label));
  }, [rows, unitOptions]);

  const active = rows.filter((r) => r.status === "active").length;
  const low = rows.filter((r) => r.stock > 0 && r.stock < 100).length;

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["catalog", "products"] });
    await qc.invalidateQueries({ queryKey: ["lookups", "categories"] });
  };

  return (
    <DataPage
      title="Product Catalog"
      description="Master catalog with templates, units, pricing and stock signals."
      icon={<Boxes className="h-5 w-5 text-primary" />}
      idKey="id"
      entityName="Product"
      formFields={[
        {
          key: "sku",
          label: "Item code",
          type: "readonly",
          placeholder: "Auto: CATEGORY + product ID (on create)",
        },
        {
          key: "name",
          label: "Product",
          required: true,
          type: "text",
          placeholder: "Product name",
        },
        {
          key: "imageUrl",
          label: "Picture",
          type: "image",
          placeholder: "Upload → stored in product_images (DigitalOcean file)",
        },
        {
          key: "categoryId",
          label: "Category",
          required: true,
          type: "searchable",
          selectOptions: categories,
          placeholder: "Search categories…",
          allowClear: true,
        },
        {
          key: "unitId",
          label: "Unit",
          required: true,
          type: "searchable",
          selectOptions: fallbackUnitOptions,
          placeholder: "kg, carton, liter…",
          allowClear: true,
        },
        { key: "price", label: "Price", required: true, type: "number" },
        {
          key: "organizationId",
          label: "Supplier",
          type: "searchable",
          selectOptions: suppliers,
          placeholder: "Search suppliers…",
          allowClear: true,
        },
        { key: "stock", label: "Stock", type: "number" },
        {
          key: "exciseApplicable",
          label: "Excise applicable",
          type: "select",
          options: ["false", "true"],
        },
        { key: "exciseRate", label: "Excise % override", type: "number" },
        { key: "vatRate", label: "VAT % override", type: "number" },
        {
          key: "status",
          label: "Status",
          required: true,
          type: "select",
          options: ["active", "inactive", "draft", "archived"],
        },
      ]}
      viewFields={[
        { key: "sku", label: "Item code" },
        { key: "name", label: "Product" },
        { key: "imageUrl", label: "Picture" },
        { key: "category", label: "Category" },
        { key: "brand", label: "Brand" },
        { key: "unit", label: "Unit" },
        { key: "price", label: "Price" },
        { key: "supplier", label: "Supplier" },
        { key: "stock", label: "Stock" },
        { key: "exciseApplicable", label: "Excise applicable" },
        { key: "vatRate", label: "VAT % override" },
        { key: "description", label: "Description" },
        { key: "status", label: "Status" },
      ]}
      loadDetail={async (row) => {
        try {
          return await fetchProductDetail(row.id);
        } catch {
          return row;
        }
      }}
      renderView={(detail) => <ProductDetailView detail={detail} />}
      lookups={{
        categoryId: categories,
        organizationId: suppliers,
        unitId: fallbackUnitOptions,
      }}
      kpis={[
        { label: "SKUs", value: String(rows.length) },
        { label: "Active", value: String(active), tone: "success" },
        { label: "Low stock", value: String(low), tone: "warning" },
        { label: "Categories", value: String(categories.length || "—") },
      ]}
      rows={rows}
      searchKeys={["sku", "name", "category", "supplier"]}
      emptyHint={
        isLoading ? "Loading…" : isError ? "Failed to load catalog." : "No products found."
      }
      columns={[
        { key: "sku", label: "Item code", className: "font-mono text-xs" },
        {
          key: "name",
          label: "Product",
          render: (r) => (
            <span className="inline-flex items-center gap-2 min-w-0">
              <span className="h-7 w-7 shrink-0 overflow-hidden rounded border border-border bg-muted/50 flex items-center justify-center">
                {r.imageUrl ? (
                  <img src={r.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[9px] text-muted-foreground">—</span>
                )}
              </span>
              <span className="font-medium truncate">{r.name}</span>
            </span>
          ),
        },
        {
          key: "category",
          label: "Category",
          render: (r) => categories.find((c) => c.value === r.categoryId)?.label ?? r.category,
        },
        {
          key: "unit",
          label: "Unit",
          render: (r) => fallbackUnitOptions.find((u) => u.value === r.unitId)?.label ?? r.unit,
        },
        { key: "price", label: "Price", render: (r) => AED(r.price) },
        {
          key: "supplier",
          label: "Supplier",
          render: (r) => suppliers.find((s) => s.value === r.organizationId)?.label ?? r.supplier,
        },
        { key: "stock", label: "Stock", className: "whitespace-nowrap w-[1%]" },
        {
          key: "exciseApplicable",
          label: "Excise",
          className: "whitespace-nowrap w-[1%]",
          render: (r) => (r.exciseApplicable === "true" ? "Yes" : "No"),
        },
        {
          key: "status",
          label: "Status",
          className: "whitespace-nowrap w-[1%]",
          render: (r) => <StatusBadge status={r.status} />,
        },
      ]}
      onCreate={async (data) => {
        const payload = toProductPayload(data);
        if (!payload.name) throw new Error("Product name is required");
        const created = await api.post<any>("/catalog/products", payload);
        await invalidate();
        return mapProductRow(created);
      }}
      onUpdate={async (id, data) => {
        const payload = toProductPayload(data);
        if (!payload.name) throw new Error("Product name is required");
        const updated = await api.patch<any>(`/catalog/products/${id}`, payload);
        await invalidate();
        return mapProductRow(updated);
      }}
      onDelete={async (id) => {
        await api.delete(`/catalog/products/${id}`);
        await invalidate();
      }}
    />
  );
}
