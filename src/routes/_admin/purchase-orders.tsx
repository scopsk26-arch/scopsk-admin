import { createFileRoute } from "@tanstack/react-router";
import { DataPage, StatusBadge, AED } from "@/components/admin/DataPage";
import { purchaseOrders } from "@/lib/mock-data";
import { ClipboardList } from "lucide-react";

export const Route = createFileRoute("/_admin/purchase-orders")({
  head: () => ({ meta: [{ title: "Purchase Orders — Prime Plate" }] }),
  component: () => (
    <DataPage
      title="Purchase Orders"
      description="POs with fulfilment status, supplier and buyer details."
      icon={<ClipboardList className="h-5 w-5 text-primary" />}
      kpis={[
        { label: "Open POs", value: "184" },
        { label: "In transit", value: "62", tone: "info" },
        { label: "Delivered (30d)", value: "412", tone: "success" },
        { label: "GMV (30d)", value: AED(4_820_000) },
      ]}
      rows={purchaseOrders}
      searchKeys={["id", "restaurant", "supplier"]}
      columns={[
        { key: "id", label: "PO", className: "font-mono text-xs" },
        { key: "restaurant", label: "Buyer", render: (r) => <span className="font-medium">{r.restaurant}</span> },
        { key: "supplier", label: "Supplier" },
        { key: "amount", label: "Amount", render: (r) => AED(r.amount) },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  ),
});
