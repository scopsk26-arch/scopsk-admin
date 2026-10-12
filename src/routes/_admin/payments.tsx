import { createFileRoute } from "@tanstack/react-router";
import { pagedListProps, usePagedList } from "@/hooks/usePagedList";
import { DataPage, StatusBadge, AED } from "@/components/admin/DataPage";
import { PaymentDetailView } from "@/components/admin/DetailViews";
import { CreditCard } from "lucide-react";
import { fetchInvoiceDetail } from "@/lib/api/resources";
import { num, str } from "@/lib/api/client";

export const Route = createFileRoute("/_admin/payments")({
  head: () => ({ meta: [{ title: "Payments — ScopsK" }] }),
  component: PaymentsPage,
});

function mapPayment(r: any) {
  const inv = r.invoice || {};
  const meta = (r.metadata || {}) as Record<string, unknown>;
  const subtotal = num(inv.subtotal ?? r.subtotal);
  const tax = num(inv.tax ?? r.tax ?? r.vat);
  const total = num(inv.total ?? r.amount);
  const vatRate = subtotal > 0 && tax > 0 ? Math.round((tax / subtotal) * 1000) / 10 : num(r.vatRate);
  return {
    id: str(r.id ?? r.providerRef),
    providerRef: str(r.providerRef, "—"),
    invoice: str(inv.number ?? r.invoiceId, "—"),
    invoiceId: str(r.invoiceId ?? inv.id, ""),
    method: str(r.method ?? r.paymentMethod, "—"),
    provider: str(meta.provider ?? meta.gateway ?? r.provider ?? r.gateway, "—"),
    currency: str(r.currency ?? inv.currency, "AED"),
    amount: num(r.amount, total),
    fee: num(meta.fee ?? meta.processingFee ?? r.fee ?? r.processingFee),
    subtotal,
    vat: tax,
    vatRate,
    total,
    organization: str(r.organization?.name ?? r.organizationId, "—"),
    date: r.paidAt
      ? String(r.paidAt).slice(0, 10)
      : r.createdAt
        ? String(r.createdAt).slice(0, 10)
        : "—",
    paidAt: r.paidAt ? String(r.paidAt).replace("T", " ").slice(0, 19) : "—",
    status: str(r.status, "pending"),
  };
}

function PaymentsPage() {
  const list = usePagedList({
    queryKey: ["payments"],
    path: "/payments",
    map: mapPayment,
  });
  const rows = list.rows;
  const isLoading = list.isLoading;
  const isError = list.isError;

  const processed = rows
    .filter((r) => ["succeeded", "completed", "paid", "active"].includes(r.status))
    .reduce((s, r) => s + r.amount, 0);
  const pending = rows.filter((r) => r.status === "pending").reduce((s, r) => s + r.amount, 0);
  const failed = rows.filter((r) => r.status === "failed").length;

  return (
    <DataPage
      title="Payments"
      description="Payment ledger (read-only). Mark invoices paid from the Invoices page until a payment gateway is configured."
      disableCrud
      icon={<CreditCard className="h-5 w-5 text-primary" />}
      viewFields={[
        { key: "id", label: "Payment ID" },
        { key: "providerRef", label: "Provider ref" },
        { key: "invoice", label: "Invoice" },
        { key: "method", label: "Method" },
        { key: "provider", label: "Provider" },
        { key: "currency", label: "Currency" },
        { key: "subtotal", label: "Actual value" },
        { key: "vatRate", label: "VAT %" },
        { key: "vat", label: "VAT amount" },
        { key: "amount", label: "Paid amount" },
        { key: "fee", label: "Fee" },
        { key: "organization", label: "Organization" },
        { key: "date", label: "Date" },
        { key: "paidAt", label: "Paid at" },
        { key: "status", label: "Status" },
      ]}
      loadDetail={async (row) => {
        if (!row.invoiceId) return row;
        try {
          const inv = await fetchInvoiceDetail(row.invoiceId);
          return { ...row, invoiceDetail: inv, purchaseOrder: inv?.purchaseOrder };
        } catch {
          return row;
        }
      }}
      renderView={(detail) => <PaymentDetailView detail={detail} />}
      kpis={[
        { label: "Processed", value: AED(processed), tone: "success" },
        { label: "Pending", value: AED(pending), tone: "warning" },
        { label: "Failed", value: String(failed), tone: "destructive" },
        { label: "Rows", value: String(rows.length), tone: "info" },
      ]}
      rows={rows}
      serverPagination={pagedListProps(list)}
      searchKeys={["id", "invoice", "method", "provider", "organization"]}
      emptyHint={isLoading ? "Loading…" : isError ? "Failed to load payments." : "No payments yet."}
      columns={[
        { key: "id", label: "Payment", className: "font-mono text-xs", render: (r) => String(r.id).slice(0, 12) },
        { key: "invoice", label: "Invoice", className: "font-mono text-xs" },
        { key: "method", label: "Method" },
        { key: "provider", label: "Provider" },
        { key: "subtotal", label: "Value", render: (r) => (r.subtotal ? AED(r.subtotal) : "—") },
        { key: "vat", label: "VAT", render: (r) => (r.vatRate ? `${r.vatRate}% · ${AED(r.vat)}` : AED(r.vat)) },
        { key: "amount", label: "Paid", render: (r) => AED(r.amount) },
        { key: "date", label: "Date" },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  );
}
