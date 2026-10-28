import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Package } from "lucide-react";
import { AED, DataPage, StatusBadge } from "@/components/admin/DataPage";
import {
  fetchCloudKitchenOrders,
  updateCloudKitchenOrderStatus,
} from "@/lib/api/resources";
import { asArray, str } from "@/lib/api/client";

export const Route = createFileRoute("/_admin/ck-orders")({
  head: () => ({ meta: [{ title: "CK Orders — ScopsK" }] }),
  component: CloudKitchenOrdersPage,
});

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "delivered",
  "cancelled",
] as const;

function mapOrder(row: any) {
  const items = Array.isArray(row.items) ? row.items : [];
  return {
    id: str(row.id),
    number: str(row.number ?? row.id),
    kitchen: str(row.cloudKitchen?.name, "—"),
    restaurant: str(row.restaurantOrg?.name, "—"),
    items: items.map((item: any) => `${item.quantity} × ${item.name}`).join(", ") || "—",
    total: Number.isFinite(Number(row.total)) ? Number(row.total) : null,
    deliveryAddress: str(row.deliveryAddress ?? row.delivery_address, ""),
    deliverySlot: str(row.deliverySlot ?? row.delivery_slot, ""),
    status: str(row.status, "pending"),
    placedAt: row.placedAt ?? row.createdAt ?? null,
  };
}

function CloudKitchenOrdersPage() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["ck-orders"],
    staleTime: 15_000,
    queryFn: async () => asArray(await fetchCloudKitchenOrders({ limit: 100 })).map(mapOrder),
  });
  const rows = query.data ?? [];

  return (
    <DataPage
      title="Kitchen orders"
      description="Direct restaurant orders from cloud kitchens."
      icon={<Package className="h-5 w-5 text-primary" />}
      rows={rows}
      searchKeys={["number", "kitchen", "restaurant", "items", "deliveryAddress"]}
      emptyHint={
        query.isLoading
          ? "Loading…"
          : query.isError
            ? "Failed to load Cloud Kitchen orders."
            : "No Cloud Kitchen orders yet."
      }
      kpis={[
        {
          label: "In progress",
          value: String(
            rows.filter((row) =>
              ["pending", "confirmed", "preparing", "ready"].includes(row.status),
            ).length,
          ),
          tone: "info",
        },
        {
          label: "Delivered",
          value: String(rows.filter((row) => row.status === "delivered").length),
          tone: "success",
        },
        { label: "Total", value: String(rows.length) },
      ]}
      formFields={[
        { key: "number", label: "Order #", type: "readonly" },
        { key: "kitchen", label: "Kitchen", type: "readonly" },
        { key: "restaurant", label: "Restaurant", type: "readonly" },
        { key: "deliveryAddress", label: "Delivery address", type: "readonly" },
        { key: "deliverySlot", label: "Delivery time / ETA" },
        {
          key: "status",
          label: "Status",
          required: true,
          type: "select",
          options: [...ORDER_STATUSES],
        },
      ]}
      viewFields={[
        { key: "number", label: "Order #" },
        { key: "kitchen", label: "Kitchen" },
        { key: "restaurant", label: "Restaurant" },
        { key: "items", label: "Items" },
        { key: "deliveryAddress", label: "Delivery address" },
        { key: "deliverySlot", label: "Delivery time / ETA" },
        { key: "status", label: "Status" },
      ]}
      columns={[
        { key: "number", label: "Order", className: "font-mono text-xs" },
        { key: "kitchen", label: "Kitchen" },
        { key: "restaurant", label: "Restaurant" },
        { key: "items", label: "Items", truncate: true },
        {
          key: "total",
          label: "Total",
          render: (row) => (row.total == null ? "—" : AED(row.total)),
        },
        { key: "deliverySlot", label: "ETA" },
        {
          key: "status",
          label: "Status",
          render: (row) => <StatusBadge status={row.status} />,
        },
      ]}
      onUpdate={async (id, data) => {
        const updated = await updateCloudKitchenOrderStatus(
          id,
          String(data.status),
          data.deliverySlot ? String(data.deliverySlot) : null,
        );
        await queryClient.invalidateQueries({ queryKey: ["ck-orders"] });
        return mapOrder(updated);
      }}
    />
  );
}
