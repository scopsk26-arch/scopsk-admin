import { createFileRoute } from "@tanstack/react-router";
import { DataPage, StatusBadge, AED } from "@/components/admin/DataPage";
import { commissions } from "@/lib/mock-data-extra";
import { Percent } from "lucide-react";

export const Route = createFileRoute("/_admin/commissions")({
  head: () => ({ meta: [{ title: "Commissions — Prime Plate" }] }),
  component: () => (
    <DataPage
      title="Commissions"
      description="Marketplace commission accruals, tiers and payout schedule."
      icon={<Percent className="h-5 w-5 text-primary" />}
      kpis={[
        { label: "Accrued (MTD)", value: AED(184_600), tone: "info" },
        { label: "Paid (30d)", value: AED(412_000), tone: "success" },
        { label: "Avg. rate", value: "4.6%" },
        { label: "Awaiting payout", value: AED(62_400), tone: "warning" },
      ]}
      rows={commissions}
      searchKeys={["id", "po", "supplier"]}
      columns={[
        { key: "id", label: "Ref", className: "font-mono text-xs" },
        { key: "po", label: "PO", className: "font-mono text-xs" },
        { key: "supplier", label: "Supplier", render: (r) => <span className="font-medium">{r.supplier}</span> },
        { key: "gross", label: "Gross", render: (r) => AED(r.gross) },
        { key: "rate", label: "Rate" },
        { key: "commission", label: "Commission", render: (r) => AED(r.commission) },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  ),
});
