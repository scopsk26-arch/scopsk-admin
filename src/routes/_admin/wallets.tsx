import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Wallet, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AED, StatusBadge } from "@/components/admin/DataPage";
import { SearchableSelect } from "@/components/admin/SearchableSelect";
import { useAdminLookups } from "@/hooks/useAdminLookups";
import {
  EMPTY_LIST,
  creditOrgWallet,
  debitOrgWallet,
  fetchAdminWallets,
  fetchOrgWallet,
  fetchOrgWalletTransactions,
  type AdminWalletRow,
  type WalletTransactionRow,
} from "@/lib/api/resources";
import { num, str } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/wallets")({
  head: () => ({ meta: [{ title: "Wallet Management — ResPy" }] }),
  component: WalletsPage,
});

const TX_TONES: Record<string, "success" | "destructive" | "warning" | "info"> = {
  credit: "success",
  debit: "destructive",
  hold: "warning",
  release: "info",
};

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

function WalletsPage() {
  const qc = useQueryClient();
  const { restaurants, suppliers } = useAdminLookups(["restaurants", "suppliers"]);
  const [orgId, setOrgId] = useState("");
  const [orgTypeFilter, setOrgTypeFilter] = useState("all");
  const [walletQuery, setWalletQuery] = useState("");
  const [action, setAction] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");

  const orgOptions = useMemo(
    () => [
      ...restaurants.map((o) => ({ ...o, label: `${o.label} (restaurant)` })),
      ...suppliers.map((o) => ({ ...o, label: `${o.label} (supplier)` })),
    ],
    [restaurants, suppliers],
  );

  const {
    data: wallets = EMPTY_LIST as AdminWalletRow[],
    isLoading: walletsLoading,
    isError: walletsError,
  } = useQuery({
    queryKey: ["admin", "wallets", orgTypeFilter],
    queryFn: () => fetchAdminWallets(orgTypeFilter === "all" ? undefined : { type: orgTypeFilter }),
  });

  const filteredWallets = useMemo(() => {
    const needle = walletQuery.trim().toLowerCase();
    if (!needle) return wallets;
    return wallets.filter((w: AdminWalletRow) =>
      [w.organization, w.publicCode, w.referralCode, w.orgType, w.status].some((v) =>
        String(v).toLowerCase().includes(needle),
      ),
    );
  }, [wallets, walletQuery]);

  const totals = useMemo(() => {
    let available = 0;
    let pending = 0;
    let frozen = 0;
    for (const w of wallets as AdminWalletRow[]) {
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

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-xl border border-border bg-card shadow-soft grid place-items-center shrink-0">
          <Wallet className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-semibold tracking-tight">Wallet Management</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Browse every organization wallet, review its ledger, and credit or debit balances
            (idempotent when a key is provided).
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Wallets" value={String(wallets.length)} />
        <Kpi label="Total available" value={AED(totals.available)} tone="success" />
        <Kpi label="Total pending" value={AED(totals.pending)} tone="info" />
        <Kpi label="Not active" value={String(totals.frozen)} tone="warning" />
      </div>

      <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
        <div className="p-4 flex flex-wrap items-center gap-2 border-b border-border bg-muted/20">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={walletQuery}
              onChange={(e) => setWalletQuery(e.target.value)}
              placeholder="Search organization, code…"
              className="pl-9 h-9 bg-card"
            />
          </div>
          <Select value={orgTypeFilter} onValueChange={setOrgTypeFilter}>
            <SelectTrigger className="w-[190px] h-9">
              <SelectValue placeholder="All organizations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All organizations</SelectItem>
              <SelectItem value="restaurant">Restaurants</SelectItem>
              <SelectItem value="supplier">Suppliers</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                {["Organization", "Type", "Code", "Available", "Pending", "Currency", "Status", "Updated"].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold text-[10px] uppercase tracking-[0.14em] text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredWallets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-14 text-center">
                    <div className="text-sm font-medium text-foreground">No wallets</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {walletsLoading
                        ? "Loading wallets…"
                        : walletsError
                          ? "Failed to load wallets."
                          : walletQuery
                            ? "No wallets match your search."
                            : "Wallets appear once an organization transacts on ResPy."}
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

        <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
          Showing {filteredWallets.length} of {wallets.length} wallets · select a row to view its ledger
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Organization</Label>
            <div className="mt-1">
              <SearchableSelect
                options={orgOptions}
                value={orgId}
                onChange={setOrgId}
                placeholder="Search restaurants or suppliers…"
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
              <div className="sm:col-span-2 text-xs text-muted-foreground">
                Currency {str(wallet?.currency, "AED")} · Status {str(wallet?.status, "—")} · Used credit{" "}
                {AED(num(wallet?.usedCredit))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-4">
          <h2 className="font-display font-semibold">Adjust balance</h2>
          <div>
            <Label className="text-xs text-muted-foreground">Action</Label>
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
            <Label className="text-xs text-muted-foreground">Amount (AED)</Label>
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
                  <th key={h} className="px-4 py-3 font-semibold text-[10px] uppercase tracking-[0.14em] text-muted-foreground whitespace-nowrap">
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
