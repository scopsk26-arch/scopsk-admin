import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DataPage, StatusBadge, AED } from "@/components/admin/DataPage";
import { FolderTree, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { EMPTY_LIST, fetchCommissionDetail, fetchCommissions, settleCommission } from "@/lib/api/resources";
import { num, str } from "@/lib/api/client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoryCommissionsPanel } from "./category-commissions";

export const Route = createFileRoute("/_admin/commissions")({
  head: () => ({ meta: [{ title: "Commissions — ResPy" }] }),
  component: CommissionsPage,
});

function DocCode({ value }: { value: string }) {
  const v = String(value || "—");
  return (
    <span className="font-mono text-xs whitespace-nowrap inline-block max-w-[200px] truncate align-middle" title={v}>
      {v}
    </span>
  );
}

function CommissionsLedger() {
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
      description="Admin-only ledger: commission cut per order (restaurant + supplier). Category rates are under the Category rates tab."
      icon={<Percent className="h-5 w-5 text-primary" />}
      disableCrud
      entityName="Commission"
      viewFields={[
        { key: "id", label: "Ref" },
        { key: "order", label: "Order #" },
        { key: "po", label: "PO #" },
        { key: "party", label: "Party" },
        { key: "organization", label: "Organization" },
        { key: "organizationCode", label: "Org code" },
        { key: "gross", label: "Order subtotal" },
        { key: "orderTotal", label: "Order total (incl. VAT)" },
        { key: "vat", label: "VAT" },
        { key: "rate", label: "Commission rate" },
        { key: "commission", label: "Commission amount" },
        { key: "status", label: "Status" },
        { key: "settledAt", label: "Settled at" },
        { key: "currency", label: "Currency" },
      ]}
      loadDetail={async (row) => {
        try {
          const d = await fetchCommissionDetail(String(row.id));
          const po = (d as any)?.purchaseOrder || {};
          const order = po.executionOrder || {};
          const org = (d as any)?.supplierOrg || {};
          const subtotal = num((d as any).orderSubtotal ?? po.subtotal ?? order.subtotal ?? row.gross);
          const total = num((d as any).orderTotal ?? order.total ?? po.total ?? subtotal);
          const vat = num((d as any).vat ?? po.tax ?? order.tax);
          return {
            id: str((d as any).id ?? row.id),
            order: str((d as any).orderNumber ?? order.number ?? row.order, "—"),
            po: str((d as any).poNumber ?? po.number ?? row.po, "—"),
            party: str((d as any).partyLabel ?? (d as any).party ?? row.party, "—"),
            organization: str((d as any).organizationName ?? org.name ?? row.organization, "—"),
            organizationCode: str((d as any).organizationCode ?? org.publicCode, "—"),
            gross: subtotal,
            orderTotal: AED(total),
            vat: AED(vat),
            rate: `${num((d as any).rate)}%`,
            commission: num((d as any).amount ?? (d as any).commission ?? row.commission),
            status: str((d as any).status ?? row.status, "pending"),
            settledAt: (d as any).settledAt
              ? String((d as any).settledAt).replace("T", " ").slice(0, 19)
              : "—",
            currency: str((d as any).currency ?? row.currency, "AED"),
          };
        } catch {
          return {
            ...row,
            gross: num(row.gross),
            orderTotal: AED(num((row as any).orderTotal ?? row.gross)),
            vat: AED(num((row as any).vat)),
            commission: num(row.commission),
            organizationCode: "—",
            settledAt: "—",
          };
        }
      }}
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
        {
          key: "order",
          label: "Order",
          className: "whitespace-nowrap min-w-[11rem]",
          render: (r) => <DocCode value={r.order} />,
        },
        {
          key: "po",
          label: "PO",
          className: "whitespace-nowrap min-w-[9rem]",
          render: (r) => <DocCode value={r.po} />,
        },
        { key: "party", label: "Party", className: "whitespace-nowrap", render: (r) => <span className="capitalize">{r.party}</span> },
        { key: "organization", label: "Organization", className: "whitespace-nowrap", render: (r) => <span className="font-medium">{r.organization}</span> },
        { key: "gross", label: "Order value", className: "whitespace-nowrap", render: (r) => AED(r.gross) },
        { key: "rate", label: "Rate", className: "whitespace-nowrap" },
        { key: "commission", label: "Commission", className: "whitespace-nowrap", render: (r) => AED(r.commission) },
        { key: "status", label: "Status", className: "whitespace-nowrap", render: (r) => <StatusBadge status={r.status} /> },
        {
          key: "actions",
          label: "",
          className: "whitespace-nowrap",
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

function CommissionsPage() {
  const [tab, setTab] = useState("ledger");

  return (
    <div className="space-y-0">
      <div className="px-6 lg:px-8 pt-6 lg:pt-8">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="ledger" className="gap-1.5">
              <Percent className="h-3.5 w-3.5" />
              Ledger
            </TabsTrigger>
            <TabsTrigger value="rates" className="gap-1.5">
              <FolderTree className="h-3.5 w-3.5" />
              Category rates
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {tab === "ledger" ? <CommissionsLedger /> : <CategoryCommissionsPanel />}
    </div>
  );
}
