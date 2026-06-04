import { createFileRoute } from "@tanstack/react-router";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { deliveries } from "@/lib/mock-data-extra";
import { PackageCheck } from "lucide-react";

export const Route = createFileRoute("/_admin/deliveries")({
  head: () => ({ meta: [{ title: "Deliveries — Prime Plate" }] }),
  component: () => (
    <DataPage
      title="Deliveries"
      description="Live delivery tracking with ETA, driver and status."
      icon={<PackageCheck className="h-5 w-5 text-primary" />}
      kpis={[
        { label: "Out for delivery", value: "62", tone: "info" },
        { label: "Delivered today", value: "138", tone: "success" },
        { label: "Delayed", value: "7", tone: "warning" },
        { label: "On-time rate", value: "94.8%", tone: "success" },
      ]}
      rows={deliveries}
      searchKeys={["id", "po", "restaurant", "supplier", "driver"]}
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
  ),
});
