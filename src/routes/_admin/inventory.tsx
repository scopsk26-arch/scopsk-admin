import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { pagedListProps, usePagedList } from "@/hooks/usePagedList";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { GenericJsonDetailView, ProductDetailView } from "@/components/admin/DetailViews";
import { Plus, Trash2, Warehouse } from "lucide-react";
import { fetchProductDetail, walkPages } from "@/lib/api/resources";
import { api, num, str } from "@/lib/api/client";
import { useAdminLookups } from "@/hooks/useAdminLookups";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

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
type DraftLine = { itemCode: string; productName: string; unitPrice: string; stock: string };

const emptyLine = (): DraftLine => ({ itemCode: "", productName: "", unitPrice: "", stock: "" });

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
  const [sheetOpen, setSheetOpen] = useState(false);
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
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

  const loadCurrentStock = async () => {
    if (!orgId || kind !== "supplier") return;
    const all = await walkPages("/suppliers/inventory", undefined, { "X-Organization-Id": orgId });
    const next = all.rows.map((row) => {
      const mapped = mapInventory(row, selectedLabel, orgId);
      return {
        itemCode: mapped.itemCode || (mapped.sku !== "—" ? mapped.sku : ""),
        productName: mapped.name === "—" ? "" : mapped.name,
        unitPrice: mapped.price == null ? "" : String(mapped.price),
        stock: String(mapped.quantity),
      };
    });
    setLines(next.length ? next : [emptyLine()]);
    setBulkNote(null);
    setSkipped([]);
  };

  const updateLine = (index: number, patch: Partial<DraftLine>) => {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const applySheet = async () => {
    if (!orgId) {
      toast.error("Select a supplier first");
      return;
    }
    const rows = lines
      .map((line, index) => ({
        line: index + 2,
        itemCode: line.itemCode.trim(),
        productName: line.productName.trim(),
        unitPrice: line.unitPrice.trim(),
        stock: line.stock.trim(),
      }))
      .filter((line) => line.itemCode || line.productName || line.unitPrice || line.stock);
    if (!rows.length) {
      setBulkNote("Add a price and quantity first.");
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
      if (!outcome.skipped) setSheetOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not apply the sheet");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-4">
    <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update prices and stock</DialogTitle>
          <DialogDescription>
            {orgId
              ? `${selectedLabel}. Use the item code, or the SKU when the item code is blank, such as CAT-0018. Price and quantity update that supplier only.`
              : "Select a supplier on the Stock page, then enter the price and quantity."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={!orgId} onClick={() => loadCurrentStock().catch(() => toast.error("Could not load this supplier’s stock"))}>
            Load current stock
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
                const parsed = parseStockSheet(await file.text());
                setLines(parsed.length
                  ? parsed.map((row) => ({
                    itemCode: row.itemCode,
                    productName: row.productName,
                    unitPrice: row.unitPrice,
                    stock: row.stock,
                  }))
                  : [emptyLine()]);
                setBulkNote(null);
                setSkipped([]);
              }}
            />
            <span className="inline-flex h-8 cursor-pointer items-center rounded-md border border-border px-3 text-sm font-medium">Upload CSV</span>
          </label>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left">
                <th className="px-3 py-2 text-xs font-semibold text-muted-foreground">Item code</th>
                <th className="px-3 py-2 text-xs font-semibold text-muted-foreground">Product name</th>
                <th className="px-3 py-2 text-xs font-semibold text-muted-foreground w-28">Price</th>
                <th className="px-3 py-2 text-xs font-semibold text-muted-foreground w-28">Quantity</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={index} className="border-b border-border last:border-0">
                  <td className="p-2">
                    <input value={line.itemCode} onChange={(event) => updateLine(index, { itemCode: event.target.value })} placeholder="Optional" className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm" />
                  </td>
                  <td className="p-2">
                    <input value={line.productName} onChange={(event) => updateLine(index, { productName: event.target.value })} placeholder="Basmati Rice 5kg" className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm" />
                  </td>
                  <td className="p-2">
                    <input value={line.unitPrice} inputMode="decimal" onChange={(event) => updateLine(index, { unitPrice: event.target.value })} placeholder="32" className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm" />
                  </td>
                  <td className="p-2">
                    <input value={line.stock} inputMode="decimal" onChange={(event) => updateLine(index, { stock: event.target.value })} placeholder="10" className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm" />
                  </td>
                  <td className="p-2">
                    <button type="button" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted" onClick={() => setLines((current) => current.length === 1 ? [emptyLine()] : current.filter((_, i) => i !== index))} aria-label="Remove line">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setLines((current) => [...current, emptyLine()])}>
          <Plus className="h-4 w-4 mr-1.5" />Add line
        </Button>
        {bulkNote ? <p className="text-sm font-medium">{bulkNote}</p> : null}
        {skipped.length ? (
          <ul className="text-sm text-destructive space-y-1">
            {skipped.map((row) => (
              <li key={`${row.line}-${row.reason}`}>Line {row.line}: {row.reason}</li>
            ))}
          </ul>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
          <Button type="button" disabled={!orgId || applying} onClick={() => applySheet()}>
            {applying ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <DataPage
      title="Stock"
      description={kind === "supplier" ? "A supplier’s selling price and quantity." : "Stock levels for a restaurant."}
      icon={<Warehouse className="h-5 w-5 text-primary" />}
      entityName="Inventory item"
      disableCrud
      headerActions={kind === "supplier" ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setBulkNote(null);
            setSkipped([]);
            setSheetOpen(true);
          }}
        >
          Update prices
        </Button>
      ) : null}
      filters={
        <div className="flex flex-wrap gap-2">
          <Select
            value={kind}
            onValueChange={(value) => {
              setKind(value as "restaurant" | "supplier");
              setOrgId("");
              setLines([emptyLine()]);
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
