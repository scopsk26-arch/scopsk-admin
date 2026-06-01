import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/admin/StubPage";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/_admin/rfqs")({
  head: () => ({ meta: [{ title: "RFQs — Prime Plate" }] }),
  component: () => (
    <StubPage
      title="RFQs"
      description="Master RFQ database with advanced filters, quotation tracking and AI analysis."
      icon={<FileText className="h-5 w-5 text-primary" />}
      features={["Category / region / budget filters", "Quotation count per RFQ", "Detail tabs: Overview, Quotations, Timeline, Messages, AI Analysis, Audit", ]}
    />
  ),
});
