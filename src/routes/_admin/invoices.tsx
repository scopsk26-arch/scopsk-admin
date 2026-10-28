import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { pagedListProps, usePagedList } from "@/hooks/usePagedList";
import { DataPage, StatusBadge, AED } from "@/components/admin/DataPage";
import { InvoiceDetailView } from "@/components/admin/DetailViews";
import { Receipt } from "lucide-react";
import { fetchInvoiceDetail, markInvoicePaid } from "@/lib/api/resources";
import { num, str } from "@/lib/api/client";
import { useAdminLookups } from "@/hooks/useAdminLookups";

export const Route = createFileRoute("/_admin/invoices")({
  head: () => ({ meta: [{ title: "Invoices — ScopsK" }] }),
  component: InvoicesPage,
});

function mapInvoice(r: any) {
  const meta = (r.metadata || r.purchaseOrder?.metadata || {}) as Record<string, unknown>;
  const commissions = (meta.commissions || {}) as Record<string, unknown>;
  const subtotal = num(r.subtotal ?? r.amount);
  const tax = num(r.tax ?? r.vat);
  const total = num(r.total ?? r.subtotal);
  const vatRate =
    num(meta.vatRate) ||
    num(r.vatRate) ||
    (subtotal > 0 && tax > 0 ? Math.round((tax / subtotal) * 1000) / 10 : 0);
  const commission = num(
    r.commissionAmount ?? r.purchaseOrder?.commissionAmount ?? commissions.totalAmount,
  );
  return {
    id: str(r.id),
    number: str(r.number ?? r.id),
    po: str(r.purchaseOrder?.number ?? r.purchaseOrderId, "—"),
    party: str(r.counterpartyOrg?.name ?? r.organization?.name ?? r.counterpartyOrgId, "—"),
    issuer: str(r.issuerOrg?.name ?? r.organization?.name, "—"),
    amount: subtotal,
    subtotal,
    total,
    vat: tax,
    vatRate,
    commission,
    currency: str(r.currency, "AED"),
    due: r.dueDate ? String(r.dueDate).slice(0, 10) : "—",
    paidAt: r.paidAt ? String(r.paidAt).slice(0, 10) : "—",
    type: str(r.type, "—"),
    status: str(r.status, "pending"),
    organizationId: str(
      r.organizationId ?? r.issuerOrgId ?? r.buyerOrgId ?? r.organization?.id,
      "",
    ),
  };
}

function InvoicesList() {
  const { suppliers, restaurants, purchaseOrders } = useAdminLookups([
    "suppliers",
    "restaurants",
    "purchaseOrders",
  ]);
  const queryClient = useQueryClient();

  const list = usePagedList({
    queryKey: ["invoices"],
    path: "/invoices",
    map: mapInvoice,
  });
  const rows = list.rows;
  const isLoading = list.isLoading;
  const isError = list.isError;

  const outstanding = rows
    .filter((r) => !["paid", "cancelled"].includes(r.status))
    .reduce((s, r) => s + r.amount, 0);
  const paid = rows.filter((r) => r.status === "paid").reduce((s, r) => s + r.amount, 0);
  const overdue = rows.filter((r) => r.status === "overdue").length;
  const vat = rows.reduce((s, r) => s + r.vat, 0);
  const parties = [...suppliers, ...restaurants].map((o) => ({ value: o.label, label: o.label }));

  return (
    <DataPage
      title="Invoices"
      description="Mark invoices as paid, or open one to see the breakdown."
      icon={<Receipt className="h-5 w-5 text-primary" />}
      lookups={{
        party: parties,
        po: purchaseOrders.map((p) => ({ value: p.label, label: p.label })),
        supplier: suppliers.map((s) => ({ value: s.label, label: s.label })),
      }}
      formFields={[
        { key: "number", label: "Invoice #", type: "text" },
        { key: "party", label: "Party", type: "text" },
        { key: "amount", label: "Amount", type: "number" },
        {
          key: "status",
          label: "Status",
          required: true,
          type: "select",
          options: ["paid", "pending", "overdue", "cancelled"],
        },
      ]}
      viewFields={[
        { key: "number", label: "Invoice #" },
        { key: "po", label: "PO" },
        { key: "issuer", label: "Issuer" },
        { key: "party", label: "Counterparty" },
        { key: "subtotal", label: "Actual value" },
        { key: "vatRate", label: "VAT %" },
        { key: "vat", label: "VAT amount" },
        { key: "commission", label: "Commission" },
        { key: "total", label: "Total (incl. VAT)" },
        { key: "currency", label: "Currency" },
        { key: "due", label: "Due" },
        { key: "paidAt", label: "Paid at" },
        { key: "type", label: "Type" },
        { key: "status", label: "Status" },
      ]}
      loadDetail={async (row) => fetchInvoiceDetail(row.id)}
      renderView={(detail) => <InvoiceDetailView detail={detail} />}
      kpis={[
        { label: "Outstanding", value: AED(outstanding), tone: "warning" },
        { label: "Paid", value: AED(paid), tone: "success" },
        { label: "Overdue", value: String(overdue), tone: "destructive" },
        { label: "VAT collected", value: AED(vat), tone: "info" },
      ]}
      rows={rows}
      serverPagination={pagedListProps(list)}
      searchKeys={["number", "po", "party", "issuer"]}
      emptyHint={
        isLoading ? "Loading…" : isError ? "Failed to load invoices." : "No invoices found."
      }
      columns={[
        {
          key: "number",
          label: "Invoice",
          className: "font-mono text-xs whitespace-nowrap w-[1%]",
        },
        { key: "po", label: "PO", className: "font-mono text-xs whitespace-nowrap w-[1%]" },
        {
          key: "party",
          label: "Supplier",
          render: (r) => <span className="font-medium">{r.party}</span>,
        },
        {
          key: "subtotal",
          label: "Value",
          className: "whitespace-nowrap w-[1%]",
          render: (r) => AED(r.subtotal),
        },
        {
          key: "vat",
          label: "VAT",
          className: "whitespace-nowrap w-[1%]",
          render: (r) => (r.vatRate ? `${r.vatRate}% · ${AED(r.vat)}` : AED(r.vat)),
        },
        {
          key: "commission",
          label: "Commission",
          className: "whitespace-nowrap w-[1%]",
          render: (r) => AED(r.commission),
        },
        {
          key: "total",
          label: "Total",
          className: "whitespace-nowrap w-[1%]",
          render: (r) => AED(r.total),
        },
        { key: "due", label: "Due", className: "whitespace-nowrap w-[1%]" },
        {
          key: "status",
          label: "Status",
          className: "whitespace-nowrap w-[1%]",
          render: (r) => <StatusBadge status={r.status} />,
        },
      ]}
      onUpdate={async (id, data, row) => {
        if (String(data.status) !== "paid") {
          throw new Error("Set status to paid to mark this invoice paid.");
        }
        const orgId = String(row.organizationId || "");
        if (!orgId) throw new Error("Missing organization for this invoice");
        await markInvoicePaid(id, orgId);
        await queryClient.invalidateQueries({ queryKey: ["invoices"] });
        return { ...row, status: "paid" };
      }}
    />
  );
}

function InvoicesPage() {
  return <InvoicesList />;
}
