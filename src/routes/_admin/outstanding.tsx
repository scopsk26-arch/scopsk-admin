import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { pagedListProps, usePagedList } from "@/hooks/usePagedList";
import { DataPage, StatusBadge, AED } from "@/components/admin/DataPage";
import { Landmark } from "lucide-react";
import { fetchAdminDashboard } from "@/lib/api/resources";
import { num, str } from "@/lib/api/client";

export const Route = createFileRoute("/_admin/outstanding")({
  head: () => ({ meta: [{ title: "Unpaid invoices — ScopsK" }] }),
  component: OutstandingPage,
});

function mapRow(r: any) {
  const invoiced = num(r.invoiced ?? r.total);
  const outstanding = num(r.outstanding);
  const paid = num(r.paid);
  return {
    id: str(r.id),
    invoiceNumber: str(r.invoiceNumber ?? r.number, "—"),
    purchaseOrderNumber: str(r.purchaseOrderNumber, "—"),
    restaurant: str(r.restaurant, "—"),
    restaurantCode: str(r.restaurantCode, ""),
    invoiced,
    outstanding,
    paid,
    overdue: Boolean(r.overdue),
    dueDate: r.dueDate ? String(r.dueDate).slice(0, 10) : "—",
    status: str(r.status, "issued"),
    currency: str(r.currency, "AED"),
  };
}

function OutstandingPage() {
  const list = usePagedList({
    queryKey: ["admin", "outstanding"],
    path: "/admin/outstanding",
    map: mapRow,
  });
  const rows = list.rows;
  const isLoading = list.isLoading;
  const isError = list.isError;

  const dash = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: fetchAdminDashboard,
    staleTime: 30_000,
  });
  const totals = (dash.data?.invoices || {}) as Record<string, unknown>;
  const totalOutstanding = totals.outstandingTotal != null ? num(totals.outstandingTotal) : rows.reduce((s, r) => s + r.outstanding, 0);
  const totalPaid = totals.paidTotal != null ? num(totals.paidTotal) : rows.reduce((s, r) => s + r.paid, 0);
  const overdueCount = totals.overdueCount != null ? num(totals.overdueCount) : rows.filter((r) => r.overdue).length;

  return (
    <DataPage
      title="Unpaid invoices"
      description="Bills that are not paid yet."
      icon={<Landmark className="h-5 w-5 text-primary" />}
      disableCrud
      entityName="Outstanding"
      kpis={[
        { label: "Outstanding", value: AED(totalOutstanding), tone: "warning" },
        { label: "Paid", value: AED(totalPaid), tone: "success" },
        { label: "Overdue", value: String(overdueCount), tone: overdueCount ? "destructive" : "default" },
        { label: "Unpaid invoices", value: String(list.total) },
      ]}
      rows={rows}
      serverPagination={pagedListProps(list)}
      idKey="id"
      searchKeys={["restaurant", "invoiceNumber", "purchaseOrderNumber", "status"]}
      emptyHint={
        isLoading
          ? "Loading outstanding balances…"
          : isError
            ? "Failed to load outstanding data."
            : "No invoices found."
      }
      columns={[
        { key: "restaurant", label: "Restaurant", className: "font-medium whitespace-nowrap" },
        { key: "invoiceNumber", label: "Invoice", className: "font-mono text-xs whitespace-nowrap" },
        { key: "purchaseOrderNumber", label: "PO", className: "font-mono text-xs whitespace-nowrap" },
        { key: "invoiced", label: "Invoiced", render: (r) => AED(r.invoiced) },
        { key: "outstanding", label: "Outstanding", render: (r) => AED(r.outstanding) },
        { key: "paid", label: "Paid", render: (r) => AED(r.paid) },
        {
          key: "overdue",
          label: "Overdue",
          render: (r) => (r.overdue ? <StatusBadge status="overdue" /> : "—"),
        },
        { key: "dueDate", label: "Due", className: "whitespace-nowrap" },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
      viewFields={[
        { key: "restaurant", label: "Restaurant" },
        { key: "invoiceNumber", label: "Invoice" },
        { key: "purchaseOrderNumber", label: "PO" },
        { key: "invoiced", label: "Invoiced" },
        { key: "outstanding", label: "Outstanding" },
        { key: "paid", label: "Paid" },
        { key: "overdue", label: "Overdue" },
        { key: "dueDate", label: "Due date" },
        { key: "status", label: "Status" },
      ]}
    />
  );
}
