import { createFileRoute } from "@tanstack/react-router";
import { DataPage, StatusBadge, AED } from "@/components/admin/DataPage";
import { subscriptions } from "@/lib/mock-data-extra";
import { BadgeCheck } from "lucide-react";

export const Route = createFileRoute("/_admin/subscriptions")({
  head: () => ({ meta: [{ title: "Subscriptions — Prime Plate" }] }),
  component: () => (
    <DataPage
      title="Subscriptions"
      description="Plans, billing cycles and MRR for restaurants and suppliers."
      icon={<BadgeCheck className="h-5 w-5 text-primary" />}
      kpis={[
        { label: "Active subs", value: "612", tone: "success" },
        { label: "MRR", value: AED(184_200), tone: "info" },
        { label: "Trials", value: "42" },
        { label: "Churn (30d)", value: "2.1%", tone: "warning" },
      ]}
      rows={subscriptions}
      searchKeys={["id", "customer", "plan"]}
      columns={[
        { key: "id", label: "Sub", className: "font-mono text-xs" },
        { key: "customer", label: "Customer", render: (r) => <span className="font-medium">{r.customer}</span> },
        { key: "plan", label: "Plan" },
        { key: "mrr", label: "MRR", render: (r) => AED(r.mrr) },
        { key: "renews", label: "Renews" },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  ),
});
