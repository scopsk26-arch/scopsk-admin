import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { GenericJsonDetailView } from "@/components/admin/DetailViews";
import { Brain } from "lucide-react";
import { api, asArray, num, str } from "@/lib/api/client";

export const Route = createFileRoute("/_admin/ai-center")({
  head: () => ({ meta: [{ title: "AI Control Center — ScopsK" }] }),
  component: AiCenterPage,
});

function AiCenterPage() {
  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["ai", "center"],
    queryFn: async () => {
      const [recs, forecast, prices] = await Promise.all([
        api.get("/ai/recommendations").catch(() => null),
        api.get("/ai/demand-forecast").catch(() => null),
        api.get("/ai/price-prediction").catch(() => null),
      ]);

      const models = [
        {
          id: "AI-recommendations",
          name: "Recommendations",
          type: "Recommendation",
          accuracy: recs ? `${Math.round(num((asArray((recs as any).suppliers)[0] as any)?.score, 0) * 100)}%` : "—",
          lastTrained: str((recs as any)?.generatedAt, "—").slice(0, 10),
          status: recs ? "active" : "review",
          payload: recs,
        },
        {
          id: "AI-demand-forecast",
          name: "Demand Forecast",
          type: "Forecasting",
          accuracy: forecast ? `${Math.round(num((asArray((forecast as any).items)[0] as any)?.confidence, 0) * 100)}%` : "—",
          lastTrained: str((forecast as any)?.generatedAt, "—").slice(0, 10),
          status: forecast ? "active" : "review",
          payload: forecast,
        },
        {
          id: "AI-price-prediction",
          name: "Price Prediction",
          type: "Forecasting",
          accuracy: "—",
          lastTrained: str((prices as any)?.generatedAt, "—").slice(0, 10),
          status: prices ? "active" : "review",
          payload: prices,
        },
      ];
      return models;
    },
  });

  return (
    <DataPage
      title="Risk scores"
      description="Automated scores for marketplace activity."
      disableCrud
      icon={<Brain className="h-5 w-5 text-primary" />}
      viewFields={[
        { key: "name", label: "Name" },
        { key: "type", label: "Type" },
        { key: "accuracy", label: "Accuracy" },
        { key: "lastTrained", label: "Last trained" },
        { key: "status", label: "Status" },
      ]}
      loadDetail={async (row) => row.payload ?? row}
      renderView={(detail) => <GenericJsonDetailView detail={detail} omitKeys={["id", "payload"]} />}
      kpis={[
        { label: "Active models", value: String(rows.filter((r) => r.status === "active").length), tone: "success" },
        { label: "Endpoints", value: String(rows.length), tone: "info" },
        { label: "Avg. accuracy", value: "—" },
        { label: "Auto-actions", value: "—" },
      ]}
      rows={rows}
      searchKeys={["id", "name", "type"]}
      emptyHint={isLoading ? "Loading…" : isError ? "Failed to load AI models." : "No AI endpoints available."}
      columns={[
        { key: "id", label: "Model", className: "font-mono text-xs" },
        { key: "name", label: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
        { key: "type", label: "Type" },
        { key: "accuracy", label: "Accuracy" },
        { key: "lastTrained", label: "Last trained" },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  );
}
