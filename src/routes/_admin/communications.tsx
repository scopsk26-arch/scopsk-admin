import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { GenericJsonDetailView } from "@/components/admin/DetailViews";
import { MessageSquare } from "lucide-react";
import { EMPTY_LIST, fetchCommunications } from "@/lib/api/resources";

export const Route = createFileRoute("/_admin/communications")({
  head: () => ({ meta: [{ title: "Communications — ScopsK" }] }),
  component: CommunicationsPage,
});

function CommunicationsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "communications"],
    queryFn: fetchCommunications,
  });

  const rows = data?.rows ?? EMPTY_LIST;
  const delivered = rows.filter((r: any) => ["delivered", "active", "resolved", "read"].includes(String(r.status).toLowerCase())).length;
  const failed = rows.filter((r: any) => ["failed", "error", "bounced"].includes(String(r.status).toLowerCase())).length;
  const sent = rows.filter((r: any) => ["sent", "pending", "open"].includes(String(r.status).toLowerCase())).length;
  const deliveryRate = rows.length ? `${((delivered / rows.length) * 100).toFixed(1)}%` : "—";

  return (
    <DataPage
      title="Communications"
      description="In-app, email, SMS and push messages across the marketplace."
      icon={<MessageSquare className="h-5 w-5 text-primary" />}
      disableCrud
      viewFields={[
        { key: "id", label: "ID" },
        { key: "channel", label: "Channel" },
        { key: "subject", label: "Subject" },
        { key: "from", label: "From" },
        { key: "to", label: "To" },
        { key: "time", label: "Time" },
        { key: "status", label: "Status" },
      ]}
      loadDetail={async (row) => row}
      renderView={(detail) => <GenericJsonDetailView detail={detail} />}
      kpis={[
        { label: "Total", value: String(rows.length), tone: "info" },
        { label: "Delivery rate", value: deliveryRate, tone: "success" },
        { label: "Open / sent", value: String(sent) },
        { label: "Failed", value: String(failed), tone: "destructive" },
      ]}
      rows={rows}
      searchKeys={["id", "subject", "from", "to"]}
      emptyHint={
        isLoading
          ? "Loading…"
          : isError
            ? "Failed to load communications."
            : "No conversations, tickets, or notifications found."
      }
      columns={[
        { key: "id", label: "ID", className: "font-mono text-xs", render: (r) => String(r.id).slice(0, 8) },
        { key: "channel", label: "Channel" },
        { key: "subject", label: "Subject", render: (r) => <span className="font-medium">{r.subject}</span> },
        { key: "from", label: "From" },
        { key: "to", label: "To" },
        { key: "time", label: "Time" },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  );
}
