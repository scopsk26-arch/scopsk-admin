import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DataPage, StatusBadge, AED } from "@/components/admin/DataPage";
import { BadgeCheck } from "lucide-react";
import { fetchList } from "@/lib/api/resources";
import { num, str } from "@/lib/api/client";

export const Route = createFileRoute("/_admin/subscriptions")({
  head: () => ({ meta: [{ title: "Subscriptions — Prime Plate" }] }),
  component: SubscriptionsPage,
});

function SubscriptionsPage() {
  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["subscriptions"],
    queryFn: async () => {
      const list = await fetchList("/subscriptions");
      return list.map((r: any) => ({
        id: str(r.id),
        customer: str(r.organization?.name ?? r.customerName ?? r.organizationId, "—"),
        plan: str(r.plan?.name ?? r.planName ?? r.plan, "—"),
        mrr: num(r.mrr ?? r.amount ?? r.price),
        renews: r.renewsAt ? String(r.renewsAt).slice(0, 10) : r.currentPeriodEnd ? String(r.currentPeriodEnd).slice(0, 10) : "—",
        status: str(r.status, "active"),
      }));
    },
  });

  const active = rows.filter((r) => r.status === "active").length;
  const mrr = rows.filter((r) => r.status === "active").reduce((s, r) => s + r.mrr, 0);

  return (
    <DataPage
      title="Subscriptions"
      description="Plans, billing cycles and MRR for restaurants and suppliers."
      icon={<BadgeCheck className="h-5 w-5 text-primary" />}
      kpis={[
        { label: "Active subs", value: String(active), tone: "success" },
        { label: "MRR", value: AED(mrr), tone: "info" },
        { label: "Trials", value: String(rows.filter((r) => /trial/i.test(r.plan) || r.status === "trialing").length) },
        { label: "Total", value: String(rows.length), tone: "warning" },
      ]}
      rows={rows}
      searchKeys={["id", "customer", "plan"]}
      emptyHint={isLoading ? "Loading…" : isError ? "Failed to load subscriptions." : "No subscriptions found."}
      columns={[
        { key: "id", label: "Sub", className: "font-mono text-xs", render: (r) => String(r.id).slice(0, 8) },
        { key: "customer", label: "Customer", render: (r) => <span className="font-medium">{r.customer}</span> },
        { key: "plan", label: "Plan" },
        { key: "mrr", label: "MRR", render: (r) => AED(r.mrr) },
        { key: "renews", label: "Renews" },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  );
}
