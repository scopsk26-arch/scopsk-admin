import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { GenericJsonDetailView } from "@/components/admin/DetailViews";
import { LifeBuoy } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchList, fetchSupportTicketDetail } from "@/lib/api/resources";
import { api, str } from "@/lib/api/client";

export const Route = createFileRoute("/_admin/support")({
  head: () => ({ meta: [{ title: "Support — ResPy" }] }),
  component: SupportPage,
});

function mapTicket(r: any) {
  return {
    id: str(r.id),
    number: str(r.number ?? r.id),
    subject: str(r.subject ?? r.title, "—"),
    requester: str(r.requester?.email ?? r.user?.email ?? r.creator?.email ?? r.createdBy, "—"),
    organization: str(
      r.organization?.name ?? r.organization?.publicCode ?? r.organizationName,
      "—",
    ),
    relatedCode: str(r.relatedCode ?? r.related_code, "—"),
    category: str(r.category, "—"),
    agent: str(r.assignee?.email ?? r.assignedTo, "—"),
    priority: str(r.priority, "medium"),
    sla: str(r.slaDueAt ? String(r.slaDueAt).slice(0, 16) : r.sla, "—"),
    status: str(r.status, "open"),
  };
}

function SupportPage() {
  const queryClient = useQueryClient();
  const {
    data: rows = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["support"],
    queryFn: async () => {
      const list = await fetchList("/support");
      return list.map(mapTicket);
    },
  });

  const open = rows.filter((r) =>
    ["open", "pending", "review", "in_progress"].includes(r.status),
  ).length;
  const complaints = rows.filter(
    (r) =>
      ["order_complaint", "complaint"].includes(String(r.category || "").toLowerCase()) ||
      String(r.relatedCode || "").includes("/"),
  ).length;

  return (
    <DataPage
      title="Support Center"
      description="Customer tickets and restaurant order complaints (ORDR / PO tracking codes). Status updates persist to the API."
      icon={<LifeBuoy className="h-5 w-5 text-primary" />}
      formFields={[
        { key: "subject", label: "Subject", required: true, type: "text" },
        {
          key: "priority",
          label: "Priority",
          required: true,
          type: "select",
          options: ["low", "medium", "high", "urgent"],
        },
        {
          key: "status",
          label: "Status",
          required: true,
          type: "select",
          options: ["open", "in_progress", "waiting", "resolved", "closed"],
        },
      ]}
      viewFields={[
        { key: "number", label: "Ticket" },
        { key: "subject", label: "Subject" },
        { key: "relatedCode", label: "Order / PO codes" },
        { key: "category", label: "Category" },
        { key: "organization", label: "Organization" },
        { key: "requester", label: "Requester" },
        { key: "agent", label: "Agent" },
        { key: "priority", label: "Priority" },
        { key: "sla", label: "SLA" },
        { key: "status", label: "Status" },
      ]}
      loadDetail={async (row) => {
        try {
          const d = await fetchSupportTicketDetail(row.id);
          return {
            ...mapTicket({ ...row, ...d }),
            ...d,
            relatedCode: str(
              (d as any).relatedCode ?? (d as any).related_code ?? row.relatedCode,
              "—",
            ),
            messages: (d as any).messages,
          };
        } catch {
          return row;
        }
      }}
      renderView={(detail) => <GenericJsonDetailView detail={detail} />}
      kpis={[
        { label: "Open tickets", value: String(open), tone: "info" },
        { label: "Order complaints", value: String(complaints), tone: "warning" },
        {
          label: "High priority",
          value: String(
            rows.filter((r) => r.priority === "high" || r.priority === "urgent").length,
          ),
          tone: "destructive",
        },
        {
          label: "Resolved",
          value: String(rows.filter((r) => r.status === "resolved").length),
          tone: "success",
        },
      ]}
      rows={rows}
      searchKeys={[
        "number",
        "subject",
        "requester",
        "agent",
        "relatedCode",
        "organization",
        "category",
      ]}
      emptyHint={
        isLoading ? "Loading…" : isError ? "Failed to load tickets." : "No support tickets."
      }
      columns={[
        { key: "number", label: "Ticket", className: "font-mono text-xs" },
        {
          key: "subject",
          label: "Subject",
          render: (r) => <span className="font-medium">{r.subject}</span>,
        },
        {
          key: "relatedCode",
          label: "Order / PO",
          className: "font-mono text-xs max-w-[220px]",
          render: (r) => (
            <span className="truncate inline-block max-w-[220px]" title={r.relatedCode}>
              {r.relatedCode}
            </span>
          ),
        },
        { key: "category", label: "Category", className: "text-xs capitalize" },
        { key: "organization", label: "Org" },
        { key: "requester", label: "Requester" },
        {
          key: "priority",
          label: "Priority",
          render: (r) => (
            <span
              className={cn(
                "text-xs font-medium",
                r.priority === "high" || r.priority === "urgent"
                  ? "text-destructive"
                  : r.priority === "medium"
                    ? "text-warning"
                    : "text-muted-foreground",
              )}
            >
              {r.priority}
            </span>
          ),
        },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
      onCreate={async (data) => {
        if (!data.subject) throw new Error("Subject is required");
        const created = await api.post("/support", {
          subject: data.subject,
          priority: data.priority || "medium",
          body: data.subject,
        });
        await queryClient.invalidateQueries({ queryKey: ["support"] });
        return mapTicket(created);
      }}
      onUpdate={async (id, data) => {
        const updated = await api.patch(`/support/${id}`, {
          subject: data.subject,
          priority: data.priority,
          status: data.status,
        });
        await queryClient.invalidateQueries({ queryKey: ["support"] });
        return mapTicket(updated);
      }}
    />
  );
}
