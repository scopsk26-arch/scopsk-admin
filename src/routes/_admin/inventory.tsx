import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { pagedListProps, usePagedList } from "@/hooks/usePagedList";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { GenericJsonDetailView, ProductDetailView } from "@/components/admin/DetailViews";
import { Warehouse } from "lucide-react";
import { fetchProductDetail, walkPages } from "@/lib/api/resources";
import { api, num, str } from "@/lib/api/client";
import { useAdminLookups } from "@/hooks/useAdminLookups";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_admin/inventory")({
  head: () => ({ meta: [{ title: "Stock — ScopsK" }] }),
  component: InventoryPage,
});

type InventoryRow = {
  id: string;
  owner: string;
  organizationId: string;
  name: string;
  sku: string;
  itemCode: string;
  unit: string;
  quantity: number;
  price: number | null;
  product: string;
  productId: string;
  status: string;
};

type BulkResult = { line: number; status: "saved" | "skipped"; reason?: string };

function parseStockSheet(text: string) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return [];
  const split = (line: string) => line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""));
  const header = split(lines[0]).map((cell) => cell.toLowerCase());
  const at = (...names: string[]) => header.findIndex((cell) => names.includes(cell));
  const codeAt = at("item code", "itemcode", "sku", "code");
  const nameAt = at("product name", "product", "name");
  const priceAt = at("price", "unit price", "unitprice");
  const qtyAt = at("quantity", "stock", "qty");
  const hasHeader = codeAt >= 0 || priceAt >= 0 || qtyAt >= 0;
  return (hasHeader ? lines.slice(1) : lines).map((line, index) => {
    const columns = split(line);
    return {
      line: index + 2,
      itemCode: codeAt >= 0 ? columns[codeAt] || "" : columns[0] || "",
      productName: nameAt >= 0 ? columns[nameAt] || "" : "",
      unitPrice: priceAt >= 0 ? columns[priceAt] || "" : columns[2] || "",
      stock: qtyAt >= 0 ? columns[qtyAt] || "" : columns[3] || "",
    };
  });
}

function mapInventory(r: any, ownerLabel: string, organizationId: string): InventoryRow {
  const price = r.unitPrice == null || r.unitPrice === "" ? null : num(r.unitPrice);
  return {
    id: str(r.id),
    owner: ownerLabel,
    organizationId,
    name: str(r.name ?? r.product?.name, "—"),
    sku: str(r.sku ?? r.product?.sku, "—"),
    itemCode: str(r.itemCode, ""),
    unit: str(r.unit ?? r.product?.unit?.symbol ?? r.product?.unit?.name, "—"),
    quantity: num(r.quantity ?? r.stock),
    price,
    product: str(r.product?.name, "—"),
    productId: str(r.productId ?? r.product?.id, ""),
    status: str(r.status, "active"),
  };
}

