import { createFileRoute } from "@tanstack/react-router";
import { pagedListProps, usePagedList } from "@/hooks/usePagedList";
import { DataPage } from "@/components/admin/DataPage";
import { GenericJsonDetailView } from "@/components/admin/DetailViews";
import { ScrollText } from "lucide-react";
import { fetchAuditLogDetail } from "@/lib/api/resources";
import { str } from "@/lib/api/client";

export const Route = createFileRoute("/_admin/audit-logs")({
  head: () => ({ meta: [{ title: "Activity log — ScopsK" }] }),
  component: AuditLogsPage,
});

function AuditLogsPage() {
  const list = usePagedList({
    queryKey: ["admin", "audit-logs"],
    path: "/admin/audit-logs",
    map: (r: any) => ({
      id: str(r.id),
      time: r.createdAt ? String(r.createdAt).replace("T", " ").slice(0, 19) : "—",
      actor: str(r.actor?.email ?? r.actorId, "system"),
      action: str(r.action, "—"),
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
      description="Who changed what, and when."
      icon={<ScrollText className="h-5 w-5 text-primary" />}
      disableCrud
      viewFields={[
        { key: "time", label: "Time" },
        { key: "actor", label: "Actor" },
        { key: "action", label: "Action" },
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
      renderView={(detail) => <GenericJsonDetailView detail={detail} />}
      kpis={[
        { label: "Events", value: String(rows.length) },
        { label: "Actors", value: String(new Set(rows.map((r) => r.actor).filter(Boolean)).size), tone: "info" },
        { label: "Unique actions", value: String(new Set(rows.map((r) => r.action).filter(Boolean)).size), tone: "warning" },
        { label: "With IP", value: String(rows.filter((r) => r.ip && r.ip !== "—").length), tone: "info" },
      ]}
      rows={rows}
      serverPagination={pagedListProps(list)}
      searchKeys={["id", "actor", "action", "target"]}
      emptyHint={isLoading ? "Loading…" : isError ? "Failed to load audit logs." : "No audit logs found."}
      columns={[
        { key: "time", label: "Time" },
        { key: "actor", label: "Actor", render: (r) => <span className="font-mono text-xs">{r.actor}</span> },
        { key: "action", label: "Action", render: (r) => <span className="font-medium">{r.action}</span> },
        { key: "target", label: "Target" },
        { key: "ip", label: "IP", className: "font-mono text-xs text-muted-foreground" },
      ]}
    />
  );
}
