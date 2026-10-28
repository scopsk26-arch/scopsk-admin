import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { pagedListProps, usePagedList } from "@/hooks/usePagedList";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { LifeBuoy } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchPage, fetchSupportTicketDetail } from "@/lib/api/resources";
import { api, str } from "@/lib/api/client";

export const Route = createFileRoute("/_admin/support")({
  head: () => ({ meta: [{ title: "Support — ScopsK" }] }),
  component: SupportPage,
});

const STATUS_CODES = ["open", "in_progress", "waiting", "resolved", "closed"];

const CATEGORY_LABEL: Record<string, string> = {
  order_complaint: "Order complaint",
  complaint: "Complaint",
  wallet_topup: "Funds request",
  credit_limit: "Credit request",
  org_report: "Org report",
  general: "General",
};

function categoryLabel(value: unknown) {
  const raw = str(value, "");
  if (!raw || raw === "—") return "—";
  return CATEGORY_LABEL[raw] || raw.replace(/[_-]+/g, " ");
}

function personName(user: any) {
  if (!user || typeof user !== "object") return "";
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || str(user.email, "");
}

function mapTicket(r: any) {
  const messages = Array.isArray(r.messages) ? r.messages : [];
  return {
    id: str(r.id),
    number: str(r.number ?? r.id),
    subject: str(r.subject ?? r.title, "—"),
    requester: str(
      personName(r.creator) || r.requester?.email || r.user?.email || r.createdBy,
      "—",
    ),
    organization: str(
      r.organization?.name ?? r.organization?.publicCode ?? r.organizationName,
      "—",
    ),
    relatedCode: str(r.relatedCode ?? r.related_code, "—"),
    category: categoryLabel(r.category),
    agent: str(personName(r.assignee) || r.assignedTo, "—"),
    priority: str(r.priority, "medium"),
    sla: str(r.slaDueAt ? String(r.slaDueAt).slice(0, 16) : r.sla, "—"),
    status: str(r.status, "open"),
    messages,
  };
}

