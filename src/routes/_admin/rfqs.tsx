import { createFileRoute } from "@tanstack/react-router";
import { DataPage, StatusBadge, AED } from "@/components/admin/DataPage";
import { rfqs } from "@/lib/mock-data";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/_admin/rfqs")({
  head: () => ({ meta: [{ title: "RFQs — Prime Plate" }] }),
  component: () => (
    <DataPage
      title="Requests for Quotation"
      description="Live RFQs across categories with quotation counts and budgets."
      icon={<FileText className="h-5 w-5 text-primary" />}
      kpis={[
        { label: "Active RFQs", value: "184", tone: "info" },
        { label: "Total quotations", value: "921" },
        { label: "Avg. responses", value: "8.4" },
        { label: "Open value", value: AED(206_400), tone: "success" },
      ]}
      rows={rfqs}
      searchKeys={["id", "restaurant", "category"]}
      columns={[
        { key: "id", label: "RFQ", className: "font-mono text-xs" },
        { key: "restaurant", label: "Restaurant", render: (r) => <span className="font-medium">{r.restaurant}</span> },
        { key: "category", label: "Category" },
        { key: "quantity", label: "Quantity" },
        { key: "budget", label: "Budget", render: (r) => AED(r.budget) },
        { key: "quotations", label: "Bids" },
        { key: "created", label: "Created" },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  ),
});
