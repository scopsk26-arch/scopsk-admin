import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { GenericJsonDetailView } from "@/components/admin/DetailViews";
import { Megaphone } from "lucide-react";
import { fetchList } from "@/lib/api/resources";
import { api, num, str } from "@/lib/api/client";

export const Route = createFileRoute("/_admin/marketing")({
  head: () => ({ meta: [{ title: "Marketing — ResPy" }] }),
  component: MarketingPage,
});

function mapCampaign(r: any) {
  return {
    id: str(r.id),
    name: str(r.name ?? r.title, "—"),
    channel: str(r.channel, "—"),
    audience: typeof r.audience === "object" ? JSON.stringify(r.audience) : str(r.audience ?? r.segment, "—"),
    sent: num(r.sent ?? r.stats?.sent ?? r.metrics?.sent),
    opens: num(r.opens ?? r.stats?.opens ?? r.metrics?.opens),
    clicks: num(r.clicks ?? r.stats?.clicks ?? r.metrics?.clicks),
    conv: num(r.conversions ?? r.stats?.conversions ?? r.conv ?? r.metrics?.conversions),
    status: str(r.status, "draft"),
  };
}

function MarketingPage() {
  const queryClient = useQueryClient();
  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["marketing"],
    queryFn: async () => {
      const list = await fetchList("/marketing");
      return list.map(mapCampaign);
    },
  });

  const active = rows.filter((r) => r.status === "active").length;

  return (
    <DataPage
      title="Marketing"
      description="Campaigns across email, SMS, push and in-app."
      icon={<Megaphone className="h-5 w-5 text-primary" />}
      formFields={[
        { key: "name", label: "Campaign", type: "text" },
        { key: "channel", label: "Channel", type: "select", options: ["email", "sms", "push", "in_app"] },
        {
          key: "status",
          label: "Status",
          type: "select",
          options: ["draft", "scheduled", "active", "completed", "cancelled"],
        },
      ]}
      viewFields={[
        { key: "name", label: "Campaign" },
        { key: "channel", label: "Channel" },
        { key: "audience", label: "Audience" },
        { key: "sent", label: "Sent" },
        { key: "opens", label: "Opens" },
        { key: "clicks", label: "Clicks" },
        { key: "conv", label: "Conversions" },
        { key: "status", label: "Status" },
      ]}
      loadDetail={async (row) => row}
      renderView={(detail) => <GenericJsonDetailView detail={detail} />}
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
      onCreate={async (data) => {
        if (!data.name || !data.channel) throw new Error("Name and channel are required");
        const created = await api.post("/marketing", {
          name: data.name,
          channel: data.channel,
          status: data.status || "draft",
        });
        await queryClient.invalidateQueries({ queryKey: ["marketing"] });
        return mapCampaign(created);
      }}
      onUpdate={async (id, data) => {
        const updated = await api.patch(`/marketing/${id}`, {
          name: data.name,
          channel: data.channel,
          status: data.status,
        });
        await queryClient.invalidateQueries({ queryKey: ["marketing"] });
        return mapCampaign(updated);
      }}
      onDelete={async (id) => {
        await api.delete(`/marketing/${id}`);
        await queryClient.invalidateQueries({ queryKey: ["marketing"] });
      }}
    />
  );
}
