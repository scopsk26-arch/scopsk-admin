import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Gift } from "lucide-react";
import { DataPage, StatusBadge, AED } from "@/components/admin/DataPage";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { EMPTY_LIST, fetchAdminRewards } from "@/lib/api/resources";
import { num } from "@/lib/api/client";

export const Route = createFileRoute("/_admin/rewards")({
  head: () => ({ meta: [{ title: "Rewards — ResPy" }] }),
  component: RewardsPage,
});

const STATUSES = ["pending", "credited", "cancelled", "expired"] as const;
const TYPES = ["REFERRAL", "PROMOTIONAL", "ADMIN", "LOYALTY"] as const;

function RewardsPage() {
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");

  const { data: rows = EMPTY_LIST, isLoading, isError } = useQuery({
    queryKey: ["admin", "rewards", status, type],
    queryFn: () =>
      fetchAdminRewards({
        status: status === "all" ? undefined : status,
        type: type === "all" ? undefined : type,
      }),
  });

  const totals = useMemo(() => {
    const sum = (s: string) =>
      rows.filter((r: any) => r.status === s).reduce((acc: number, r: any) => acc + num(r.amount), 0);
    return { credited: sum("credited"), pending: sum("pending"), expired: sum("expired") };
  }, [rows]);

  return (
    <DataPage
      title="Rewards"
      description="Read-only reward ledger — referral, promotional and admin credits issued to organization wallets."
      icon={<Gift className="h-5 w-5 text-primary" />}
      disableCrud
      entityName="Reward"
      kpis={[
        { label: "Credited", value: AED(totals.credited), tone: "success" },
        { label: "Pending", value: AED(totals.pending), tone: "warning" },
        { label: "Expired", value: AED(totals.expired), tone: "destructive" },
        { label: "Records", value: String(rows.length) },
      ]}
      rows={rows}
      idKey="id"
      searchKeys={["organization", "orgCode", "type", "source", "reference", "description", "status"]}
      emptyHint={
        isLoading
          ? "Loading rewards…"
          : isError
            ? "Failed to load rewards."
            : status === "all" && type === "all"
              ? "No rewards issued yet — referral payouts appear here once a referral qualifies."
              : "No rewards match the selected filters."
      }
      filters={
        <div className="flex flex-wrap items-center gap-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[170px] h-9">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-[170px] h-9">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
      columns={[
        { key: "organization", label: "Organization", className: "whitespace-nowrap", render: (r) => <span className="font-medium">{r.organization}</span> },
        { key: "type", label: "Type", className: "whitespace-nowrap" },
        { key: "source", label: "Source", className: "whitespace-nowrap" },
        { key: "amount", label: "Amount", className: "whitespace-nowrap", render: (r) => AED(r.amount) },
        {
          key: "reference",
          label: "Reference",
          className: "whitespace-nowrap",
          render: (r) => (
            <span className="font-mono text-xs inline-block max-w-[220px] truncate align-middle" title={String(r.reference)}>
              {String(r.reference)}
            </span>
          ),
        },
        { key: "expiresAt", label: "Expires", className: "whitespace-nowrap" },
        { key: "created", label: "Created", className: "whitespace-nowrap" },
        { key: "status", label: "Status", className: "whitespace-nowrap", render: (r) => <StatusBadge status={r.status} /> },
      ]}
      viewFields={[
        { key: "id", label: "Reward ID" },
        { key: "organization", label: "Organization" },
        { key: "orgCode", label: "Org code" },
        { key: "type", label: "Type" },
        { key: "source", label: "Source" },
        { key: "amount", label: "Amount" },
        { key: "currency", label: "Currency" },
        { key: "status", label: "Status" },
        { key: "reference", label: "Reference" },
        { key: "description", label: "Description" },
        { key: "expiresAt", label: "Expires" },
        { key: "created", label: "Created" },
      ]}
    />
  );
}
