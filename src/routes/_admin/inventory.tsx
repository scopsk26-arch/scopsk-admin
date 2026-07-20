import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { Warehouse } from "lucide-react";
import { fetchRestaurantInventory } from "@/lib/api/resources";
import { num, str } from "@/lib/api/client";
import { useAdminLookups } from "@/hooks/useAdminLookups";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_admin/inventory")({
  head: () => ({ meta: [{ title: "Restaurant Inventory — Prime Plate" }] }),
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
  reorderPoint: number;
  product: string;
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
    unit: str(r.unit, "—"),
    quantity: num(r.quantity ?? r.stock),
    reorderPoint: num(r.reorderPoint),
    product: str(r.product?.name, "—"),
    status: str(r.status, "active"),
  };
}

function InventoryPage() {
  const { restaurants } = useAdminLookups();
  const [orgId, setOrgId] = useState<string>("");

  const selectedLabel = useMemo(
    () => restaurants.find((r) => r.value === orgId)?.label ?? "—",
    [restaurants, orgId],
  );

  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["restaurant-inventory", orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const list = await fetchRestaurantInventory(orgId);
      return list.map((r) => mapInventory(r, selectedLabel, orgId));
    },
  });

  const lowStock = rows.filter((r) => r.reorderPoint > 0 && r.quantity <= r.reorderPoint).length;
  const totalQty = rows.reduce((s, r) => s + r.quantity, 0);

  return (
    <DataPage
      title="Restaurant Inventory"
      description="Monitor stock levels for a selected restaurant organization."
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
      kpis={[
        { label: "Items", value: String(rows.length) },
        { label: "Low stock", value: String(lowStock), tone: lowStock ? "warning" : "success" },
        { label: "Total qty", value: String(totalQty), tone: "info" },
        { label: "Restaurant", value: orgId ? selectedLabel.slice(0, 18) : "—" },
      ]}
      rows={rows}
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
        { key: "reorderPoint", label: "Reorder" },
        {
          key: "status",
          label: "Status",
          render: (r) => (
            <StatusBadge
              status={r.reorderPoint > 0 && r.quantity <= r.reorderPoint ? "low stock" : r.status}
              tone={r.reorderPoint > 0 && r.quantity <= r.reorderPoint ? "warning" : undefined}
            />
          ),
        },
      ]}
    />
  );
}
