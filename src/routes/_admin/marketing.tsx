import { createFileRoute } from "@tanstack/react-router";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { marketingCampaigns } from "@/lib/mock-data-extra";
import { Megaphone } from "lucide-react";

export const Route = createFileRoute("/_admin/marketing")({
  head: () => ({ meta: [{ title: "Marketing — Prime Plate" }] }),
  component: () => (
    <DataPage
      title="Marketing"
      description="Campaigns across email, SMS, push and in-app with conversion analytics."
      icon={<Megaphone className="h-5 w-5 text-primary" />}
      kpis={[
        { label: "Active campaigns", value: "9", tone: "info" },
        { label: "Reach (30d)", value: "48,200" },
        { label: "Avg. open rate", value: "58%", tone: "success" },
        { label: "Conversions", value: "1,240", tone: "success" },
      ]}
      rows={marketingCampaigns}
      searchKeys={["id", "name", "channel", "audience"]}
      columns={[
        { key: "id", label: "ID", className: "font-mono text-xs" },
        { key: "name", label: "Campaign", render: (r) => <span className="font-medium">{r.name}</span> },
        { key: "channel", label: "Channel" },
        { key: "audience", label: "Audience" },
        { key: "sent", label: "Sent" },
        { key: "opens", label: "Opens" },
        { key: "clicks", label: "Clicks" },
        { key: "conv", label: "Conv." },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  ),
});
