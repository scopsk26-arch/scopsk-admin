import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/admin/StubPage";
import { ClipboardList } from "lucide-react";

export const Route = createFileRoute("/_admin/purchase-orders")({
  head: () => ({ meta: [{ title: "Purchase Orders — Prime Plate" }] }),
  component: () => (
    <StubPage
      title="Purchase Orders"
      description="Master PO table with delivery tracking, invoice linkage and audit."
      icon={<ClipboardList className="h-5 w-5 text-primary" />}
      features={["PO lifecycle states", "Export PDF", "Tabs: Items, Deliveries, Invoices, Timeline, Documents, Audit", ]}
    />
  ),
});
