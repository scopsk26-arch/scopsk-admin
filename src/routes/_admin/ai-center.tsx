import { createFileRoute } from "@tanstack/react-router";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { aiModels } from "@/lib/mock-data-extra";
import { Brain } from "lucide-react";

export const Route = createFileRoute("/_admin/ai-center")({
  head: () => ({ meta: [{ title: "AI Control Center — Prime Plate" }] }),
  component: () => (
    <DataPage
      title="AI Control Center"
      description="Models powering quotation scoring, fraud detection and demand forecasting."
      icon={<Brain className="h-5 w-5 text-primary" />}
      kpis={[
        { label: "Active models", value: "5", tone: "success" },
        { label: "Recommendations (30d)", value: "14,280", tone: "info" },
        { label: "Avg. accuracy", value: "89.4%" },
        { label: "Auto-actions", value: "612" },
      ]}
      rows={aiModels}
      searchKeys={["id", "name", "type"]}
      columns={[
        { key: "id", label: "Model", className: "font-mono text-xs" },
        { key: "name", label: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
        { key: "type", label: "Type" },
        { key: "accuracy", label: "Accuracy" },
        { key: "lastTrained", label: "Last trained" },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  ),
});
