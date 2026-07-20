import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DataPage, StatusBadge, AED } from "@/components/admin/DataPage";
import { CreditCard } from "lucide-react";
import { fetchList } from "@/lib/api/resources";
import { num, str } from "@/lib/api/client";

export const Route = createFileRoute("/_admin/payments")({
  head: () => ({ meta: [{ title: "Payments — Prime Plate" }] }),
  component: PaymentsPage,
});

function PaymentsPage() {
  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const list = await fetchList("/payments");
      return list.map((r: any) => ({
        id: str(r.providerRef ?? r.id),
        invoice: str(r.invoice?.number ?? r.invoiceId, "—"),
        method: str(r.method, "—"),
        amount: num(r.amount),
        date: r.paidAt
          ? String(r.paidAt).slice(0, 10)
          : r.createdAt
            ? String(r.createdAt).slice(0, 10)
            : "—",
        status: str(r.status, "pending"),
      }));
    },
  });

  const processed = rows
    .filter((r) => ["completed", "paid", "succeeded", "active"].includes(r.status))
    .reduce((s, r) => s + r.amount, 0);
  const pending = rows.filter((r) => r.status === "pending").reduce((s, r) => s + r.amount, 0);
  const failed = rows.filter((r) => r.status === "failed").length;

  return (
    <DataPage
      title="Payments"
      description="Payment ledger (read-only). Mark invoices paid from the Invoices page until a payment gateway is configured."
      disableCrud
      icon={<CreditCard className="h-5 w-5 text-primary" />}
      kpis={[
        { label: "Processed", value: AED(processed), tone: "success" },
        { label: "Pending", value: AED(pending), tone: "warning" },
        { label: "Failed", value: String(failed), tone: "destructive" },
        { label: "Rows", value: String(rows.length), tone: "info" },
      ]}
      rows={rows}
      searchKeys={["id", "invoice", "method"]}
      emptyHint={isLoading ? "Loading…" : isError ? "Failed to load payments." : "No payments yet."}
      columns={[
        { key: "id", label: "Payment", className: "font-mono text-xs", render: (r) => String(r.id).slice(0, 12) },
        { key: "invoice", label: "Invoice", className: "font-mono text-xs" },
        { key: "method", label: "Method" },
        { key: "amount", label: "Amount", render: (r) => AED(r.amount) },
        { key: "date", label: "Date" },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  );
}
