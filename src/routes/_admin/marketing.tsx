import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { Megaphone } from "lucide-react";
import { fetchList } from "@/lib/api/resources";
import { num, str } from "@/lib/api/client";

export const Route = createFileRoute("/_admin/marketing")({
  head: () => ({ meta: [{ title: "Marketing — Prime Plate" }] }),
  component: MarketingPage,
});

function MarketingPage() {
  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["marketing"],
    queryFn: async () => {
      const list = await fetchList("/marketing");
      return list.map((r: any) => ({
        id: str(r.id),
        name: str(r.name ?? r.title, "—"),
        channel: str(r.channel, "—"),
        audience: str(r.audience ?? r.segment, "—"),
        sent: num(r.sent ?? r.stats?.sent),
        opens: num(r.opens ?? r.stats?.opens),
        clicks: num(r.clicks ?? r.stats?.clicks),
        conv: num(r.conversions ?? r.stats?.conversions ?? r.conv),
        status: str(r.status, "draft"),
      }));
    },
  });

  const active = rows.filter((r) => r.status === "active").length;

  return (
    <DataPage
      title="Marketing"
      description="Campaigns across email, SMS, push and in-app with conversion analytics."
      icon={<Megaphone className="h-5 w-5 text-primary" />}
      kpis={[
        { label: "Active campaigns", value: String(active), tone: "info" },
        { label: "Reach", value: String(rows.reduce((s, r) => s + r.sent, 0)) },
        { label: "Opens", value: String(rows.reduce((s, r) => s + r.opens, 0)), tone: "success" },
        { label: "Conversions", value: String(rows.reduce((s, r) => s + r.conv, 0)), tone: "success" },
      ]}
      rows={rows}
      searchKeys={["id", "name", "channel", "audience"]}
      emptyHint={isLoading ? "Loading…" : isError ? "Failed to load campaigns." : "No campaigns found."}
      columns={[
        { key: "id", label: "ID", className: "font-mono text-xs", render: (r) => String(r.id).slice(0, 8) },
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
  );
}
