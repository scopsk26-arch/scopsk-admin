import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DataPage, StatusBadge, AED } from "@/components/admin/DataPage";
import { Receipt } from "lucide-react";
import { fetchList, markInvoicePaid } from "@/lib/api/resources";
import { num, str } from "@/lib/api/client";
import { useAdminLookups } from "@/hooks/useAdminLookups";

export const Route = createFileRoute("/_admin/invoices")({
  head: () => ({ meta: [{ title: "Invoices — Prime Plate" }] }),
  component: InvoicesPage,
});

function mapInvoice(r: any) {
  return {
    id: str(r.id),
    number: str(r.number ?? r.id),
    po: str(r.purchaseOrder?.number ?? r.purchaseOrderId, "—"),
    party: str(r.counterpartyOrg?.name ?? r.organization?.name ?? r.counterpartyOrgId, "—"),
    amount: num(r.subtotal ?? r.total),
    vat: num(r.tax ?? r.vat),
    due: r.dueDate ? String(r.dueDate).slice(0, 10) : "—",
    status: str(r.status, "pending"),
    organizationId: str(r.organizationId ?? r.issuerOrgId ?? r.buyerOrgId ?? r.organization?.id, ""),
  };
}

function InvoicesPage() {
  const { suppliers, restaurants, purchaseOrders } = useAdminLookups();
  const queryClient = useQueryClient();

  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const list = await fetchList("/invoices");
      return list.map(mapInvoice);
    },
  });

  const outstanding = rows.filter((r) => !["paid", "cancelled"].includes(r.status)).reduce((s, r) => s + r.amount, 0);
  const paid = rows.filter((r) => r.status === "paid").reduce((s, r) => s + r.amount, 0);
  const overdue = rows.filter((r) => r.status === "overdue").length;
  const vat = rows.reduce((s, r) => s + r.vat, 0);
  const parties = [...suppliers, ...restaurants].map((o) => ({ value: o.label, label: o.label }));

  return (
    <DataPage
      title="Invoices"
      description="Invoice payment status. Set status to paid to mark an invoice paid via the API."
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
        { key: "status", label: "Status", type: "select", options: ["paid", "pending", "overdue", "cancelled"] },
      ]}
      kpis={[
        { label: "Outstanding", value: AED(outstanding), tone: "warning" },
        { label: "Paid", value: AED(paid), tone: "success" },
        { label: "Overdue", value: String(overdue), tone: "destructive" },
        { label: "VAT collected", value: AED(vat), tone: "info" },
      ]}
      rows={rows}
      searchKeys={["number", "po", "party"]}
      emptyHint={isLoading ? "Loading…" : isError ? "Failed to load invoices." : "No invoices found."}
      columns={[
        { key: "number", label: "Invoice", className: "font-mono text-xs" },
        { key: "po", label: "PO", className: "font-mono text-xs" },
        { key: "party", label: "Supplier", render: (r) => <span className="font-medium">{r.party}</span> },
        { key: "amount", label: "Amount", render: (r) => AED(r.amount) },
        { key: "vat", label: "VAT", render: (r) => AED(r.vat) },
        { key: "due", label: "Due" },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
      onUpdate={async (id, data, row) => {
        if (String(data.status) !== "paid") {
          throw new Error("Only marking as paid is supported — set status to paid");
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