function TicketDetail({ detail }: { detail: Record<string, unknown> }) {
  const messages = Array.isArray(detail.messages) ? detail.messages : [];
  return (
    <div className="space-y-4 text-sm">
      <dl className="grid gap-3 sm:grid-cols-2">
        {(
          [
            ["Ticket", detail.number],
            ["Subject", detail.subject],
            ["Organization", detail.organization],
            ["Requester", detail.requester],
            ["Order / PO", detail.relatedCode],
            ["Category", detail.category],
            ["Priority", detail.priority],
            ["Status", detail.status],
          ] as const
        ).map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-0.5">{str(value, "—")}</dd>
          </div>
        ))}
      </dl>
      <div className="space-y-2">
        <div className="text-xs font-semibold text-muted-foreground">Messages</div>
        {messages.length === 0 ? (
          <p className="text-muted-foreground">No messages yet. Write a reply the person can read.</p>
        ) : (
          messages.map((message: any, index) => (
            <div
              key={str(message.id, String(index))}
              className={cn(
                "rounded-md border px-3 py-2",
                message.isInternal ? "border-dashed bg-muted/40" : "bg-background",
              )}
            >
              <div className="mb-1 text-xs text-muted-foreground">
                {personName(message.user) || "Message"}
                {message.isInternal ? " · Internal" : ""}
                {message.createdAt ? ` · ${String(message.createdAt).slice(0, 16).replace("T", " ")}` : ""}
              </div>
              <p className="whitespace-pre-wrap">{str(message.body, "—")}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const SUPPORT_EXCLUDED = new Set(["wallet_topup", "credit_limit"]);

async function loadSupportTickets(args: {
  page: number;
  pageSize: number;
  search: string;
  sort: string;
  status: string;
}) {
  const collected: any[] = [];
  let apiPage = 1;
  let reportedTotal = 0;
  do {
    const fetched = await fetchPage("/support", {
      page: apiPage,
      limit: 100,
      search: args.search || undefined,
      sortBy: "createdAt",
      sortOrder: args.sort === "oldest" ? "ASC" : "DESC",
      excludeCategory: "wallet_topup,credit_limit",
      ...(args.status !== "all" ? { status: args.status } : {}),
    });
    reportedTotal = fetched.total;
    collected.push(
      ...fetched.rows.filter((row) => !SUPPORT_EXCLUDED.has(String(row.category || ""))),
    );
    if (fetched.rows.length < 100) break;
    apiPage += 1;
  } while ((apiPage - 1) * 100 < reportedTotal && apiPage <= 10);

  const start = (args.page - 1) * args.pageSize;
  return {
    rows: collected.slice(start, start + args.pageSize).map(mapTicket),
    total: collected.length,
    waiting: collected.filter((row) =>
      ["open", "in_progress", "waiting"].includes(String(row.status || "")),
    ).length,
  };
}

function SupportPage() {
  const queryClient = useQueryClient();
  const list = usePagedList({
    queryKey: ["support"],
    path: "/support",
    load: async (args) => {
      const loaded = await loadSupportTickets(args);
      return { rows: loaded.rows, total: loaded.total };
    },
  });
  const waiting = useQuery({
    queryKey: ["support", "waiting-count"],
    queryFn: async () => {
      const loaded = await loadSupportTickets({
        page: 1,
        pageSize: 1,
        search: "",
        sort: "newest",
        status: "all",
      });
      return loaded.waiting;
    },
  });
  const rows = list.rows;
  const isLoading = list.isLoading;
  const isError = list.isError;

  const complaints = rows.filter((r) => {
    const cat = String(r.category || "").toLowerCase();
    return (
      ["order complaint", "complaint", "org report"].includes(cat) ||
      String(r.relatedCode || "").includes("/")
    );
  }).length;

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["support"] });
  };

  return (
    <DataPage
      title="Support"
      description="Complaints and reports. Credit and wallet requests are on Wallets."
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
          options: STATUS_CODES,
        },
        { key: "reply", label: "Reply the person can read", type: "text" },
        { key: "internalNote", label: "Internal note", type: "text" },
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
      renderView={(detail) => <TicketDetail detail={detail} />}
      kpis={[
        { label: "Open tickets", value: waiting.isLoading ? "…" : String(waiting.data ?? 0), tone: "info" },
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
      serverPagination={pagedListProps(list)}
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
        const subject = String(data.subject || "").trim();
        const reply = String(data.reply || "").trim();
        if (!subject) throw new Error("Subject is required");
        if (reply.length < 8) throw new Error("Write the message the person should read.");
        const created = await api.post("/support", {
          subject,
          priority: data.priority || "medium",
          category: "general",
          body: reply,
        }, { toastOnSuccess: true });
        await refresh();
        return mapTicket(created);
      }}
      onUpdate={async (id, data, row) => {
        const reply = String(data.reply || "").trim();
        const internalNote = String(data.internalNote || "").trim();
        const status = STATUS_CODES.includes(String(data.status)) ? String(data.status) : row.status;
        const closing = ["resolved", "closed"].includes(status) && !["resolved", "closed"].includes(row.status);
        if (closing && reply.length < 8) {
          throw new Error("Write a reply the person can read before you close this request.");
        }
        if (reply && reply.length < 8) {
          throw new Error("Write a reply the person can read.");
        }
        if (reply) {
          await api.post(`/support/${id}/messages`, { body: reply, isInternal: false });
        }
        if (internalNote) {
          await api.post(`/support/${id}/messages`, { body: internalNote, isInternal: true });
        }
        const updated = await api.patch(`/support/${id}`, {
          subject: data.subject,
          priority: data.priority,
          status,
        });
        await refresh();
        return mapTicket(updated);
      }}
    />
  );
}
