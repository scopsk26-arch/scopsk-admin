import { createFileRoute } from "@tanstack/react-router";
import { DataPage, StatusBadge, AED } from "@/components/admin/DataPage";
import { invoices } from "@/lib/mock-data-extra";
import { Receipt } from "lucide-react";

export const Route = createFileRoute("/_admin/invoices")({
  head: () => ({ meta: [{ title: "Invoices — Prime Plate" }] }),
  component: () => (
    <DataPage
      title="Invoices"
      description="Invoice approval workflow, VAT tracking and payment status."
      icon={<Receipt className="h-5 w-5 text-primary" />}
      kpis={[
        { label: "Outstanding", value: AED(218_400), tone: "warning" },
        { label: "Paid (30d)", value: AED(3_820_000), tone: "success" },
        { label: "Overdue", value: "12", tone: "destructive" },
        { label: "VAT collected", value: AED(191_000), tone: "info" },
      ]}
      rows={invoices}
      searchKeys={["id", "po", "party"]}
      columns={[
        { key: "id", label: "Invoice", className: "font-mono text-xs" },
        { key: "po", label: "PO", className: "font-mono text-xs" },
        { key: "party", label: "Supplier", render: (r) => <span className="font-medium">{r.party}</span> },
        { key: "amount", label: "Amount", render: (r) => AED(r.amount) },
        { key: "vat", label: "VAT (5%)", render: (r) => AED(r.vat) },
        { key: "due", label: "Due" },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  ),
});
