import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DataPage, StatusBadge, AED } from "@/components/admin/DataPage";
import { GenericJsonDetailView } from "@/components/admin/DetailViews";
import { Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { EMPTY_LIST, fetchCommissionDetail, fetchCommissions, settleCommission } from "@/lib/api/resources";
import { num } from "@/lib/api/client";

export const Route = createFileRoute("/_admin/commissions")({
  head: () => ({ meta: [{ title: "Commissions — ResPy" }] }),
  component: CommissionsPage,
});

function CommissionsPage() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "commissions"],
    queryFn: () => fetchCommissions(),
  });

  const rows = data?.rows ?? EMPTY_LIST;
  const aggregates = data?.aggregates;

  const settleMut = useMutation({
    mutationFn: (id: string) => settleCommission(id, "settled"),
    onSuccess: () => {
      toast.success("Commission settled");
      qc.invalidateQueries({ queryKey: ["admin", "commissions"] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to settle"),
  });

  const accrued = aggregates?.accruedTotal
    ?? rows.filter((r: any) => r.status === "pending" || r.status === "approved").reduce((s: number, r: any) => s + num(r.commission), 0);
  const paid = aggregates?.settledTotal
    ?? rows.filter((r: any) => r.status === "settled" || r.status === "paid").reduce((s: number, r: any) => s + num(r.commission), 0);
  const awaiting = aggregates?.pendingTotal
    ?? rows.filter((r: any) => r.status === "pending").reduce((s: number, r: any) => s + num(r.commission), 0);
  const rates = rows.map((r: any) => parseFloat(String(r.rate).replace("%", ""))).filter((n: number) => Number.isFinite(n) && n > 0);
  const avgRate = rates.length ? (rates.reduce((a: number, b: number) => a + b, 0) / rates.length).toFixed(1) : "—";

  return (
    <DataPage
      title="Commissions"
      description="Admin-only ledger: commission cut per order (restaurant + supplier). Not shown on invoices or mobile."
      icon={<Percent className="h-5 w-5 text-primary" />}
      disableCrud
      viewFields={[
        { key: "id", label: "Ref" },
        { key: "order", label: "Order" },
        { key: "po", label: "PO" },
        { key: "party", label: "Party" },
        { key: "organization", label: "Organization" },
        { key: "gross", label: "Order value (subtotal)" },
        { key: "rate", label: "Rate" },
        { key: "commission", label: "Commission" },
        { key: "status", label: "Status" },
      ]}
      loadDetail={async (row) => {
        try {
          return await fetchCommissionDetail(String(row.id));
        } catch {
          return row;
        }
      }}
      renderView={(detail) => <GenericJsonDetailView detail={detail} />}
      kpis={[
        { label: "Accrued", value: AED(accrued), tone: "info" },
        { label: "Settled", value: AED(paid), tone: "success" },
        { label: "Avg. rate", value: avgRate === "—" ? "—" : `${avgRate}%` },
        { label: "Pending", value: AED(awaiting), tone: "warning" },
      ]}
      rows={rows}
      searchKeys={["id", "order", "po", "organization", "party"]}
      emptyHint={isLoading ? "Loading…" : isError ? "Failed to load commissions." : "No commissions yet — they appear when a supplier accepts an order."}
      columns={[
        { key: "order", label: "Order", className: "font-mono text-xs", render: (r) => r.order },
        { key: "po", label: "PO", className: "font-mono text-xs", render: (r) => r.po },
        { key: "party", label: "Party", render: (r) => <span className="capitalize">{r.party}</span> },
        { key: "organization", label: "Organization", render: (r) => <span className="font-medium">{r.organization}</span> },
        { key: "gross", label: "Order value", render: (r) => AED(r.gross) },
        { key: "rate", label: "Rate" },
        { key: "commission", label: "Commission", render: (r) => AED(r.commission) },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
        {
          key: "actions",
          label: "",
          render: (r) =>
            r.status === "pending" ? (
              <Button
                size="sm"
                variant="outline"
                disabled={settleMut.isPending}
                onClick={() => settleMut.mutate(String(r.id))}
              >
                Settle
              </Button>
            ) : null,
        },
      ]}
    />
  );
}