function InventoryPage() {
  const qc = useQueryClient();
  const { restaurants, suppliers } = useAdminLookups(["restaurants", "suppliers"]);
  const [kind, setKind] = useState<"restaurant" | "supplier">("supplier");
  const [orgId, setOrgId] = useState<string>("");
  const [sheet, setSheet] = useState("");
  const [applying, setApplying] = useState(false);
  const [bulkNote, setBulkNote] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<BulkResult[]>([]);
  const orgs = kind === "supplier" ? suppliers : restaurants;

  const selectedLabel = useMemo(
    () => orgs.find((r) => r.value === orgId)?.label ?? "—",
    [orgs, orgId],
  );

  const list = usePagedList({
    queryKey: [kind === "supplier" ? "supplier-inventory" : "restaurant-inventory", orgId, selectedLabel],
    path: kind === "supplier" ? "/suppliers/inventory" : "/restaurant-inventory",
    headers: orgId ? { "X-Organization-Id": orgId } : undefined,
    enabled: Boolean(orgId),
    map: (r) => mapInventory(r, selectedLabel, orgId),
  });
  const rows = list.rows;
  const isLoading = list.isLoading;
  const isError = list.isError;

  const summary = useQuery({
    queryKey: [kind === "supplier" ? "supplier-inventory" : "restaurant-inventory", "summary", orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const all = await walkPages(
        kind === "supplier" ? "/suppliers/inventory" : "/restaurant-inventory",
        undefined,
        { "X-Organization-Id": orgId },
      );
      let lowStock = 0;
      let totalQty = 0;
      for (const row of all.rows) {
        const quantity = num(row.quantity ?? row.stock);
        totalQty += quantity;
        if (quantity <= 0) lowStock += 1;
      }
      return { lowStock, totalQty, items: all.total };
    },
    staleTime: 15_000,
  });

  const downloadSheet = async () => {
    if (!orgId || kind !== "supplier") return;
    const all = await walkPages("/suppliers/inventory", undefined, { "X-Organization-Id": orgId });
    const lines = ["item code,product name,price,quantity"];
    for (const row of all.rows) {
      const mapped = mapInventory(row, selectedLabel, orgId);
      const code = mapped.itemCode || (mapped.sku !== "—" ? mapped.sku : "");
      lines.push([code, mapped.name, mapped.price ?? "", mapped.quantity].join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedLabel.replace(/\s+/g, "-").toLowerCase()}-prices.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const applySheet = async () => {
    if (!orgId) {
      toast.error("Select a supplier first");
      return;
    }
    const rows = parseStockSheet(sheet);
    if (!rows.length) {
      setBulkNote("The file is empty.");
      setSkipped([]);
      return;
    }
    setApplying(true);
    try {
      const outcome = await api.post<{ saved: number; skipped: number; results: BulkResult[] }>(
        "/suppliers/inventory/bulk",
        { rows },
        { headers: { "X-Organization-Id": orgId } },
      );
      setBulkNote(`${outcome.saved} saved. ${outcome.skipped} skipped.`);
      setSkipped((outcome.results || []).filter((row) => row.status === "skipped"));
      await qc.invalidateQueries({ queryKey: ["supplier-inventory", orgId] });
      toast.success(`${outcome.saved} saved. ${outcome.skipped} skipped.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not apply the sheet");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-4">
    {kind === "supplier" ? (
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div>
          <h2 className="font-semibold">Update supplier prices and stock</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Download this supplier’s sheet, edit the price and quantity, then paste it here or choose the file. An item code updates that supplier only. A blank item code with a catalog product name adds that product to their stock. This does not create a new catalog product.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={!orgId} onClick={() => downloadSheet().catch(() => toast.error("Could not download the sheet"))}>
            Download sheet
          </Button>
          <label className="inline-flex items-center">
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                setSheet(await file.text());
              }}
            />
            <span className="inline-flex h-9 cursor-pointer items-center rounded-md border border-border px-3 text-sm font-medium">Choose CSV</span>
          </label>
        </div>
        <textarea
          value={sheet}
          onChange={(event) => setSheet(event.target.value)}
          placeholder={"item code,product name,price,quantity\n,Basmati Rice 5kg,32,10"}
          className="min-h-32 w-full rounded-md border border-border bg-background p-3 text-sm"
        />
        {bulkNote ? <p className="text-sm font-medium">{bulkNote}</p> : null}
        {skipped.length ? (
          <ul className="text-sm text-destructive space-y-1">
            {skipped.map((row) => (
              <li key={`${row.line}-${row.reason}`}>Line {row.line}: {row.reason}</li>
            ))}
          </ul>
        ) : null}
        <Button type="button" disabled={!orgId || applying} onClick={() => applySheet()}>
          {applying ? "Saving…" : "Apply sheet"}
        </Button>
      </div>
    ) : null}
    <DataPage
      title="Stock"
      description={kind === "supplier" ? "A supplier’s selling price and quantity." : "Stock levels for a restaurant."}
      icon={<Warehouse className="h-5 w-5 text-primary" />}
      entityName="Inventory item"
      disableCrud
      filters={
        <div className="flex flex-wrap gap-2">
          <Select
            value={kind}
            onValueChange={(value) => {
              setKind(value as "restaurant" | "supplier");
              setOrgId("");
              setSheet("");
              setBulkNote(null);
              setSkipped([]);
            }}
          >
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="supplier">Supplier</SelectItem>
              <SelectItem value="restaurant">Restaurant</SelectItem>
            </SelectContent>
          </Select>
          <Select value={orgId || undefined} onValueChange={setOrgId}>
            <SelectTrigger className="w-[240px] h-9">
              <SelectValue placeholder={kind === "supplier" ? "Select supplier…" : "Select restaurant…"} />
            </SelectTrigger>
            <SelectContent>
              {orgs.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
      viewFields={[
        { key: "itemCode", label: "Item code" },
        { key: "name", label: "Item" },
        { key: "sku", label: "SKU" },
        { key: "product", label: "Product" },
        { key: "owner", label: kind === "supplier" ? "Supplier" : "Restaurant" },
        { key: "unit", label: "Unit" },
        ...(kind === "supplier" ? [{ key: "price", label: "Price" }] : []),
        { key: "quantity", label: "Quantity" },
        { key: "status", label: "Status" },
      ]}
      loadDetail={async (row) => {
        if (row.productId) {
          try {
            return await fetchProductDetail(row.productId);
          } catch {
            /* fall through */
          }
        }
        return row;
      }}
      renderView={(detail) =>
        detail?.category || detail?.variants || detail?.images || detail?.inventoryItems ? (
          <ProductDetailView detail={detail} />
        ) : (
          <GenericJsonDetailView detail={detail} />
        )
      }
      kpis={[
        { label: "Items", value: String(summary.data?.items ?? list.total) },
        { label: "Out of stock", value: summary.isLoading ? "…" : String(summary.data?.lowStock ?? 0), tone: (summary.data?.lowStock ?? 0) ? "warning" : "success" },
        { label: "Total qty", value: summary.isLoading ? "…" : String(summary.data?.totalQty ?? 0), tone: "info" },
        { label: kind === "supplier" ? "Supplier" : "Restaurant", value: orgId ? selectedLabel.slice(0, 18) : "—" },
      ]}
      rows={rows}
      serverPagination={pagedListProps(list)}
      searchKeys={["name", "sku", "itemCode", "product", "owner"]}
      emptyHint={
        !orgId
          ? kind === "supplier"
            ? "Select a supplier to load prices and stock."
            : "Select a restaurant to load inventory."
          : isLoading
            ? "Loading…"
            : isError
              ? "Failed to load inventory (platform admin needs inventory permission + org context)."
              : kind === "supplier"
                ? "No stock rows for this supplier."
                : "No inventory items for this restaurant."
      }
      columns={[
        { key: "itemCode", label: "Item code", className: "font-mono text-xs" },
        { key: "name", label: "Item", render: (r) => <span className="font-medium">{r.name}</span> },
        { key: "sku", label: "SKU", className: "font-mono text-xs" },
        { key: "product", label: "Product" },
        { key: "unit", label: "Unit" },
        ...(kind === "supplier"
          ? [{ key: "price" as const, label: "Price", render: (r: InventoryRow) => (r.price != null ? String(r.price) : "—") }]
          : []),
        { key: "quantity", label: "Qty" },
        {
          key: "status",
          label: "Status",
          render: (r) => (
            <StatusBadge
              status={r.quantity <= 0 ? "low stock" : r.status}
              tone={r.quantity <= 0 ? "warning" : undefined}
            />
          ),
        },
      ]}
    />
    </div>
  );
}
