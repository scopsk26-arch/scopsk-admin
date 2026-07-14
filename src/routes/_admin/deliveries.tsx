import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { PackageCheck } from "lucide-react";
import { fetchList } from "@/lib/api/resources";
import { str } from "@/lib/api/client";
import { useAdminLookups } from "@/hooks/useAdminLookups";

export const Route = createFileRoute("/_admin/deliveries")({
  head: () => ({ meta: [{ title: "Deliveries — Prime Plate" }] }),
  component: DeliveriesPage,
});

function DeliveriesPage() {
  const { restaurants, suppliers, purchaseOrders } = useAdminLookups();

  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["deliveries"],
    queryFn: async () => {
      const list = await fetchList("/deliveries");
      return list.map((r: any) => ({
        id: str(r.number ?? r.id),
        po: str(r.purchaseOrder?.number ?? r.purchaseOrderId, "—"),
        restaurant: str(
          r.purchaseOrder?.buyerOrg?.name ?? r.buyerOrg?.name ?? r.organization?.name,
          "—",
        ),
        supplier: str(r.purchaseOrder?.supplierOrg?.name ?? r.supplierOrg?.name, "—"),
        driver: str(r.driverName ?? r.driver?.name ?? r.metadata?.driver, "—"),
        eta: r.etaAt ? String(r.etaAt).replace("T", " ").slice(0, 16) : "—",
        status: str(r.status, "processing"),
      }));
    },
  });

  const out = rows.filter((r) => ["dispatched", "out_for_delivery", "in_transit"].includes(r.status)).length;
  const delivered = rows.filter((r) => r.status === "delivered").length;
  const delayed = rows.filter((r) => r.status === "delayed").length;

  return (
    <DataPage
      title="Deliveries"
      description="Live delivery tracking with ETA, driver and status."
      icon={<PackageCheck className="h-5 w-5 text-primary" />}
      lookups={{
        restaurant: restaurants.map((r) => ({ value: r.label, label: r.label })),
        supplier: suppliers.map((s) => ({ value: s.label, label: s.label })),
        po: purchaseOrders.map((p) => ({ value: p.label, label: p.label })),
      }}
      kpis={[
        { label: "Out for delivery", value: String(out), tone: "info" },
        { label: "Delivered", value: String(delivered), tone: "success" },
        { label: "Delayed", value: String(delayed), tone: "warning" },
        { label: "Total", value: String(rows.length), tone: "success" },
      ]}
      rows={rows}
      searchKeys={["id", "po", "restaurant", "supplier", "driver"]}
      emptyHint={isLoading ? "Loading…" : isError ? "Failed to load deliveries." : "No deliveries found."}
      columns={[
        { key: "id", label: "Delivery", className: "font-mono text-xs" },
        { key: "po", label: "PO", className: "font-mono text-xs" },
        { key: "restaurant", label: "Buyer", render: (r) => <span className="font-medium">{r.restaurant}</span> },
        { key: "supplier", label: "Supplier" },
        { key: "driver", label: "Driver" },
        { key: "eta", label: "ETA" },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  );
}
