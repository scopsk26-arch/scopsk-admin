import { createFileRoute } from "@tanstack/react-router";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { apiKeys } from "@/lib/mock-data-extra";
import { Code2 } from "lucide-react";

export const Route = createFileRoute("/_admin/api")({
  head: () => ({ meta: [{ title: "API Management — Prime Plate" }] }),
  component: () => (
    <DataPage
      title="API Management"
      description="API keys, scopes, rate limits and live request monitoring."
      icon={<Code2 className="h-5 w-5 text-primary" />}
      kpis={[
        { label: "Active keys", value: "12", tone: "success" },
        { label: "Calls (24h)", value: "1.2M", tone: "info" },
        { label: "Error rate", value: "0.4%", tone: "success" },
        { label: "P95 latency", value: "184ms" },
      ]}
      rows={apiKeys}
      searchKeys={["id", "label", "scope"]}
      columns={[
        { key: "id", label: "Key ID", className: "font-mono text-xs" },
        { key: "label", label: "Label", render: (r) => <span className="font-medium">{r.label}</span> },
        { key: "scope", label: "Scope", className: "font-mono text-xs text-muted-foreground" },
        { key: "calls24h", label: "Calls (24h)" },
        { key: "lastUsed", label: "Last used" },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  ),
});
