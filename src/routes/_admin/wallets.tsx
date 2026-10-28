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
  CircleDollarSign,
  ArrowLeft,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  fetchAdminCreditFacilities,
  fetchAdminCreditFacility,
  fetchAdminWalletCreditRequests,
  fetchAdminWallets,
  fetchAdminWalletWithdrawals,
  fetchOrgWallet,
  fetchOrgWalletTransactions,
  refundWalletPayment,
  rejectWalletCreditRequest,
  rejectWalletWithdrawRequest,
  type AdminWalletRow,
  type CreditFacilityLoanRow,
  type CreditFacilityRow,
  type WalletCreditRequestRow,
  type WalletTransactionRow,
  type WalletWithdrawalRow,
} from "@/lib/api/resources";
import { num, str } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/wallets")({
  head: () => ({ meta: [{ title: "Wallets — ScopsK" }] }),
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
  | "wallet-requests"
  | "credit-facility"
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
      };
      return action === "credit" ? creditOrgWallet(orgId, body) : debitOrgWallet(orgId, body);
    },
    onSuccess: async () => {
      toast.success(action === "credit" ? "Cash added to the wallet" : "Cash removed from the wallet");
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
                {["Organization", "Code", "Available", "Pending", "Status", "Updated"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredWallets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center">
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
                    <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{w.publicCode}</td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">{AED(w.availableBalance)}</td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">{AED(w.pendingBalance ?? w.heldBalance)}</td>
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
                <div className="text-xs text-muted-foreground">Credit facility</div>
                <div className="text-lg font-semibold mt-0.5">{AED(num(wallet?.creditLimit))}</div>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">Available credit</div>
                <div className="text-lg font-semibold mt-0.5">{AED(num(wallet?.availableCredit))}</div>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-3 sm:col-span-2">
                <div className="text-xs text-muted-foreground">Used credit</div>
                <div className="text-lg font-semibold mt-0.5">{AED(num(wallet?.usedCredit))}</div>
              </div>
              <div className="sm:col-span-2 text-xs text-muted-foreground">
                Cash in this wallet is separate from the credit limit. Approve a credit request on the Credit requests tab to raise the limit.
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-4">
          <h2 className="font-display font-semibold">Add or remove cash</h2>
          <div>
            <FieldLabel required className="text-muted-foreground">Action</FieldLabel>
            <Select value={action} onValueChange={(v) => setAction(v as "credit" | "debit")}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="credit">Add cash</SelectItem>
                <SelectItem value="debit">Remove cash</SelectItem>
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
            <Label className="text-xs text-muted-foreground">Note</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
              placeholder="Why this cash is being added or removed"
              rows={3}
            />
          </div>
          <div className="flex justify-end">
            <Button
              disabled={!orgId || mutate.isPending}
              onClick={() => mutate.mutate()}
            >
              {mutate.isPending
                ? "Saving…"
                : action === "credit"
                  ? "Add cash"
                  : "Remove cash"}
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
                {["Date", "Type", "Amount", "Balance before", "Balance after", "Order", "Description", "Status"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center">
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
                      <StatusBadge
                        status={t.type === "credit" ? "Cash in" : t.type === "debit" ? "Cash out" : t.type}
                        tone={TX_TONES[t.type] ?? "default"}
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums font-medium">{AED(t.amount)}</td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums text-muted-foreground">
                      {t.balanceBefore == null ? "—" : AED(t.balanceBefore)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">{AED(t.balanceAfter)}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-xs">
                      {t.orderNumber || "—"}
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

function formatDecisionTime(value?: string | Date | null) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toLocaleString();
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DecisionResultDialog({
  result,
  onClose,
}: {
  result: { title: string; message: string; time: string } | null;
  onClose: () => void;
}) {
  return (
    <AlertDialog open={Boolean(result)} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{result?.title}</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">{result?.message}</span>
            {result?.time ? (
              <span className="block text-xs text-muted-foreground">{result.time}</span>
            ) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onClose}>Done</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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

function CreditRequestsPanel({ kind }: { kind: "credit_limit" | "wallet_topup" }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState("all");
  const [review, setReview] = useState<WalletCreditRequestRow | null>(null);
  const [reason, setReason] = useState("");
  const [decision, setDecision] = useState<{
    title: string;
    message: string;
    time: string;
  } | null>(null);
  const isCredit = kind === "credit_limit";
  const list = usePagedList<WalletCreditRequestRow>({
    queryKey: ["admin", "wallet-credit-requests", kind, status],
    path: "/admin/wallets/credit-requests",
    query: { category: kind, ...(status === "all" ? {} : { status }) },
    load: ({ page, pageSize, search }) =>
      fetchAdminWalletCreditRequests({
        category: kind,
        status: status === "all" ? undefined : status,
        search: search || undefined,
        page,
        limit: pageSize,
      }),
  });
  const rows = list.rows.filter((row) => row.kind === kind);

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
    mutationFn: (row: WalletCreditRequestRow) => acceptWalletCreditRequest(row.id),
    onSuccess: async (_data, row) => {
      const time = formatDecisionTime();
      const amount = row.amount > 0 ? AED(row.amount) : "";
      setDecision({
        title: isCredit ? "Credit request approved" : "Wallet request approved",
        message: isCredit
          ? `${row.organization}${amount ? ` · ${amount}` : ""} was approved. The limit shows under Credit limits. Cash in Accounts stays the same.`
          : `${row.organization}${amount ? ` · ${amount}` : ""} was approved. The cash shows under Accounts.`,
        time,
      });
      patchRequestStatus(row.id, "resolved");
      setReview(null);
      setReason("");
      await qc.invalidateQueries({ queryKey: ["admin", "wallets"] });
      await qc.invalidateQueries({ queryKey: ["admin", "credit-facilities"] });
    },
    onError: (err: Error) => toast.error(err.message || "Approve failed"),
  });

  const rejectM = useMutation({
    mutationFn: (row: WalletCreditRequestRow) => rejectWalletCreditRequest(row.id, reason),
    onSuccess: async (_data, row) => {
      const time = formatDecisionTime();
      const amount = row.amount > 0 ? AED(row.amount) : "";
      setDecision({
        title: isCredit ? "Credit request rejected" : "Wallet request rejected",
        message: `${row.organization}${amount ? ` · ${amount}` : ""} was not approved.`,
        time,
      });
      patchRequestStatus(row.id, "closed");
      setReview(null);
      setReason("");
      await qc.invalidateQueries({ queryKey: ["admin", "wallets"] });
    },
    onError: (err: Error) => toast.error(err.message || "Reject failed"),
  });

  const busy = acceptM.isPending || rejectM.isPending;
  const reviewOpen =
    review?.status === "open" || review?.status === "in_progress" || review?.status === "waiting";

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {isCredit
          ? "Credit requests raise the restaurant credit limit. They do not add cash to the wallet. After you approve one, the limit shows under Credit limits."
          : "Wallet requests add cash to the restaurant wallet. After you approve one, the amount shows under Accounts."}
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
                {["Organization", "Amount", "Subject", "Requester", "Status", "Created", ""].map((h) => (
                  <th key={h || "review"} className="px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center text-sm text-muted-foreground">
                    {list.isLoading
                      ? "Loading…"
                      : list.isError
                        ? "Failed to load requests."
                        : isCredit
                          ? "No credit requests."
                          : "No wallet requests."}
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-border last:border-0 cursor-pointer hover:bg-primary/[0.04]"
                    onClick={() => {
                      setReason("");
                      setReview(r);
                    }}
                  >
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{r.organization}</td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums font-medium">
                      {r.amount > 0 ? AED(r.amount) : "—"}
                    </td>
                    <td className="px-4 py-3 max-w-[240px] truncate" title={r.subject}>{r.subject}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{r.requester}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={walletRequestStatusLabel(r.status)} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{r.createdAt}</td>
                    <td className="px-4 py-3 whitespace-nowrap" onClick={(event) => event.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8"
                        onClick={() => {
                          setReason("");
                          setReview(r);
                        }}
                      >
                        Review
                      </Button>
                    </td>
                  </tr>
                ))
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

      <Dialog
        open={review !== null}
        onOpenChange={(open) => {
          if (!open) {
            setReview(null);
            setReason("");
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isCredit ? "Review credit request" : "Review wallet request"}
            </DialogTitle>
            <DialogDescription>
              {[review?.organization, review?.requester].filter((part) => part && part !== "—").join(" · ")}
            </DialogDescription>
          </DialogHeader>
          {review ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {reviewOpen
                  ? isCredit
                    ? "Approving raises the credit limit. It does not add cash to the wallet."
                    : "Approving adds this cash to the restaurant wallet."
                  : isCredit
                    ? "This credit request is already decided."
                    : "This wallet request is already decided."}
              </p>
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Amount</div>
                  <div className="mt-1 font-medium">{review.amount > 0 ? AED(review.amount) : "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Status</div>
                  <div className="mt-1">
                    <StatusBadge status={walletRequestStatusLabel(review.status)} />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <div className="text-xs text-muted-foreground">Subject</div>
                  <div className="mt-1">{review.subject}</div>
                </div>
              </div>
              {reviewOpen ? (
                <>
                  <Textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="Reason, optional if you reject"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button disabled={busy} onClick={() => acceptM.mutate(review)}>
                      {isCredit ? "Approve credit" : "Approve wallet"}
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={busy}
                      onClick={() => rejectM.mutate(review)}
                    >
                      {isCredit ? "Reject credit" : "Reject wallet"}
                    </Button>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      <DecisionResultDialog result={decision} onClose={() => setDecision(null)} />
    </div>
  );
}


function owingStatusLabel(status: CreditFacilityRow["owingStatus"]) {
  switch (status) {
    case "overdue":
      return "Overdue";
    case "owing":
      return "Owing";
    case "clear":
      return "Clear";
    default:
      return "—";
  }
}

function CreditFacilityPanel() {
  const [filter, setFilter] = useState("all");
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  const list = usePagedList<CreditFacilityRow>({
    queryKey: ["admin", "credit-facilities", filter],
    path: "/admin/wallets/credit-facilities",
    query: filter === "all" ? undefined : { filter },
    load: ({ page, pageSize, search }) =>
      fetchAdminCreditFacilities({
        filter: filter === "all" ? undefined : filter,
        search: search || undefined,
        page,
        limit: pageSize,
      }),
  });

  const detailQ = useQuery({
    queryKey: ["admin", "credit-facility", selectedOrgId],
    enabled: Boolean(selectedOrgId),
    queryFn: () => fetchAdminCreditFacility(selectedOrgId!),
  });

  const rows = list.rows;
  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => ({
        facility: acc.facility + r.facility,
        remaining: acc.remaining + r.remaining,
        paid: acc.paid + r.paid,
      }),
      { facility: 0, remaining: 0, paid: 0 },
    );
  }, [rows]);

  if (selectedOrgId) {
    const d = detailQ.data;
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => setSelectedOrgId(null)}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All restaurants
          </Button>
          <div className="min-w-0">
            <h2 className="font-display font-semibold truncate">
              {d?.organization.name || "Credit facility"}
            </h2>
            <p className="text-xs text-muted-foreground">
              Repayment invoices paid from the restaurant wallet
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Facility" value={AED(d?.facility ?? 0)} />
          <Kpi label="Invoiced" value={AED(d?.invoiced ?? 0)} />
          <Kpi label="Paid (wallet)" value={AED(d?.paid ?? 0)} tone="success" />
          <Kpi
            label="Remaining"
            value={AED(d?.remaining ?? 0)}
            tone={(d?.remaining ?? 0) > 0 ? "warning" : "success"}
          />
        </div>

        <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left">
                  {[
                    "Invoice",
                    "Ticket",
                    "Amount",
                    "Paid",
                    "Remaining",
                    "Status",
                    "Due",
                    "Created",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {detailQ.isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-14 text-center text-sm text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                ) : !d?.loans.length ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-14 text-center text-sm text-muted-foreground">
                      No repayment invoices yet for this restaurant.
                    </td>
                  </tr>
                ) : (
                  d.loans.map((loan: CreditFacilityLoanRow) => (
                    <tr key={loan.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                        {loan.number}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-muted-foreground">
                        {loan.ticketNumber || "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap tabular-nums font-medium">
                        {AED(loan.total)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                        {AED(loan.paid)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap tabular-nums font-medium">
                        {AED(loan.remaining)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={loan.status} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {loan.dueDate || "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {loan.createdAt}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        After you accept a credit request, the restaurant owes ScopsK via a repayment invoice. This
        tab shows facility size, how much they paid from wallet, and what is still remaining.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Facility (page)" value={AED(totals.facility)} />
        <Kpi label="Paid (page)" value={AED(totals.paid)} tone="success" />
        <Kpi
          label="Remaining (page)"
          value={AED(totals.remaining)}
          tone={totals.remaining > 0 ? "warning" : undefined}
        />
      </div>
      <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
        <div className="p-4 flex flex-wrap gap-2 border-b border-border bg-muted/20">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={list.search}
              onChange={(e) => list.setSearch(e.target.value)}
              placeholder="Search restaurant…"
              className="pl-9 h-9 bg-card"
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="h-9 w-[160px] bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="owing">Owing</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="clear">Clear</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                {[
                  "Restaurant",
                  "Facility",
                  "Invoiced",
                  "Paid (wallet)",
                  "Remaining",
                  "Open",
                  "Status",
                  "",
                ].map((h) => (
                  <th
                    key={h || "actions"}
                    className="px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center text-sm text-muted-foreground">
                    {list.isLoading
                      ? "Loading…"
                      : list.isError
                        ? "Failed to load credit facilities."
                        : "No credit facilities yet. Accept a credit request to start."}
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.organizationId} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium whitespace-nowrap">{r.organization}</div>
                      {r.publicCode ? (
                        <div className="text-xs text-muted-foreground font-mono">
                          {r.publicCode}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums font-medium">
                      {AED(r.facility)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      {AED(r.invoiced)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      {AED(r.paid)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums font-medium">
                      {AED(r.remaining)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {r.openCount}
                      {r.overdueCount > 0 ? (
                        <span className="text-destructive"> · {r.overdueCount} overdue</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={owingStatusLabel(r.owingStatus)} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8"
                        onClick={() => setSelectedOrgId(r.organizationId)}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))
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
  const [decision, setDecision] = useState<{
    title: string;
    message: string;
    time: string;
  } | null>(null);
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
    mutationFn: (row: WalletWithdrawalRow) => acceptWalletWithdrawRequest(row.requestId),
    onSuccess: async (_data, row) => {
      setDecision({
        title: "Withdraw accepted",
        message: `${row.organization} · ${AED(row.amount)} was debited from the wallet.`,
        time: formatDecisionTime(),
      });
      await qc.invalidateQueries({ queryKey: ["admin", "wallet-withdrawals"] });
      await qc.invalidateQueries({ queryKey: ["admin", "wallets"] });
    },
    onError: (err: Error) => toast.error(err.message || "Accept failed"),
  });

  const rejectM = useMutation({
    mutationFn: (row: WalletWithdrawalRow) => {
      const reason = window.prompt("Reject reason (optional)") ?? undefined;
      return rejectWalletWithdrawRequest(row.requestId, reason);
    },
    onSuccess: async (_data, row) => {
      setDecision({
        title: "Withdraw rejected",
        message: `${row.organization} · ${AED(row.amount)} hold was released.`,
        time: formatDecisionTime(),
      });
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
                              onClick={() => acceptM.mutate(r)}
                            >
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8"
                              disabled={busy}
                              onClick={() => rejectM.mutate(r)}
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
      <DecisionResultDialog result={decision} onClose={() => setDecision(null)} />
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
          <h1 className="text-2xl font-display font-semibold tracking-tight">Wallets</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Add or take money from restaurant wallets, and review credit and wallet requests.
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as WalletInnerTab)} className="space-y-6">
        <TabsList>
          <TabsTrigger value="balances">
            <List />
            Accounts
          </TabsTrigger>
          <TabsTrigger value="credit-requests">
            <FileText />
            Credit requests
          </TabsTrigger>
          <TabsTrigger value="wallet-requests">
            <Wallet />
            Wallet requests
          </TabsTrigger>
          <TabsTrigger value="credit-facility">
            <CircleDollarSign />
            Credit limits
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
            ScopsK account
          </TabsTrigger>
        </TabsList>

        <TabsContent value="balances" className="mt-0">
          <BalancesPanel orgTypeFilter="restaurant" />
        </TabsContent>
        <TabsContent value="credit-requests" className="mt-0">
          <CreditRequestsPanel kind="credit_limit" />
        </TabsContent>
        <TabsContent value="wallet-requests" className="mt-0">
          <CreditRequestsPanel kind="wallet_topup" />
        </TabsContent>
        <TabsContent value="credit-facility" className="mt-0">
          <CreditFacilityPanel />
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
