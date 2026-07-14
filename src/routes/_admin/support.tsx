import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { LifeBuoy } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchList } from "@/lib/api/resources";
import { str } from "@/lib/api/client";

export const Route = createFileRoute("/_admin/support")({
  head: () => ({ meta: [{ title: "Support — Prime Plate" }] }),
  component: SupportPage,
});

function SupportPage() {
  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["support"],
    queryFn: async () => {
      const list = await fetchList("/support");
      return list.map((r: any) => ({
        id: str(r.number ?? r.id),
        subject: str(r.subject ?? r.title, "—"),
        requester: str(r.requester?.email ?? r.user?.email ?? r.createdBy, "—"),
        agent: str(r.assignee?.email ?? r.assignedTo, "—"),
        priority: str(r.priority, "medium"),
        sla: str(r.slaDueAt ? String(r.slaDueAt).slice(0, 16) : r.sla, "—"),
        status: str(r.status, "open"),
      }));
    },
  });

  const open = rows.filter((r) => ["open", "pending", "review"].includes(r.status)).length;

  return (
    <DataPage
      title="Support Center"
      description="Customer tickets with SLA tracking, agent assignments and escalations."
      icon={<LifeBuoy className="h-5 w-5 text-primary" />}
      kpis={[
        { label: "Open tickets", value: String(open), tone: "info" },
        { label: "Total", value: String(rows.length), tone: "success" },
        { label: "High priority", value: String(rows.filter((r) => r.priority === "high").length), tone: "destructive" },
        { label: "Resolved", value: String(rows.filter((r) => r.status === "resolved").length), tone: "success" },
      ]}
      rows={rows}
      searchKeys={["id", "subject", "requester", "agent"]}
      emptyHint={isLoading ? "Loading…" : isError ? "Failed to load tickets." : "No support tickets."}
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
  );
}
