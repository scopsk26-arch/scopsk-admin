import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DataPage } from "@/components/admin/DataPage";
import { GenericJsonDetailView } from "@/components/admin/DetailViews";
import { ScrollText } from "lucide-react";
import { fetchAuditLogDetail, fetchList } from "@/lib/api/resources";
import { str } from "@/lib/api/client";

export const Route = createFileRoute("/_admin/audit-logs")({
  head: () => ({ meta: [{ title: "Audit Logs — Prime Plate" }] }),
  component: AuditLogsPage,
});

function AuditLogsPage() {
  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["admin", "audit-logs"],
    queryFn: async () => {
      const list = await fetchList("/admin/audit-logs");
      return list.map((r: any) => ({
        id: str(r.id),
        time: r.createdAt ? String(r.createdAt).replace("T", " ").slice(0, 19) : "—",
        actor: str(r.actor?.email ?? r.actorId, "system"),
        action: str(r.action, "—"),
        target: str(r.entityType ? `${r.entityType}:${r.entityId ?? ""}` : r.target ?? r.resource, "—"),
        ip: str(r.ip ?? r.ipAddress, "—"),
      }));
    },
  });

  return (
    <DataPage
      title="Audit Logs"
      description="Immutable record of every admin action with actor, target and IP."
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
