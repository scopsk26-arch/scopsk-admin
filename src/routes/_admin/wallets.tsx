import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Wallet,
  Search,
  List,
  FileText,
  Landmark,
  RefreshCw,
  FilterX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AED, StatusBadge, FieldLabel } from "@/components/admin/DataPage";
import { SearchableSelect } from "@/components/admin/SearchableSelect";
import { useAdminLookups } from "@/hooks/useAdminLookups";
import { usePagedList } from "@/hooks/usePagedList";
import {
  EMPTY_LIST,
  acceptWalletCreditRequest,
  acceptWalletWithdrawRequest,
  creditOrgWallet,
  debitOrgWallet,
  fetchAdminWalletCreditRequests,
  fetchAdminWallets,
  fetchAdminWalletWithdrawals,
  fetchOrgWallet,
  fetchOrgWalletTransactions,
  refundWalletPayment,
  rejectWalletCreditRequest,
  rejectWalletWithdrawRequest,
  type AdminWalletRow,
  type WalletCreditRequestRow,
  type WalletTransactionRow,
  type WalletWithdrawalRow,
} from "@/lib/api/resources";
import { num, str } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/wallets")({
  head: () => ({ meta: [{ title: "Wallet Management — ScopsK" }] }),
  component: WalletsPage,
});

const TX_TONES: Record<string, "success" | "destructive" | "warning" | "info"> = {
  credit: "success",
  debit: "destructive",
  hold: "warning",
  release: "info",
};

type WalletInnerTab =
  | "balances"
  | "credit-requests"
  | "withdrawals"
  | "refunds"
  | "platform";

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "success" | "warning" | "info" }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
      <div className="label-caps">{label}</div>
      <div className={cn(
        "mt-1 text-2xl font-display font-semibold tabular-nums",
        tone === "success" && "text-success",
        tone === "warning" && "text-warning",
        tone === "info" && "text-info",
      )}>{value}</div>
    </div>
  );
}

