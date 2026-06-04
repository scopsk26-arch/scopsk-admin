import { createFileRoute } from "@tanstack/react-router";
import { DataPage, StatusBadge, AED } from "@/components/admin/DataPage";
import { quotations } from "@/lib/mock-data";
import { Quote } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_admin/quotations")({
  head: () => ({ meta: [{ title: "Quotations — Prime Plate" }] }),
  component: () => (
    <DataPage
      title="Quotations"
      description="Quotation monitoring with AI scoring, approval workflow and flagging."
      icon={<Quote className="h-5 w-5 text-primary" />}
      kpis={[
        { label: "Active quotations", value: "921" },
        { label: "Approved (30d)", value: "612", tone: "success" },
        { label: "Flagged by AI", value: "14", tone: "warning" },
        { label: "Avg. AI score", value: "88.4", tone: "info" },
      ]}
      rows={quotations}
      searchKeys={["id", "rfq", "supplier", "restaurant"]}
      columns={[
        { key: "id", label: "Quotation", className: "font-mono text-xs" },
        { key: "rfq", label: "RFQ", className: "font-mono text-xs" },
        { key: "supplier", label: "Supplier", render: (r) => <span className="font-medium">{r.supplier}</span> },
        { key: "restaurant", label: "Restaurant" },
        { key: "amount", label: "Amount", render: (r) => AED(r.amount) },
        { key: "aiScore", label: "AI Score", render: (r) => (
          <span className={cn("font-mono font-semibold",
            r.aiScore >= 90 ? "text-success" : r.aiScore >= 75 ? "text-info" : "text-warning"
          )}>{r.aiScore}</span>
        ) },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  ),
});
