import { createFileRoute } from "@tanstack/react-router";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { supportTickets } from "@/lib/mock-data-extra";
import { LifeBuoy } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_admin/support")({
  head: () => ({ meta: [{ title: "Support — Prime Plate" }] }),
  component: () => (
    <DataPage
      title="Support Center"
      description="Customer tickets with SLA tracking, agent assignments and escalations."
      icon={<LifeBuoy className="h-5 w-5 text-primary" />}
      kpis={[
        { label: "Open tickets", value: "42", tone: "info" },
        { label: "Avg. first response", value: "18m", tone: "success" },
        { label: "Breached SLA", value: "3", tone: "destructive" },
        { label: "CSAT (30d)", value: "94%", tone: "success" },
      ]}
      rows={supportTickets}
      searchKeys={["id", "subject", "requester", "agent"]}
      columns={[
        { key: "id", label: "Ticket", className: "font-mono text-xs" },
        { key: "subject", label: "Subject", render: (r) => <span className="font-medium">{r.subject}</span> },
        { key: "requester", label: "Requester" },
        { key: "agent", label: "Agent" },
        { key: "priority", label: "Priority", render: (r) => (
          <span className={cn("text-xs font-medium",
            r.priority === "high" ? "text-destructive" : r.priority === "medium" ? "text-warning" : "text-muted-foreground"
          )}>{r.priority}</span>
        ) },
        { key: "sla", label: "SLA" },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  ),
});
