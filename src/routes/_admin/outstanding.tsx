import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DataPage, StatusBadge, AED } from "@/components/admin/DataPage";
import { Landmark } from "lucide-react";
import { fetchAdminOutstanding } from "@/lib/api/resources";
import { num, str } from "@/lib/api/client";

export const Route = createFileRoute("/_admin/outstanding")({
  head: () => ({ meta: [{ title: "Outstanding — ScopsK" }] }),
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
  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["admin", "outstanding"],
    staleTime: 60_000,
    queryFn: async () => {
      const list = await fetchAdminOutstanding();
      return list.map(mapRow);
    },
  });

  const totalOutstanding = rows.reduce((s, r) => s + r.outstanding, 0);
  const totalPaid = rows.reduce((s, r) => s + r.paid, 0);
  const overdueCount = rows.filter((r) => r.overdue).length;

  return (
    <DataPage
      title="Outstanding"
      description="Restaurant invoice balances — issued, overdue and paid amounts by invoice."
      icon={<Landmark className="h-5 w-5 text-primary" />}
      disableCrud
      entityName="Outstanding"
      kpis={[
        { label: "Outstanding", value: AED(totalOutstanding), tone: "warning" },
        { label: "Paid (listed)", value: AED(totalPaid), tone: "success" },
        { label: "Overdue", value: String(overdueCount), tone: overdueCount ? "destructive" : "default" },
        { label: "Invoices", value: String(rows.length) },
      ]}
      rows={rows}
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
