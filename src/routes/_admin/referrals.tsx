import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Share2 } from "lucide-react";
import {
  DataPage, DetailKv, DetailSection, DetailTable, StatusBadge, AED,
} from "@/components/admin/DataPage";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { EMPTY_LIST, fetchAdminReferral, fetchAdminReferrals } from "@/lib/api/resources";
import { num, str } from "@/lib/api/client";

export const Route = createFileRoute("/_admin/referrals")({
  head: () => ({ meta: [{ title: "Referrals — ResPy" }] }),
  component: ReferralsPage,
});

const STATUSES = ["pending", "qualified", "rewarded", "expired", "cancelled"] as const;

function Code({ value }: { value: string }) {
  const v = String(value || "—");
  return <span className="font-mono text-xs whitespace-nowrap">{v}</span>;
}

function RewardCard({ title, reward }: { title: string; reward: any }) {
  if (!reward) {
    return (
      <DetailSection title={title}>
        <p className="text-sm text-muted-foreground">Not issued yet.</p>
      </DetailSection>
    );
  }
  return (
    <DetailSection title={title}>
      <DetailKv
        rows={[
          { label: "Amount", value: AED(num(reward.amount)) },
          { label: "Status", value: <StatusBadge status={str(reward.status, "pending")} /> },
          { label: "Type", value: str(reward.type) },
          { label: "Source", value: str(reward.source) },
          {
            label: "Credited to wallet",
            value: reward.walletTransactionId ? "Yes" : "No",
          },
          {
            label: "Expires",
            value: reward.expiresAt ? String(reward.expiresAt).slice(0, 10) : "Never",
          },
        ]}
      />
    </DetailSection>
  );
}

function ReferralsPage() {
  const [status, setStatus] = useState("all");

  const { data: rows = EMPTY_LIST, isLoading, isError } = useQuery({
    queryKey: ["admin", "referrals", status],
    queryFn: () => fetchAdminReferrals(status === "all" ? undefined : { status }),
  });

  const count = (s: string) => rows.filter((r: any) => r.status === s).length;

  return (
    <DataPage
      title="Referrals"
      description="Restaurant-to-restaurant referrals: who invited whom, qualification progress and reward payouts."
      icon={<Share2 className="h-5 w-5 text-primary" />}
      disableCrud
      entityName="Referral"
      kpis={[
        { label: "Total", value: String(rows.length) },
        { label: "Pending", value: String(count("pending")), tone: "warning" },
        { label: "Qualified", value: String(count("qualified")), tone: "info" },
        { label: "Rewarded", value: String(count("rewarded")), tone: "success" },
      ]}
      rows={rows}
      idKey="id"
      searchKeys={["referralCode", "referrer", "referred", "referrerCode", "referredCode", "status"]}
      emptyHint={
        isLoading
          ? "Loading referrals…"
          : isError
            ? "Failed to load referrals."
            : status === "all"
              ? "No referrals yet — they appear once a restaurant signs up with a referral code."
              : `No referrals with status "${status}".`
      }
      filters={
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
      columns={[
        { key: "referralCode", label: "Code", className: "whitespace-nowrap", render: (r) => <Code value={r.referralCode} /> },
        { key: "referrer", label: "Referrer", className: "whitespace-nowrap", render: (r) => <span className="font-medium">{r.referrer}</span> },
        { key: "referred", label: "Referred", className: "whitespace-nowrap", render: (r) => <span className="font-medium">{r.referred}</span> },
        {
          key: "qualifyingAmount",
          label: "Qualifying order",
          className: "whitespace-nowrap",
          render: (r) => (num(r.qualifyingAmount) > 0 ? AED(r.qualifyingAmount) : "—"),
        },
        { key: "rewardedAt", label: "Rewarded at", className: "whitespace-nowrap" },
        { key: "created", label: "Created", className: "whitespace-nowrap" },
        { key: "status", label: "Status", className: "whitespace-nowrap", render: (r) => <StatusBadge status={r.status} /> },
      ]}
      viewFields={[
        { key: "referralCode", label: "Referral code" },
        { key: "status", label: "Status" },
        { key: "referrer", label: "Referrer" },
        { key: "referrerCode", label: "Referrer code" },
        { key: "referred", label: "Referred org" },
        { key: "referredCode", label: "Referred code" },
        { key: "referredOrgStatus", label: "Referred org status" },
        { key: "qualificationEvent", label: "Qualification event" },
        { key: "qualifyingAmount", label: "Qualifying order value" },
        { key: "qualifyingPurchaseOrderId", label: "Qualifying PO" },
        { key: "rewardedAt", label: "Rewarded at" },
        { key: "created", label: "Created" },
      ]}
      loadDetail={async (row) => {
        try {
          return await fetchAdminReferral(String(row.id));
        } catch {
          return { ...row, qualifyingPurchaseOrderId: "—" };
        }
      }}
      renderView={(detail) => {
        const meta = detail?.metadata;
        const metaRows = meta && typeof meta === "object" && !Array.isArray(meta)
          ? Object.entries(meta as Record<string, unknown>).map(([k, v]) => ({
              key: k,
              field: k,
              value: v == null || typeof v === "object" ? JSON.stringify(v ?? null) : String(v),
            }))
          : [];
        return (
          <>
            <RewardCard title="Referrer reward" reward={detail?.referrerReward} />
            <RewardCard title="Referred reward" reward={detail?.referredReward} />
            {metaRows.length > 0 && (
              <DetailSection title="Attribution metadata">
                <DetailTable
                  columns={[
                    { key: "field", label: "Field", className: "whitespace-nowrap" },
                    { key: "value", label: "Value" },
                  ]}
                  rows={metaRows}
                />
              </DetailSection>
            )}
          </>
        );
      }}
      exportExcludeKeys={["referrerReward", "referredReward", "metadata"]}
    />
  );
}
