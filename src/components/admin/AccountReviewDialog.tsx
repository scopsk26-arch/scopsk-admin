import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { AED, StatusBadge } from "@/components/admin/DataPage";
import { api } from "@/lib/api/client";
import {
  acceptWalletCreditRequest,
  fetchAdminWalletCreditRequests,
  fetchOrganizationDetail,
  mapOrgRow,
  rejectWalletCreditRequest,
  updateOrgSettings,
  updateOrganization,
  type WalletCreditRequestRow,
} from "@/lib/api/resources";

const OPEN_KYC = new Set(["pending", "draft", "submitted", "under_review", "resubmit", "review"]);

export type AccountReviewRow = {
  id: string;
  name?: string;
  email?: string;
  type?: string;
  status?: string;
  verificationStatus?: string;
  kycApplication?: { id?: string; status?: string } | null;
  documentCount?: number;
  requestedCreditLimit?: number;
  creditLimit?: number;
  creditRequestStatus?: string;
  paymentTermsDays?: number;
  purchasingTerms?: string;
  sellingTerms?: string;
  openCredit?: boolean;
};

type Snapshot = {
  id: string;
  name: string;
  email: string;
  type: "restaurant" | "supplier";
  status: string;
  verificationStatus: string;
  kycApplicationId: string;
  kycApplicationStatus: string;
  documentCount: number;
  requestedCreditLimit: number;
  creditLimit: number;
  creditRequestStatus: string;
  paymentTermsDays: number;
  purchasingTerms: string;
  sellingTerms: string;
  ticket: WalletCreditRequestRow | null;
};

function errMsg(err: unknown) {
  return err instanceof Error && err.message ? err.message : "Something went wrong. Try again.";
}

export function kycDecision(row: {
  verificationStatus?: string;
  kycApplication?: { status?: string } | null;
}): "pending" | "approved" | "rejected" {
  const verification = String(row.verificationStatus || "").toLowerCase();
  const app = String(row.kycApplication?.status || "").toLowerCase();
  if (verification === "verified" || verification === "approved") return "approved";
  if (verification === "rejected") return "rejected";
  if (app === "approved") return "approved";
  if (app === "rejected") return "rejected";
  return "pending";
}

function selectedCredit(row: {
  type?: string;
  purchasingTerms?: string;
  sellingTerms?: string;
  paymentTermsDays?: number;
  requestedCreditLimit?: number;
  openCredit?: boolean;
  ticket?: { id?: string } | null;
}) {
  const terms =
    String(row.type || "") === "supplier"
      ? row.sellingTerms || row.purchasingTerms
      : row.purchasingTerms || row.sellingTerms;
  const key = String(terms || "").toLowerCase();
  if (key === "cash_only") return false;
  if (key === "credit_only" || key === "cash_or_credit") return true;
  if ((Number(row.paymentTermsDays) || 0) > 0) return true;
  if ((Number(row.requestedCreditLimit) || 0) > 0) return true;
  return Boolean(row.openCredit || row.ticket);
}

function creditIsOpen(ticket: { status?: string } | null | undefined) {
  const status = String(ticket?.status || "").toLowerCase();
  return Boolean(ticket) && status !== "resolved" && status !== "closed";
}

export function hasPendingCredit(row: AccountReviewRow, ticket?: WalletCreditRequestRow | null) {
  if (!selectedCredit(row)) return false;
  if (row.openCredit || creditIsOpen(ticket)) return true;
  if (String(row.type) === "supplier") return false;
  const requested = Number(row.requestedCreditLimit) || 0;
  const live = Number(row.creditLimit) || 0;
  const decision = String(row.creditRequestStatus || "").toLowerCase();
  return requested > 0 && live <= 0 && decision !== "approved" && decision !== "rejected";
}

export function accountWaitingOn(row: AccountReviewRow): string {
  const kyc = kycDecision(row);
  const status = String(row.status || "").toLowerCase();
  if (kyc === "pending") return "KYC";
  if (kyc === "rejected" || status === "rejected") return "Closed";
  if (status === "pending") return "Account";
  if (hasPendingCredit(row)) return "Credit request";
  if (status === "suspended") return "Suspended";
  return "Done";
}

