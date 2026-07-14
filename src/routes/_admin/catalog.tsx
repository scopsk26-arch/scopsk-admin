import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataPage, StatusBadge, AED } from "@/components/admin/DataPage";
import { Boxes } from "lucide-react";
import { fetchList } from "@/lib/api/resources";
import { num, str } from "@/lib/api/client";
import { useAdminLookups } from "@/hooks/useAdminLookups";
import type { SelectOption } from "@/components/admin/SearchableSelect";

export const Route = createFileRoute("/_admin/catalog")({
  head: () => ({ meta: [{ title: "Product Catalog — Prime Plate" }] }),
  component: CatalogPage,
});

function CatalogPage() {
  const { categories, suppliers } = useAdminLookups();

  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["catalog", "products"],
    queryFn: async () => {
      const list = await fetchList("/catalog/products");
      return list.map((r: any) => ({
        sku: str(r.sku ?? r.id),
        name: str(r.name, "—"),
        category: str(r.category?.name ?? "", "—"),
        categoryId: str(r.categoryId ?? r.category?.id, ""),
        unit: str(r.unit?.name ?? r.unit?.symbol ?? r.unitId, "—"),
        price: num(r.metadata?.price ?? r.listPrice),
        supplier: str(r.brand?.name ?? r.organization?.name ?? r.metadata?.supplier, "—"),
        stock: num(r.metadata?.stock),
        status: str(r.status, "active"),
        id: str(r.id),
      }));
    },
  });

  const unitOptions: SelectOption[] = useMemo(() => {
    const seen = new Set<string>();
    const out: SelectOption[] = [];
    for (const r of rows) {
      const u = String(r.unit ?? "").trim();
      if (!u || u === "—" || seen.has(u)) continue;
      seen.add(u);
      out.push({ value: u, label: u });
    }
    return out.sort((a, b) => a.label.localeCompare(b.label));
  }, [rows]);

  const active = rows.filter((r) => r.status === "active").length;
  const low = rows.filter((r) => r.stock > 0 && r.stock < 100).length;

  return (
    <DataPage
      title="Product Catalog"
      description="Master catalog with templates, units, pricing and stock signals."
      icon={<Boxes className="h-5 w-5 text-primary" />}
      idKey="sku"
      entityName="Product"
      formFields={[
        { key: "sku", label: "SKU", type: "text", placeholder: "SKU-001" },
        { key: "name", label: "Product", type: "text", placeholder: "Product name" },
        {
          key: "category",
          label: "Category",
          type: "searchable",
          selectOptions: categories.length
            ? categories.map((c) => ({ value: c.label, label: c.label }))
            : undefined,
          placeholder: "Search categories…",
        },
        {
          key: "unit",
          label: "Unit",
          type: "searchable",
          selectOptions: unitOptions,
          placeholder: "kg, carton, liter…",
        },
        { key: "price", label: "Price", type: "number" },
        {
          key: "supplier",
          label: "Supplier",
          type: "searchable",
          selectOptions: suppliers.length
            ? suppliers.map((s) => ({ value: s.label, label: s.label }))
            : undefined,
          placeholder: "Search suppliers…",
        },
        { key: "stock", label: "Stock", type: "number" },
        {
          key: "status",
          label: "Status",
          type: "select",
          options: ["active", "inactive", "draft", "archived"],
        },
      ]}
      lookups={{
        category: categories.map((c) => ({ value: c.label, label: c.label })),
        supplier: suppliers.map((s) => ({ value: s.label, label: s.label })),
        unit: unitOptions,
      }}
      kpis={[
        { label: "SKUs", value: String(rows.length) },
        { label: "Active", value: String(active), tone: "success" },
        { label: "Low stock", value: String(low), tone: "warning" },
        { label: "Categories", value: String(categories.length || "—") },
      ]}
      rows={rows}
      searchKeys={["sku", "name", "category", "supplier"]}
      emptyHint={isLoading ? "Loading…" : isError ? "Failed to load catalog." : "No products found."}
      columns={[
        { key: "sku", label: "SKU", className: "font-mono text-xs" },
        { key: "name", label: "Product", render: (r) => <span className="font-medium">{r.name}</span> },
        { key: "category", label: "Category" },
        { key: "unit", label: "Unit" },
        { key: "price", label: "Price", render: (r) => AED(r.price) },
        { key: "supplier", label: "Supplier" },
        { key: "stock", label: "Stock" },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  );
}
