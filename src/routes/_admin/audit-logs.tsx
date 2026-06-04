import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/admin/DataPage";
import { auditLogs } from "@/lib/mock-data-extra";
import { ScrollText } from "lucide-react";

export const Route = createFileRoute("/_admin/audit-logs")({
  head: () => ({ meta: [{ title: "Audit Logs — Prime Plate" }] }),
  component: () => (
    <DataPage
      title="Audit Logs"
      description="Immutable record of every admin action with actor, target and IP."
      icon={<ScrollText className="h-5 w-5 text-primary" />}
      kpis={[
        { label: "Events (24h)", value: "4,280" },
        { label: "Admin users", value: "47" },
        { label: "Failed access", value: "3", tone: "warning" },
        { label: "Retention", value: "7y", tone: "info" },
      ]}
      rows={auditLogs}
      searchKeys={["id", "actor", "action", "target"]}
      columns={[
        { key: "time", label: "Time" },
        { key: "actor", label: "Actor", render: (r) => <span className="font-mono text-xs">{r.actor}</span> },
        { key: "action", label: "Action", render: (r) => <span className="font-medium">{r.action}</span> },
        { key: "target", label: "Target" },
        { key: "ip", label: "IP", className: "font-mono text-xs text-muted-foreground" },
      ]}
    />
  ),
});
