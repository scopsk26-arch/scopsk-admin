import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { GenericJsonDetailView } from "@/components/admin/DetailViews";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { api, asArray, str } from "@/lib/api/client";

export const Route = createFileRoute("/_admin/fraud")({
  head: () => ({ meta: [{ title: "Fraud Detection — ResPy" }] }),
  component: FraudPage,
});

function FraudPage() {
  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["ai", "fraud-signals"],
    queryFn: async () => {
      try {
        const raw = await api.get("/ai/fraud-signals");
        const signals = asArray((raw as any)?.signals ?? raw);
        return signals.map((r: any, i: number) => ({
          id: str(r.id ?? r.code ?? `FR-${i + 1}`),
          subject: str(r.subject ?? r.code, "—"),
          reason: str(r.message ?? r.reason, "—"),
          model: str(r.model ?? "FraudSignals", "—"),
          severity: str(r.severity, "low"),
          status: str(r.status, "open"),
          payload: r,
        }));
      } catch {
        return [];
      }
    },
  });

  const high = rows.filter((r) => r.severity === "high").length;

  return (
    <DataPage
      title="Fraud Detection"
      description="Rule-based heuristic alerts (not ML). Review open signals from /ai/fraud-signals."
      disableCrud
      icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
      viewFields={[
        { key: "subject", label: "Subject" },
        { key: "reason", label: "Reason" },
        { key: "model", label: "Model" },
        { key: "severity", label: "Severity" },
        { key: "status", label: "Status" },
      ]}
      loadDetail={async (row) => row.payload ?? row}
      renderView={(detail) => <GenericJsonDetailView detail={detail} omitKeys={["id", "payload"]} />}
      kpis={[
        { label: "Open alerts", value: String(rows.filter((r) => r.status === "open").length), tone: "destructive" },
        { label: "Total signals", value: String(rows.length), tone: "success" },
        { label: "High severity", value: String(high), tone: "warning" },
        { label: "Detection accuracy", value: "—", tone: "info" },
      ]}
      rows={rows}
      searchKeys={["id", "subject", "model"]}
      emptyHint={isLoading ? "Loading…" : isError ? "Failed to load fraud signals." : "No fraud signals."}
      columns={[
        { key: "id", label: "Alert", className: "font-mono text-xs" },
        { key: "subject", label: "Subject", render: (r) => <span className="font-medium">{r.subject}</span> },
        { key: "reason", label: "Reason" },
        { key: "model", label: "Model" },
        { key: "severity", label: "Severity", render: (r) => (
          <span className={cn("text-xs font-medium",
            r.severity === "high" ? "text-destructive" : r.severity === "medium" ? "text-warning" : "text-muted-foreground"
          )}>{r.severity}</span>
        ) },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  );
}
