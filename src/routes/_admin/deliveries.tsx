import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { DeliveryDetailView } from "@/components/admin/DetailViews";
import { PackageCheck } from "lucide-react";
import { fetchDeliveryDetail, fetchList, updateDeliveryStatus } from "@/lib/api/resources";
import { str } from "@/lib/api/client";
import { useAdminLookups } from "@/hooks/useAdminLookups";

export const Route = createFileRoute("/_admin/deliveries")({
  head: () => ({ meta: [{ title: "Deliveries — ResPy" }] }),
  component: DeliveriesPage,
});

const DELIVERY_STATUSES = ["scheduled", "picked_up", "in_transit", "delivered", "failed", "cancelled"] as const;

function driverName(r: any) {
  const person = r.driver ?? r.driverUser ?? r.driver_user;
  const fromUser = [person?.firstName ?? person?.first_name, person?.lastName ?? person?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  const name = str(
    r.driverName
      ?? r.driver_name
      ?? (fromUser || null)
      ?? person?.email
      ?? r.metadata?.driver
      ?? r.metadata?.driverName,
    "",
  );
  return name || "Unassigned";
}

function etaValue(r: any) {
  const raw =
    r.etaAt
    ?? r.scheduledAt
    ?? r.scheduled_at
    ?? r.expectedAt
    ?? r.pickedUpAt
    ?? r.picked_up_at
    ?? r.deliveredAt
    ?? r.delivered_at;
  return raw ? String(raw).replace("T", " ").slice(0, 16) : "—";
}

function hopText(r: any) {
  const hop = String(r?.leg ?? r?.hop ?? "").toLowerCase().replace(/\s+/g, "_");
  const notes = String(r?.notes || "").toLowerCase();
  if (
    hop === "to_warehouse"
    || hop === "inbound"
    || hop.includes("warehouse")
    || notes.includes("hop 1")
  ) {
    return "To warehouse";
  }
  if (
    hop === "to_restaurant"
    || hop === "outbound"
    || hop.includes("restaurant")
    || notes.includes("hop 2")
  ) {
    return "To restaurant";
  }
  if (r?.status || r?.number) return "To restaurant";
  return "—";
}

function mapDelivery(r: any) {
  return {
    id: str(r.id),
    number: str(r.number ?? r.id),
    po: str(r.purchaseOrder?.number ?? r.purchaseOrderId, "—"),
    restaurant: str(
      r.purchaseOrder?.buyerOrg?.name ?? r.buyerOrg?.name ?? r.organization?.name,
      "—",
    ),
    supplier: str(r.purchaseOrder?.supplierOrg?.name ?? r.supplierOrg?.name, "—"),
    driver: driverName(r),
    eta: etaValue(r),
    // Display-only — do not use key `hop` (conflicts with hopLabel enum when list+API merge)
    hopDisplay: hopText(r),
    scheduled: (r.scheduledAt ?? r.scheduled_at)
      ? String(r.scheduledAt ?? r.scheduled_at).replace("T", " ").slice(0, 16)
      : "—",
    createdAt: r.createdAt ? String(r.createdAt) : "",
    leg: str(r.leg ?? "", ""),
    status: str(r.status, "processing"),
    organizationId: str(
      r.organizationId
        ?? r.purchaseOrder?.supplierOrgId
        ?? r.purchaseOrder?.buyerOrgId
        ?? r.purchaseOrder?.buyerOrg?.id
        ?? r.purchaseOrder?.supplierOrg?.id,
      "",
    ),
  };
}

function DeliveriesPage() {
  const { restaurants, suppliers, purchaseOrders } = useAdminLookups([
    "restaurants",
    "suppliers",
    "purchaseOrders",
  ]);
  const queryClient = useQueryClient();

  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["deliveries"],
    staleTime: 60_000,
    queryFn: async () => {
      const list = await fetchList("/deliveries", { limit: 100, sortBy: "createdAt", sortOrder: "DESC" });
      return list
        .map(mapDelivery)
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    },
  });

  const out = rows.filter((r) => ["dispatched", "out_for_delivery", "in_transit", "picked_up"].includes(r.status)).length;
  const delivered = rows.filter((r) => r.status === "delivered").length;
  const delayed = rows.filter((r) => r.status === "delayed" || r.status === "failed").length;

  return (
    <DataPage
      title="Deliveries"
      description="Live delivery tracking. Status changes persist to the API."
      icon={<PackageCheck className="h-5 w-5 text-primary" />}
      entityName="Delivery"
      lookups={{
        restaurant: restaurants.map((r) => ({ value: r.label, label: r.label })),
        supplier: suppliers.map((s) => ({ value: s.label, label: s.label })),
        po: purchaseOrders.map((p) => ({ value: p.label, label: p.label })),
      }}
      formFields={[
        { key: "number", label: "Delivery #", type: "text" },
        { key: "po", label: "PO", type: "text" },
        { key: "driver", label: "Driver", type: "text" },
        { key: "status", label: "Status", type: "select", options: [...DELIVERY_STATUSES] },
      ]}
      viewFields={[
        { key: "number", label: "Delivery #" },
        { key: "po", label: "PO" },
        { key: "restaurant", label: "Buyer" },
        { key: "supplier", label: "Supplier" },
        { key: "hopDisplay", label: "Hop" },
        { key: "driver", label: "Driver" },
        { key: "scheduled", label: "Scheduled" },
        { key: "eta", label: "ETA" },
        { key: "status", label: "Status" },
      ]}
      loadDetail={async (row) => fetchDeliveryDetail(row.id)}
      renderView={(detail) => <DeliveryDetailView detail={detail} />}
      kpis={[
        { label: "Out for delivery", value: String(out), tone: "info" },
        { label: "Delivered", value: String(delivered), tone: "success" },
        { label: "Issues", value: String(delayed), tone: "warning" },
        { label: "Total", value: String(rows.length), tone: "success" },
      ]}
      rows={rows}
      searchKeys={["number", "po", "restaurant", "supplier", "driver"]}
      emptyHint={isLoading ? "Loading…" : isError ? "Failed to load deliveries." : "No deliveries found."}
      columns={[
        { key: "number", label: "Delivery", className: "font-mono text-xs whitespace-nowrap w-[1%]" },
        { key: "po", label: "PO", className: "font-mono text-xs whitespace-nowrap w-[1%]" },
        { key: "restaurant", label: "Buyer", render: (r) => <span className="font-medium">{r.restaurant}</span> },
        { key: "supplier", label: "Supplier" },
        { key: "hopDisplay", label: "Hop", className: "whitespace-nowrap w-[1%]" },
        { key: "driver", label: "Driver", className: "whitespace-nowrap w-[1%]" },
        { key: "eta", label: "ETA", className: "whitespace-nowrap w-[1%]" },
        { key: "status", label: "Status", className: "whitespace-nowrap w-[1%]", render: (r) => <StatusBadge status={r.status} /> },
      ]}
      onUpdate={async (id, data, row) => {
        if (!data.status) throw new Error("Status is required");
        const updated = await updateDeliveryStatus(id, String(data.status), row.organizationId || undefined);
        await queryClient.invalidateQueries({ queryKey: ["deliveries"] });
        return mapDelivery({
          ...(updated && typeof updated === "object" ? updated : {}),
          id,
          number: row.number,
          status: data.status,
          purchaseOrder: { number: row.po },
        });
      }}
    />
  );
}
