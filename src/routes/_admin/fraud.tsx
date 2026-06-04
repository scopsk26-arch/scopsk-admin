import { createFileRoute } from "@tanstack/react-router";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { fraudAlerts } from "@/lib/mock-data-extra";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_admin/fraud")({
  head: () => ({ meta: [{ title: "Fraud Detection — Prime Plate" }] }),
  component: () => (
    <DataPage
      title="Fraud Detection"
      description="AI-driven alerts across quotations, accounts and transactions."
      icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
      kpis={[
        { label: "Open alerts", value: "3", tone: "destructive" },
        { label: "Resolved (30d)", value: "42", tone: "success" },
        { label: "High severity", value: "5", tone: "warning" },
        { label: "Detection accuracy", value: "91.6%", tone: "info" },
      ]}
      rows={fraudAlerts}
      searchKeys={["id", "subject", "model"]}
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
  ),
});
