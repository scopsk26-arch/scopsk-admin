import { createFileRoute } from "@tanstack/react-router";
import { pagedListProps, usePagedList } from "@/hooks/usePagedList";
import { DataPage } from "@/components/admin/DataPage";
import { ScrollText } from "lucide-react";
import { fetchAuditLogDetail } from "@/lib/api/resources";
import { str } from "@/lib/api/client";

export const Route = createFileRoute("/_admin/audit-logs")({
  head: () => ({ meta: [{ title: "Activity log — ScopsK" }] }),
  component: AuditLogsPage,
});

const ACTION_LABELS: Record<string, string> = {
  "admin.lookup": "Looked up a record",
  "auth.logout": "Signed out",
  "auth.login": "Signed in",
  "auth.change_password": "Changed password",
  "product_requests.create": "Requested a missing product",
  "files.upload": "Uploaded a file",
  "rfqs.submit": "Sent a quote request",
  "rfqs.create": "Started a quote request",
  "admin.wallet.credit_request.accept": "Approved a credit request",
  "admin.wallet.credit_request.reject": "Rejected a credit request",
  "admin.wallet.withdraw.accept": "Approved a withdrawal",
  "admin.wallet.withdraw.reject": "Rejected a withdrawal",
};

function actionLabel(action: string) {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  const parts = action.split(".");
  const verb = parts[parts.length - 1]?.replace(/_/g, " ") || action;
  const subject = parts.slice(0, -1).join(" ").replace(/_/g, " ");
  const words = `${verb} ${subject}`.trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function browserLabel(agent: unknown) {
  const text = String(agent || "");
  if (!text) return "";
  const browser = /Edg\//.test(text)
    ? "Edge"
    : /Chrome\//.test(text)
      ? "Chrome"
      : /Firefox\//.test(text)
        ? "Firefox"
        : /Safari\//.test(text)
          ? "Safari"
          : "";
  const device = /Windows/.test(text)
    ? "Windows"
    : /Mac OS|Macintosh/.test(text)
      ? "Mac"
      : /iPhone/.test(text)
        ? "iPhone"
        : /Android/.test(text)
          ? "Android"
          : "";
  return [browser, device].filter(Boolean).join(" on ");
}

function personName(actor: any) {
  if (!actor || typeof actor !== "object") return "";
  return [actor.firstName, actor.lastName].filter(Boolean).join(" ").trim();
}

function AuditLogsPage() {
  const list = usePagedList({
    queryKey: ["admin", "audit-logs"],
    path: "/admin/audit-logs",
    map: (r: any) => ({
      id: str(r.id),
      time: r.createdAt ? String(r.createdAt).replace("T", " ").slice(0, 19) : "—",
      actor: str(r.actor?.email ?? r.actorId, "system"),
      what: actionLabel(str(r.action, "—")),
      target: str(r.entityType ? `${r.entityType}:${r.entityId ?? ""}` : r.target ?? r.resource, "—"),
      ip: str(r.ip ?? r.ipAddress, "—"),
    }),
  });
  const rows = list.rows;
  const isLoading = list.isLoading;
  const isError = list.isError;

  return (
    <DataPage
      title="Activity log"
      description="What people did in the app, and when. Events is the full log. The other numbers are only this page."
      icon={<ScrollText className="h-5 w-5 text-primary" />}
      disableCrud
      viewFields={[
        { key: "time", label: "Time" },
        { key: "actor", label: "Actor" },
        { key: "what", label: "What happened" },
        { key: "target", label: "Target" },
        { key: "ip", label: "IP" },
      ]}
      loadDetail={async (row) => {
        try {
          return await fetchAuditLogDetail(row.id);
        } catch {
          return row;
        }
      }}
      renderView={(detail) => {
        const name = personName(detail.actor);
        const browser = browserLabel(detail.userAgent);
        if (!name && !browser) return null;
        return (
          <div className="text-sm text-muted-foreground">
            {name ? <span className="text-foreground font-medium">{name}</span> : null}
            {name && browser ? " · " : null}
            {browser || null}
          </div>
        );
      }}
      kpis={[
        { label: "Events", value: String(list.total || rows.length) },
        { label: "People on this page", value: String(new Set(rows.map((r) => r.actor).filter((actor) => actor && actor !== "system")).size), tone: "info" },
        { label: "Action types on this page", value: String(new Set(rows.map((r) => r.what).filter((action) => action && action !== "—")).size), tone: "warning" },
        { label: "With an IP on this page", value: String(rows.filter((r) => r.ip && r.ip !== "—").length), tone: "info" },
      ]}
      rows={rows}
      serverPagination={pagedListProps(list)}
      searchKeys={["id", "actor", "what", "target"]}
      emptyHint={isLoading ? "Loading…" : isError ? "Failed to load audit logs." : "No audit logs found."}
      columns={[
        { key: "time", label: "Time" },
        { key: "actor", label: "Actor", render: (r) => <span className="font-mono text-xs">{r.actor}</span> },
        { key: "what", label: "What happened", render: (r) => <span className="font-medium">{r.what}</span> },
        { key: "target", label: "Target" },
        { key: "ip", label: "IP", className: "font-mono text-xs text-muted-foreground" },
      ]}
    />
  );
}
