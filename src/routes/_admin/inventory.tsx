import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { pagedListProps, usePagedList } from "@/hooks/usePagedList";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { GenericJsonDetailView, ProductDetailView } from "@/components/admin/DetailViews";
import { Warehouse } from "lucide-react";
import { fetchProductDetail, walkPages } from "@/lib/api/resources";
import { num, str } from "@/lib/api/client";
import { useAdminLookups } from "@/hooks/useAdminLookups";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_admin/inventory")({
  head: () => ({ meta: [{ title: "Stock — ScopsK" }] }),
  component: InventoryPage,
});

type InventoryRow = {
  id: string;
  restaurant: string;
  organizationId: string;
  name: string;
  sku: string;
  itemCode: string;
  unit: string;
  quantity: number;
  product: string;
  productId: string;
  status: string;
};

function mapInventory(r: any, restaurantLabel: string, organizationId: string): InventoryRow {
  return {
    id: str(r.id),
    restaurant: restaurantLabel,
    organizationId,
    name: str(r.name ?? r.product?.name, "—"),
    sku: str(r.sku ?? r.product?.sku, "—"),
    itemCode: str(r.itemCode, "—"),
    unit: str(r.unit ?? r.product?.unit?.symbol ?? r.product?.unit?.name, "—"),
    quantity: num(r.quantity ?? r.stock),
    product: str(r.product?.name, "—"),
    productId: str(r.productId ?? r.product?.id, ""),
    status: str(r.status, "active"),
  };
}

function InventoryPage() {
  const { restaurants } = useAdminLookups(["restaurants"]);
  const [orgId, setOrgId] = useState<string>("");

  const selectedLabel = useMemo(
    () => restaurants.find((r) => r.value === orgId)?.label ?? "—",
    [restaurants, orgId],
  );

  const list = usePagedList({
    queryKey: ["restaurant-inventory", orgId, selectedLabel],
    path: "/restaurant-inventory",
    headers: orgId ? { "X-Organization-Id": orgId } : undefined,
    enabled: Boolean(orgId),
    map: (r) => mapInventory(r, selectedLabel, orgId),
  });
  const rows = list.rows;
  const isLoading = list.isLoading;
  const isError = list.isError;

  const summary = useQuery({
    queryKey: ["restaurant-inventory", "summary", orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const all = await walkPages("/restaurant-inventory", undefined, { "X-Organization-Id": orgId });
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

  return (
    <DataPage
      title="Stock"
      description="Stock levels for a restaurant."
      icon={<Warehouse className="h-5 w-5 text-primary" />}
      entityName="Inventory item"
      disableCrud
      filters={
        <Select
          value={orgId || undefined}
          onValueChange={setOrgId}
        >
          <SelectTrigger className="w-[240px] h-9">
            <SelectValue placeholder="Select restaurant…" />
          </SelectTrigger>
          <SelectContent>
            {restaurants.map((r) => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
      viewFields={[
        { key: "itemCode", label: "Item code" },
        { key: "name", label: "Item" },
        { key: "sku", label: "SKU" },
        { key: "product", label: "Product" },
        { key: "restaurant", label: "Restaurant" },
        { key: "unit", label: "Unit" },
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
        { label: "Restaurant", value: orgId ? selectedLabel.slice(0, 18) : "—" },
      ]}
      rows={rows}
      serverPagination={pagedListProps(list)}
      searchKeys={["name", "sku", "itemCode", "product", "restaurant"]}
      emptyHint={
        !orgId
          ? "Select a restaurant to load inventory."
          : isLoading
            ? "Loading…"
            : isError
              ? "Failed to load inventory (platform admin needs inventory permission + org context)."
              : "No inventory items for this restaurant."
      }
      columns={[
        { key: "itemCode", label: "Item code", className: "font-mono text-xs" },
        { key: "name", label: "Item", render: (r) => <span className="font-medium">{r.name}</span> },
        { key: "sku", label: "SKU", className: "font-mono text-xs" },
        { key: "product", label: "Product" },
        { key: "unit", label: "Unit" },
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
  );
}