function creditPhase(snap: Snapshot): "none" | "pending" | "approved" | "rejected" {
  if (!selectedCredit(snap)) return "none";
  const ticketStatus = String(snap.ticket?.status || "").toLowerCase();
  if (snap.ticket) {
    if (ticketStatus === "resolved") return "approved";
    if (ticketStatus === "closed") return "rejected";
    return "pending";
  }
  if (snap.type === "supplier") return "none";
  const decision = snap.creditRequestStatus.toLowerCase();
  if (decision === "approved" || (snap.requestedCreditLimit > 0 && snap.creditLimit > 0)) return "approved";
  if (decision === "rejected") return "rejected";
  if (snap.requestedCreditLimit > 0 && snap.creditLimit <= 0) return "pending";
  return "none";
}

async function loadSnapshot(id: string, fallbackType: "restaurant" | "supplier"): Promise<Snapshot> {
  const detail = await fetchOrganizationDetail(id);
  const type = detail?.type === "supplier" || detail?.type === "restaurant" ? detail.type : fallbackType;
  const row = mapOrgRow(detail, type);
  let ticket: WalletCreditRequestRow | null = null;
  try {
    const page = await fetchAdminWalletCreditRequests({
      organizationId: id,
      category: "credit_limit",
      limit: 100,
    });
    const mine = page.rows.filter(
      (item) => item.kind === "credit_limit" && (!item.organizationId || item.organizationId === id),
    );
    ticket = mine.find((item) => creditIsOpen(item)) ?? mine[0] ?? null;
  } catch {
    ticket = null;
  }
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    type,
    status: String(row.status || "pending"),
    verificationStatus: String(row.verificationStatus || ""),
    kycApplicationId: String(row.kycApplication?.id || ""),
    kycApplicationStatus: String(row.kycApplication?.status || ""),
    documentCount: Number(row.documentCount) || 0,
    requestedCreditLimit: Number(row.requestedCreditLimit) || 0,
    creditLimit: Number(row.creditLimit) || 0,
    creditRequestStatus: String(row.creditRequestStatus || ""),
    paymentTermsDays: Number(row.paymentTermsDays) || 0,
    purchasingTerms: String(row.purchasingTerms || ""),
    sellingTerms: String(row.sellingTerms || ""),
    ticket,
  };
}