function PageBar({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="px-4 py-3 border-t border-border flex items-center justify-between gap-3 text-xs text-muted-foreground">
      <span>
        Showing {from}–{to} of {total}
      </span>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          disabled={to >= total}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

function BalancesPanel({ orgTypeFilter }: { orgTypeFilter: "restaurant" | "all" }) {
  const qc = useQueryClient();
  const { restaurants } = useAdminLookups(["restaurants"]);
  const [orgId, setOrgId] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [action, setAction] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");

  const orgOptions = useMemo(
    () => restaurants.map((o) => ({ ...o, label: o.label })),
    [restaurants],
  );

  const walletsList = usePagedList<AdminWalletRow>({
    queryKey: ["admin", "wallets", orgTypeFilter, statusFilter],
    path: "/admin/wallets",
    query: {
      type: orgTypeFilter === "all" ? "all" : "restaurant",
      walletStatus: statusFilter === "all" ? undefined : statusFilter,
    },
    load: ({ page, pageSize, search }) =>
      fetchAdminWallets({
        type: orgTypeFilter === "all" ? "all" : "restaurant",
        walletStatus: statusFilter === "all" ? undefined : statusFilter,
        search: search || undefined,
        page,
        limit: pageSize,
      }),
  });
  const wallets = walletsList.rows;
  const walletsLoading = walletsList.isLoading;
  const walletsError = walletsList.isError;

  const filteredWallets = useMemo(() => {
    if (statusFilter === "all") return wallets;
    return wallets.filter((w) => w.status === statusFilter);
  }, [wallets, statusFilter]);

  const totals = useMemo(() => {
    let available = 0;
    let pending = 0;
    let frozen = 0;
    for (const w of wallets) {
      available += num(w.availableBalance);
      pending += num(w.pendingBalance ?? w.heldBalance);
      if (w.status !== "active") frozen += 1;
    }
    return { available, pending, frozen };
  }, [wallets]);

  const { data: wallet, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "wallet", orgId],
    enabled: Boolean(orgId),
    queryFn: () => fetchOrgWallet(orgId),
  });

  const {
    data: txPayload,
    isLoading: txLoading,
    isError: txError,
  } = useQuery({
    queryKey: ["admin", "wallet-transactions", orgId],
    enabled: Boolean(orgId),
    queryFn: () => fetchOrgWalletTransactions(orgId),
  });

  const transactions: WalletTransactionRow[] = txPayload?.transactions ?? EMPTY_LIST;

  const selectedOrgLabel = useMemo(() => {
    if (!orgId) return "";
    const fromWallets = (wallets as AdminWalletRow[]).find((w) => w.organizationId === orgId);
    if (fromWallets) return fromWallets.organization;
    return orgOptions.find((o) => o.value === orgId)?.label ?? "";
  }, [orgId, wallets, orgOptions]);

  const mutate = useMutation({
    mutationFn: async () => {
      const value = Number(amount);
      if (!(value > 0)) throw new Error("Amount must be greater than 0");
      if (!orgId) throw new Error("Select an organization");
      const body = {
        amount: value,
        description: description.trim() || undefined,
        idempotencyKey: idempotencyKey.trim() || undefined,
      };
      return action === "credit" ? creditOrgWallet(orgId, body) : debitOrgWallet(orgId, body);
    },
    onSuccess: async (result: any) => {
      toast.success(
        result?.idempotent
          ? `Idempotent ${action} replayed`
          : `Wallet ${action === "credit" ? "credited" : "debited"}`,
      );
      setAmount("");
      setDescription("");
      await qc.invalidateQueries({ queryKey: ["admin", "wallet", orgId] });
      await qc.invalidateQueries({ queryKey: ["admin", "wallet-transactions", orgId] });
      await qc.invalidateQueries({ queryKey: ["admin", "wallets"] });
      await refetch();
    },
    onError: (err: Error) => toast.error(err.message || `Failed to ${action}`),
  });

  const clearFilters = () => {
    walletsList.setSearch("");
    setStatusFilter("all");
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Wallets" value={String(walletsList.total)} />
        <Kpi label="Total available" value={AED(totals.available)} tone="success" />
        <Kpi label="Total pending" value={AED(totals.pending)} tone="success" />
        <Kpi label="Not active" value={String(totals.frozen)} tone="warning" />
      </div>

      <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
        <div className="p-4 flex flex-wrap items-center gap-2 border-b border-border bg-muted/20">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={walletsList.search}
              onChange={(e) => walletsList.setSearch(e.target.value)}
              placeholder="Search restaurant, code…"
              className="pl-9 h-9 bg-card"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-[160px] bg-card">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="frozen">Frozen</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          {(walletsList.search || statusFilter !== "all") && (
            <Button type="button" variant="ghost" size="sm" className="h-9 gap-1.5" onClick={clearFilters}>
              <FilterX className="h-3.5 w-3.5" />
              Clear filters
            </Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                {["Organization", "Type", "Code", "Available", "Pending", "Currency", "Status", "Updated"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredWallets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center">
                    <div className="text-sm font-medium text-foreground">No wallets</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {walletsLoading
                        ? "Loading wallets…"
                        : walletsError
                          ? "Failed to load wallets."
                          : walletsList.search || statusFilter !== "all"
                            ? "No wallets match your filters."
                            : "Wallets appear once an organization transacts on ScopsK."}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredWallets.map((w: AdminWalletRow) => (
                  <tr
                    key={w.id}
                    onClick={() => setOrgId(w.organizationId)}
                    className={cn(
                      "border-b border-border last:border-0 cursor-pointer transition-colors hover:bg-primary/[0.04]",
                      orgId === w.organizationId && "bg-primary/[0.07]",
                    )}
                  >
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{w.organization}</td>
                    <td className="px-4 py-3 capitalize whitespace-nowrap">{w.orgType}</td>
                    <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{w.publicCode}</td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">{AED(w.availableBalance)}</td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">{AED(w.pendingBalance ?? w.heldBalance)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{w.currency}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={w.status} /></td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{w.updated}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <PageBar
          page={walletsList.page}
          pageSize={walletsList.pageSize}
          total={walletsList.total}
          onPageChange={walletsList.setPage}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-4">
          <div>
            <FieldLabel required className="text-muted-foreground">Organization</FieldLabel>
            <div className="mt-1">
              <SearchableSelect
                options={orgOptions}
                value={orgId}
                onChange={setOrgId}
                placeholder="Search restaurants…"
                allowClear
              />
            </div>
          </div>

          {!orgId ? (
            <p className="text-sm text-muted-foreground">Select an organization to view its wallet.</p>
          ) : isLoading ? (
            <p className="text-sm text-muted-foreground">Loading wallet…</p>
          ) : isError ? (
            <p className="text-sm text-destructive">Failed to load wallet.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">Available</div>
                <div className="text-lg font-semibold mt-0.5">{AED(num(wallet?.availableBalance))}</div>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">Pending</div>
                <div className="text-lg font-semibold mt-0.5">
                  {AED(num(wallet?.pendingBalance ?? wallet?.heldBalance))}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">Credit limit</div>
                <div className="text-lg font-semibold mt-0.5">{AED(num(wallet?.creditLimit))}</div>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">Available credit</div>
                <div className="text-lg font-semibold mt-0.5">{AED(num(wallet?.availableCredit))}</div>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">Used credit</div>
                <div className="text-lg font-semibold mt-0.5">{AED(num(wallet?.usedCredit))}</div>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">Credit renews</div>
                <div className="text-lg font-semibold mt-0.5">
                  {wallet?.creditLabel
                    ? str(wallet.creditLabel)
                    : wallet?.creditPeriod === "week"
                      ? "This week"
                      : wallet?.creditPeriod === "month"
                        ? "This month"
                        : "—"}
                </div>
              </div>
              <div className="sm:col-span-2 text-xs text-muted-foreground">
                Currency {str(wallet?.currency, "AED")} · Status {str(wallet?.status, "—")}. Funds requests from
                the app appear under Credit requests.
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-4">
          <h2 className="font-display font-semibold">Adjust balance</h2>
          <div>
            <FieldLabel required className="text-muted-foreground">Action</FieldLabel>
            <Select value={action} onValueChange={(v) => setAction(v as "credit" | "debit")}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="credit">Credit</SelectItem>
                <SelectItem value="debit">Debit</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel required className="text-muted-foreground">Amount (AED)</FieldLabel>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1"
              placeholder="0.00"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
              placeholder="Optional note for the ledger entry"
              rows={3}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Idempotency key</Label>
            <Input
              value={idempotencyKey}
              onChange={(e) => setIdempotencyKey(e.target.value)}
              className="mt-1 font-mono text-xs"
              placeholder="Optional unique key"
            />
          </div>
          <div className="flex justify-end">
            <Button
              disabled={!orgId || mutate.isPending}
              onClick={() => mutate.mutate()}
            >
              {mutate.isPending
                ? "Submitting…"
                : action === "credit"
                  ? "Credit wallet"
                  : "Debit wallet"}
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/20">
          <h2 className="font-display font-semibold text-sm">Transaction history</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {orgId
              ? `Latest ledger entries${selectedOrgLabel ? ` for ${selectedOrgLabel}` : ""}.`
              : "Select an organization to load its ledger."}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                {["Date", "Type", "Amount", "Balance before", "Balance after", "Order", "Reference", "Description", "Status"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-14 text-center">
                    <div className="text-sm font-medium text-foreground">No transactions</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {!orgId
                        ? "Pick an organization above."
                        : txLoading
                          ? "Loading transactions…"
                          : txError
                            ? "Failed to load transactions."
                            : "This wallet has no ledger entries yet."}
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-0 hover:bg-primary/[0.04] transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{t.createdAt}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={t.type} tone={TX_TONES[t.type] ?? "default"} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums font-medium">{AED(t.amount)}</td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums text-muted-foreground">
                      {t.balanceBefore == null ? "—" : AED(t.balanceBefore)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">{AED(t.balanceAfter)}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-xs">
                      {t.orderNumber || "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-mono text-xs inline-block max-w-[220px] truncate align-middle" title={t.reference}>
                        {t.reference}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[280px] truncate" title={t.description}>{t.description}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={t.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {orgId && transactions.length > 0 && (
          <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
            Showing {transactions.length} most recent entries
          </div>
        )}
      </div>
    </div>
  );
}

function walletRequestStatusLabel(status: string) {
  switch (String(status || "").toLowerCase()) {
    case "resolved":
      return "Accepted";
    case "closed":
      return "Rejected";
    case "in_progress":
      return "In review";
    case "waiting":
      return "Waiting";
    case "open":
    default:
      return "Pending";
  }
}

function CreditRequestsPanel() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("all");
  const list = usePagedList<WalletCreditRequestRow>({
    queryKey: ["admin", "wallet-credit-requests", status],
    path: "/admin/wallets/credit-requests",
    query: status === "all" ? undefined : { status },
    load: ({ page, pageSize, search }) =>
      fetchAdminWalletCreditRequests({
        status: status === "all" ? undefined : status,
        search: search || undefined,
        page,
        limit: pageSize,
      }),
  });
  const rows = list.rows;

  const patchRequestStatus = (ticketId: string, next: string) => {
    qc.setQueriesData(
      { queryKey: ["admin", "wallet-credit-requests"] },
      (prev: unknown) => {
        if (!prev || typeof prev !== "object") return prev;
        const page = prev as { rows?: WalletCreditRequestRow[]; total?: number };
        if (!Array.isArray(page.rows)) return prev;
        return {
          ...page,
          rows: page.rows.map((row) =>
            row.id === ticketId ? { ...row, status: next } : row,
          ),
        };
      },
    );
  };

  const acceptM = useMutation({
    mutationFn: (ticketId: string) => acceptWalletCreditRequest(ticketId),
    onSuccess: async (_data, ticketId) => {
      toast.success("Request accepted");
      // Keep the row — only flip status and drop Accept/Reject.
      patchRequestStatus(ticketId, "resolved");
      await qc.invalidateQueries({ queryKey: ["admin", "wallets"] });
    },
    onError: (err: Error) => toast.error(err.message || "Accept failed"),
  });

  const rejectM = useMutation({
    mutationFn: (ticketId: string) => {
      const reason = window.prompt("Reject reason (optional)") ?? undefined;
      return rejectWalletCreditRequest(ticketId, reason);
    },
    onSuccess: async (_data, ticketId) => {
      toast.success("Request rejected");
      patchRequestStatus(ticketId, "closed");
      await qc.invalidateQueries({ queryKey: ["admin", "wallets"] });
    },
    onError: (err: Error) => toast.error(err.message || "Reject failed"),
  });

  const busy = acceptM.isPending || rejectM.isPending;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Funds requests add cash to the restaurant wallet. Credit limit requests set how much credit
        they can use on awards. Reject notifies the restaurant and leaves balances unchanged.
      </p>
      <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
        <div className="p-4 flex flex-wrap gap-2 border-b border-border bg-muted/20">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={list.search}
              onChange={(e) => list.setSearch(e.target.value)}
              placeholder="Search ticket, restaurant…"
              className="pl-9 h-9 bg-card"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-[160px] bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="open">Pending</SelectItem>
              <SelectItem value="in_progress">In review</SelectItem>
              <SelectItem value="resolved">Accepted</SelectItem>
              <SelectItem value="closed">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                {["Ticket", "Type", "Organization", "Amount", "Subject", "Requester", "Status", "Created", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-14 text-center text-sm text-muted-foreground">
                    {list.isLoading ? "Loading…" : list.isError ? "Failed to load credit requests." : "No funds or credit requests."}
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const actionable = r.status === "open" || r.status === "in_progress" || r.status === "waiting";
                  const statusLabel = walletRequestStatusLabel(r.status);
                  return (
                    <tr key={r.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{r.number}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs">
                        {r.kind === "credit_limit"
                          ? `Credit limit${r.period ? ` · ${r.period}` : ""}`
                          : "Funds"}
                      </td>
                      <td className="px-4 py-3 font-medium whitespace-nowrap">{r.organization}</td>
                      <td className="px-4 py-3 whitespace-nowrap tabular-nums font-medium">
                        {r.amount > 0 ? AED(r.amount) : "—"}
                      </td>
                      <td className="px-4 py-3 max-w-[240px] truncate" title={r.subject}>{r.subject}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{r.requester}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={statusLabel} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{r.createdAt}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {actionable ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="h-8"
                              disabled={busy}
                              onClick={() => acceptM.mutate(r.id)}
                            >
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8"
                              disabled={busy}
                              onClick={() => rejectM.mutate(r.id)}
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <PageBar
          page={list.page}
          pageSize={list.pageSize}
          total={list.total}
          onPageChange={list.setPage}
        />
      </div>
    </div>
  );
}

function WithdrawalsPanel() {
  const qc = useQueryClient();
  const [requestStatus, setRequestStatus] = useState("pending");
  const list = usePagedList<WalletWithdrawalRow>({
    queryKey: ["admin", "wallet-withdrawals", requestStatus],
    path: "/admin/wallets/withdrawals",
    query: requestStatus === "all" ? undefined : { requestStatus },
    load: ({ page, pageSize, search }) =>
      fetchAdminWalletWithdrawals({
        requestStatus: requestStatus === "all" ? undefined : requestStatus,
        search: search || undefined,
        page,
        limit: pageSize,
      }),
  });
  const rows = list.rows;

  const pendingTotal = useMemo(
    () =>
      rows
        .filter((r) => r.requestStatus === "pending")
        .reduce((s, r) => s + Number(r.amount || 0), 0),
    [rows],
  );

  const acceptM = useMutation({
    mutationFn: (requestId: string) => acceptWalletWithdrawRequest(requestId),
    onSuccess: async () => {
      toast.success("Withdraw accepted · wallet debited");
      await qc.invalidateQueries({ queryKey: ["admin", "wallet-withdrawals"] });
      await qc.invalidateQueries({ queryKey: ["admin", "wallets"] });
    },
    onError: (err: Error) => toast.error(err.message || "Accept failed"),
  });

  const rejectM = useMutation({
    mutationFn: (requestId: string) => {
      const reason = window.prompt("Reject reason (optional)") ?? undefined;
      return rejectWalletWithdrawRequest(requestId, reason);
    },
    onSuccess: async () => {
      toast.success("Withdraw rejected · hold released");
      await qc.invalidateQueries({ queryKey: ["admin", "wallet-withdrawals"] });
      await qc.invalidateQueries({ queryKey: ["admin", "wallets"] });
    },
    onError: (err: Error) => toast.error(err.message || "Reject failed"),
  });

  const busy = acceptM.isPending || rejectM.isPending;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Kpi label="Requests" value={String(list.total)} />
        <Kpi label="Pending amount" value={AED(pendingTotal)} tone="warning" />
      </div>
      <p className="text-sm text-muted-foreground">
        Supplier withdraw requests hold funds until you accept (final debit) or reject (release hold).
      </p>
      <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
        <div className="p-4 flex flex-wrap gap-2 border-b border-border bg-muted/20">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={list.search}
              onChange={(e) => list.setSearch(e.target.value)}
              placeholder="Search organization, bank…"
              className="pl-9 h-9 bg-card"
            />
          </div>
          <Select value={requestStatus} onValueChange={setRequestStatus}>
            <SelectTrigger className="h-9 w-[160px] bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                {["Organization", "Amount", "Bank", "Account", "Requester", "Status", "Date", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center text-sm text-muted-foreground">
                    {list.isLoading ? "Loading…" : list.isError ? "Failed to load withdrawals." : "No withdraw requests."}
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const actionable = r.requestStatus === "pending";
                  return (
                    <tr key={r.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-medium whitespace-nowrap">
                        <div>{r.organization}</div>
                        <div className="text-xs text-muted-foreground font-mono">{r.publicCode}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap tabular-nums font-medium">{AED(r.amount)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{r.bankName}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm">{r.bankAccountName}</div>
                        <div className="text-xs font-mono text-muted-foreground">{r.bankAccountNumber}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{r.actor}</td>
                      <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={r.requestStatus} /></td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{r.createdAt}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {actionable ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="h-8"
                              disabled={busy}
                              onClick={() => acceptM.mutate(r.requestId)}
                            >
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8"
                              disabled={busy}
                              onClick={() => rejectM.mutate(r.requestId)}
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <PageBar
          page={list.page}
          pageSize={list.pageSize}
          total={list.total}
          onPageChange={list.setPage}
        />
      </div>
    </div>
  );
}

function RefundsPanel() {
  const [paymentId, setPaymentId] = useState("");
  const [reason, setReason] = useState("");
  const mutate = useMutation({
    mutationFn: () => {
      if (!paymentId.trim()) throw new Error("Payment id is required");
      return refundWalletPayment({
        paymentId: paymentId.trim(),
        reason: reason.trim() || undefined,
      });
    },
    onSuccess: (result: any) => {
      toast.success(result?.idempotent ? "Idempotent refund replayed" : "Wallet payment refunded");
      setPaymentId("");
      setReason("");
    },
    onError: (err: Error) => toast.error(err.message || "Refund failed"),
  });

  return (
    <div className="max-w-xl space-y-4">
      <p className="text-sm text-muted-foreground">
        Refund a wallet-funded payment back to the buyer organization wallet.
      </p>
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-4">
        <div>
          <FieldLabel required className="text-muted-foreground">Payment ID</FieldLabel>
          <Input
            value={paymentId}
            onChange={(e) => setPaymentId(e.target.value)}
            className="mt-1 font-mono text-xs"
            placeholder="UUID of the payment"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Reason</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1"
            rows={3}
            placeholder="Optional refund reason"
          />
        </div>
        <div className="flex justify-end">
          <Button disabled={mutate.isPending} onClick={() => mutate.mutate()}>
            {mutate.isPending ? "Refunding…" : "Refund to wallet"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function WalletsManagement({ embedded = false }: { embedded?: boolean }) {
  const [tab, setTab] = useState<WalletInnerTab>("balances");

  return (
    <div className={cn(embedded ? "space-y-6" : "p-6 lg:p-8 space-y-6")}>
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-xl border border-border bg-card shadow-soft grid place-items-center shrink-0">
          <Wallet className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-semibold tracking-tight">Wallet Management</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Restaurant wallets only — review ledgers and credit or debit balances
            (idempotent when a key is provided).
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as WalletInnerTab)} className="space-y-6">
        <TabsList>
          <TabsTrigger value="balances">
            <List />
            Balances
          </TabsTrigger>
          <TabsTrigger value="credit-requests">
            <FileText />
            Credit requests
          </TabsTrigger>
          <TabsTrigger value="withdrawals">
            <Landmark />
            Withdrawals
          </TabsTrigger>
          <TabsTrigger value="refunds">
            <RefreshCw />
            Refunds
          </TabsTrigger>
          <TabsTrigger value="platform">
            <Landmark />
            Platform wallet
          </TabsTrigger>
        </TabsList>

        <TabsContent value="balances" className="mt-0">
          <BalancesPanel orgTypeFilter="restaurant" />
        </TabsContent>
        <TabsContent value="credit-requests" className="mt-0">
          <CreditRequestsPanel />
        </TabsContent>
        <TabsContent value="withdrawals" className="mt-0">
          <WithdrawalsPanel />
        </TabsContent>
        <TabsContent value="refunds" className="mt-0">
          <RefundsPanel />
        </TabsContent>
        <TabsContent value="platform" className="mt-0">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Full platform wallet register — restaurants, suppliers, and other org types.
            </p>
            <BalancesPanel orgTypeFilter="all" />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function WalletsPage() {
  return <WalletsManagement />;
}
