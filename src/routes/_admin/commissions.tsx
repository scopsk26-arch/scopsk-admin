import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pagedListProps, usePagedList } from "@/hooks/usePagedList";
import { DataPage, StatusBadge, AED } from "@/components/admin/DataPage";
import { FolderTree, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { fetchAdminDashboard, fetchCommissionDetail, fetchCommissions, settleCommission } from "@/lib/api/resources";
import { num, str } from "@/lib/api/client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoryCommissionsPanel } from "./category-commissions";

export const Route = createFileRoute("/_admin/commissions")({
  head: () => ({ meta: [{ title: "Commissions — ScopsK" }] }),
  component: CommissionsPage,
});

function plainRef(value: unknown, empty: string) {
  const v = str(value, "");
  if (!v || v === "—" || /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(v)) return empty;
  return v;
}

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
  const list = usePagedList({
    queryKey: ["admin", "commissions"],
    path: "/admin/commissions",
    load: ({ page, pageSize, search, sort, status }) =>
      fetchCommissions({
        page,
        limit: pageSize,
        search: search || undefined,
        status: status !== "all" ? status : undefined,
        sortBy: "createdAt",
        sortOrder: sort === "oldest" ? "ASC" : "DESC",
      }).then((data) => ({
        rows: data.rows,
        total: data.total,
      })),
  });
  const rows = list.rows;
  const isLoading = list.isLoading;
  const isError = list.isError;

  const settleMut = useMutation({
    mutationFn: (id: string) => settleCommission(id, "settled"),
    onSuccess: () => {
      toast.success("Commission settled");
      qc.invalidateQueries({ queryKey: ["admin", "commissions"] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to settle"),
  });

  const dash = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: fetchAdminDashboard,
    staleTime: 30_000,
  });
  const totals = (dash.data?.commissions || {}) as Record<string, unknown>;
  const accrued = totals.pendingTotal != null
    ? num(totals.pendingTotal)
    : rows.filter((r: any) => r.status === "pending" || r.status === "approved").reduce((s: number, r: any) => s + num(r.commission), 0);
  const paid = totals.settledTotal != null
    ? num(totals.settledTotal)
    : rows.filter((r: any) => r.status === "settled" || r.status === "paid").reduce((s: number, r: any) => s + num(r.commission), 0);
  const awaiting = accrued;
  const rates = rows.map((r: any) => parseFloat(String(r.rate).replace("%", ""))).filter((n: number) => Number.isFinite(n) && n > 0);
  const avgRate = rates.length ? (rates.reduce((a: number, b: number) => a + b, 0) / rates.length).toFixed(1) : "—";

  return (
    <DataPage
      title="Commissions"
      description="The amount ScopsK keeps on each order. Set the percent by category in the other tab."
      icon={<Percent className="h-5 w-5 text-primary" />}
      disableCrud
      entityName="Commission"
      viewDescription="Who was charged, which order it came from, and how much ScopsK kept. Business code is the short public code for that restaurant or supplier."
      viewFields={[
        { key: "party", label: "Charged to" },
        { key: "organization", label: "Business" },
        { key: "organizationCode", label: "Business code" },
        { key: "order", label: "Order number" },
        { key: "po", label: "Purchase order" },
        { key: "gross", label: "Order subtotal" },
        { key: "orderTotal", label: "Order total (incl. VAT)" },
        { key: "vat", label: "VAT" },
        { key: "rate", label: "Commission rate" },
        { key: "commission", label: "Commission amount" },
        { key: "status", label: "Status" },
        { key: "settledAt", label: "Settled on" },
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
            order: plainRef((d as any).orderNumber ?? order.number ?? row.order, "No order number"),
            po: plainRef((d as any).poNumber ?? po.number ?? row.po, "No purchase order number"),
            party: str((d as any).partyLabel ?? (d as any).party ?? row.party, "—"),
            organization: plainRef((d as any).organizationName ?? org.name ?? row.organization, "Business no longer on file"),
            organizationCode: plainRef((d as any).organizationCode ?? org.publicCode ?? (row as any).organizationCode, "Not assigned"),
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
            organizationCode: plainRef((row as any).organizationCode, "Not assigned"),
            order: plainRef(row.order, "No order number"),
            po: plainRef(row.po, "No purchase order number"),
            organization: plainRef(row.organization, "Business no longer on file"),
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
      serverPagination={pagedListProps(list)}
      searchKeys={["id", "order", "po", "organization", "party"]}
      emptyHint={isLoading ? "Loading…" : isError ? "Failed to load commissions." : "No commissions yet — they appear when a supplier accepts an order."}
      columns={[
        {
          key: "order",
          label: "Order",
          className: "whitespace-nowrap min-w-[11rem]",
          render: (r) => <DocCode value={plainRef(r.order, "—")} />,
        },
        {
          key: "po",
          label: "Purchase order",
          className: "whitespace-nowrap min-w-[9rem]",
          render: (r) => <DocCode value={plainRef(r.po, "—")} />,
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
            <TabsTrigger value="ledger">
              <Percent />
              Order fees
            </TabsTrigger>
            <TabsTrigger value="rates">
              <FolderTree />
              Rates by category
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {tab === "ledger" ? <CommissionsLedger /> : <CategoryCommissionsPanel />}
    </div>
  );
}
