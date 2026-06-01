import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/admin/StubPage";
import { BarChart3 } from "lucide-react";

export const Route = createFileRoute("/_admin/reports")({
  head: () => ({ meta: [{ title: "Reports & BI — Prime Plate" }] }),
  component: () => (
    <StubPage
      title="Reports & BI"
      description="Advanced business intelligence across RFQs, quotations, procurement, revenue, suppliers and restaurants."
      icon={<BarChart3 className="h-5 w-5 text-primary" />}
      features={["RFQ / Quotation / Revenue analytics", "Export PDF / Excel / CSV", "Scheduled reports", ]}
    />
  ),
});
