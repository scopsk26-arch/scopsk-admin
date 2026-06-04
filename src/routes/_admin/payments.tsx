import { createFileRoute } from "@tanstack/react-router";
import { DataPage, StatusBadge, AED } from "@/components/admin/DataPage";
import { payments } from "@/lib/mock-data-extra";
import { CreditCard } from "lucide-react";

export const Route = createFileRoute("/_admin/payments")({
  head: () => ({ meta: [{ title: "Payments — Prime Plate" }] }),
  component: () => (
    <DataPage
      title="Payments"
      description="Payment runs, gateway settlements and reconciliation."
      icon={<CreditCard className="h-5 w-5 text-primary" />}
      kpis={[
        { label: "Processed (30d)", value: AED(3_980_000), tone: "success" },
        { label: "Pending", value: AED(218_400), tone: "warning" },
        { label: "Failed", value: "8", tone: "destructive" },
        { label: "Avg. settlement", value: "1.4d", tone: "info" },
      ]}
      rows={payments}
      searchKeys={["id", "invoice", "method"]}
      columns={[
        { key: "id", label: "Payment", className: "font-mono text-xs" },
        { key: "invoice", label: "Invoice", className: "font-mono text-xs" },
        { key: "method", label: "Method" },
        { key: "amount", label: "Amount", render: (r) => AED(r.amount) },
        { key: "date", label: "Date" },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  ),
});