function Step({
  index,
  title,
  state,
  summary,
  children,
}: {
  index: number;
  title: string;
  state: "current" | "done" | "locked";
  summary: string;
  children?: React.ReactNode;
}) {
  return (
    <section
      className={
        state === "current"
          ? "rounded-xl border border-primary/40 bg-primary/[0.04] p-4"
          : "rounded-xl border border-border bg-muted/30 p-4"
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">
            <span className="mr-2 text-muted-foreground">{index}.</span>
            {title}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{summary}</p>
        </div>
        <StatusBadge
          status={state === "current" ? "Pending" : state === "done" ? "Done" : "Waiting"}
        />
      </div>
      {children ? <div className="mt-3 space-y-3">{children}</div> : null}
    </section>
  );
}

export function AccountReviewDialog({
  row,
  open,
  onOpenChange,
  onUpdated,
}: {
  row: AccountReviewRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}) {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [kycReason, setKycReason] = useState("");
  const [suspendReason, setSuspendReason] = useState("");
  const [creditReason, setCreditReason] = useState("");

  useEffect(() => {
    if (!open || !row?.id) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    setKycReason("");
    setSuspendReason("");
    setCreditReason("");
    const fallback = row.type === "supplier" ? "supplier" : "restaurant";
    loadSnapshot(row.id, fallback)
      .then((next) => {
        if (!cancelled) setSnap(next);
      })
      .catch((err) => {
        if (!cancelled) setError(errMsg(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, row?.id, row?.type]);

  const refresh = async (id: string, type: "restaurant" | "supplier") => {
    const next = await loadSnapshot(id, type);
    setSnap(next);
    onUpdated();
    return next;
  };

  const run = async (key: string, work: () => Promise<void>) => {
    setBusy(key);
    setError("");
    try {
      await work();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(null);
    }
  };

  const kyc = snap
    ? kycDecision({
        verificationStatus: snap.verificationStatus,
        kycApplication: { status: snap.kycApplicationStatus },
      })
    : "pending";
  const accountStatus = String(snap?.status || "").toLowerCase();
  const accountOpen = accountStatus === "active" || accountStatus === "suspended";
  const showCredit = snap ? selectedCredit(snap) : false;
  const credit = snap && showCredit ? creditPhase(snap) : "none";
  const kycOpen = OPEN_KYC.has(snap?.kycApplicationStatus.toLowerCase() || "");
  const canApproveKyc = Boolean(snap?.kycApplicationId) && kycOpen && (snap?.documentCount || 0) > 0;
  const askedAmount = snap?.ticket?.amount || snap?.requestedCreditLimit || 0;

  const waiting = !snap
    ? ""
    : kyc === "pending"
      ? "KYC is waiting for a decision. The account stays closed until you approve it."
      : kyc === "rejected" || accountStatus === "rejected"
        ? "KYC was rejected, so this account is closed."
        : accountStatus === "pending"
          ? "KYC is approved. Open the account to continue."
          : credit === "pending"
            ? accountStatus === "suspended"
              ? "The account is suspended. You can still approve or reject the credit request, or activate the account again."
              : "The account is active. Approve or reject the credit request. You can suspend the account if you need to."
            : accountStatus === "suspended"
              ? "The account is suspended. Activate it when it should work again."
              : "Nothing else is waiting on this account.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review {snap?.name || row?.name || "account"}</DialogTitle>
          <DialogDescription>
            {[snap?.type === "supplier" ? "Supplier" : "Restaurant", snap?.email || row?.email]
              .filter(Boolean)
              .join(" · ")}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading this account…</p>
        ) : !snap ? (
          <p className="text-sm text-destructive">{error || "Could not load this account."}</p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm">{waiting}</p>

            <Step
              index={1}
              title="KYC"
              state={kyc === "pending" ? "current" : "done"}
              summary={
                kyc === "approved"
                  ? "KYC is approved. The account can be active."
                  : kyc === "rejected"
                    ? "KYC is rejected. The account stays closed."
                    : snap.documentCount > 0
                      ? `${snap.documentCount} document${snap.documentCount === 1 ? "" : "s"} uploaded. Approving KYC opens the account. Rejecting KYC closes it.`
                      : "No KYC documents uploaded yet. You can reject the account, or wait for the documents."
              }
            >
              <StatusBadge status={kyc === "approved" ? "verified" : kyc === "rejected" ? "rejected" : "pending"} />
              {kyc === "pending" ? (
                <>
                  <Textarea
                    value={kycReason}
                    onChange={(event) => setKycReason(event.target.value)}
                    placeholder="Reason, required if you reject"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={!canApproveKyc || busy !== null}
                      onClick={() =>
                        void run("kyc-approve", async () => {
                          await api.post(`/kyc/applications/${snap.kycApplicationId}/approve`, {
                            notes: kycReason.trim() || undefined,
                          });
                          let next = await refresh(snap.id, snap.type);
                          if (String(next.status).toLowerCase() === "pending") {
                            await api.post(`/organizations/${snap.id}/activate`, {});
                            next = await refresh(snap.id, snap.type);
                          }
                          toast.success(
                            String(next.status).toLowerCase() === "active"
                              ? "KYC approved. The account is now active."
                              : "KYC approved.",
                          );
                        })
                      }
                    >
                      Approve KYC
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={busy !== null}
                      onClick={() =>
                        void run("kyc-reject", async () => {
                          const reason = kycReason.trim();
                          if (!reason) throw new Error("A reason is required to reject KYC.");
                          if (snap.kycApplicationId && kycOpen) {
                            await api.post(`/kyc/applications/${snap.kycApplicationId}/reject`, { notes: reason });
                          }
                          if (String(snap.status).toLowerCase() !== "rejected") {
                            await api.post(`/organizations/${snap.id}/reject`, { reason });
                          }
                          await refresh(snap.id, snap.type);
                          toast.success("KYC rejected. The account is closed.");
                        })
                      }
                    >
                      Reject KYC
                    </Button>
                  </div>
                </>
              ) : null}
            </Step>

            <Step
              index={2}
              title="Account"
              state={kyc !== "approved" ? "locked" : accountStatus === "pending" ? "current" : "done"}
              summary={
                kyc !== "approved"
                  ? "This stays closed until KYC is approved."
                  : accountStatus === "active"
                    ? "The account is active. Suspend it only if it should stop working."
                    : accountStatus === "suspended"
                      ? "The account is suspended. Activate it to let them work again."
                      : accountStatus === "rejected"
                        ? "The account is closed."
                        : "KYC is approved. Open the account."
              }
            >
              <StatusBadge status={snap.status || "pending"} />
              {kyc === "approved" && accountStatus === "pending" ? (
                <Button
                  disabled={busy !== null}
                  onClick={() =>
                    void run("activate", async () => {
                      await api.post(`/organizations/${snap.id}/activate`, {});
                      await refresh(snap.id, snap.type);
                      toast.success("Account is now active.");
                    })
                  }
                >
                  Open account
                </Button>
              ) : null}
              {kyc === "approved" && accountStatus === "active" ? (
                <>
                  <Textarea
                    value={suspendReason}
                    onChange={(event) => setSuspendReason(event.target.value)}
                    placeholder="Reason for suspending, optional"
                  />
                  <Button
                    variant="outline"
                    disabled={busy !== null}
                    onClick={() =>
                      void run("suspend", async () => {
                        await api.post(`/organizations/${snap.id}/deactivate`, {
                          reason: suspendReason.trim() || undefined,
                        });
                        await refresh(snap.id, snap.type);
                        toast.success("Account suspended.");
                      })
                    }
                  >
                    Suspend account
                  </Button>
                </>
              ) : null}
              {kyc === "approved" && accountStatus === "suspended" ? (
                <Button
                  disabled={busy !== null}
                  onClick={() =>
                    void run("activate", async () => {
                      await api.post(`/organizations/${snap.id}/activate`, {});
                      await refresh(snap.id, snap.type);
                      toast.success("Account is active again.");
                    })
                  }
                >
                  Activate account
                </Button>
              ) : null}
            </Step>

            {showCredit ? (
            <Step
              index={3}
              title="Credit request"
              state={!accountOpen || kyc !== "approved" ? "locked" : credit === "pending" ? "current" : "done"}
              summary={
                kyc !== "approved" || !accountOpen
                  ? "Available after KYC is approved and the account is open."
                  : credit === "none"
                    ? "This account did not ask for credit."
                    : credit === "approved"
                      ? `Credit approved${snap.creditLimit > 0 ? ` · live limit ${AED(snap.creditLimit)}` : ""}.`
                      : credit === "rejected"
                        ? "Credit request was rejected."
                        : `They asked for ${AED(askedAmount)}${
                            snap.paymentTermsDays > 0 ? ` over ${snap.paymentTermsDays} days` : ""
                          }.`
              }
            >
              {accountOpen && kyc === "approved" && credit === "pending" ? (
                <>
                  <Textarea
                    value={creditReason}
                    onChange={(event) => setCreditReason(event.target.value)}
                    placeholder="Reason, optional if you reject"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={busy !== null || askedAmount <= 0}
                      onClick={() =>
                        void run("credit-approve", async () => {
                          if (snap.ticket && creditIsOpen(snap.ticket)) {
                            await acceptWalletCreditRequest(snap.ticket.id);
                          } else {
                            await updateOrgSettings(snap.id, { creditLimit: askedAmount });
                            await updateOrganization(
                              snap.id,
                              { creditRequestStatus: "approved" },
                              snap.type,
                            );
                          }
                          await refresh(snap.id, snap.type);
                          toast.success("Credit request approved.");
                        })
                      }
                    >
                      Approve credit
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={busy !== null}
                      onClick={() =>
                        void run("credit-reject", async () => {
                          if (snap.ticket && creditIsOpen(snap.ticket)) {
                            await rejectWalletCreditRequest(snap.ticket.id, creditReason);
                          } else {
                            await updateOrganization(
                              snap.id,
                              { creditRequestStatus: "rejected" },
                              snap.type,
                            );
                          }
                          await refresh(snap.id, snap.type);
                          toast.success("Credit request rejected.");
                        })
                      }
                    >
                      Reject credit
                    </Button>
                  </div>
                </>
              ) : null}
            </Step>
            ) : null}

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
