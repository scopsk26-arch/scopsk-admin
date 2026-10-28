import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { pagedListProps, usePagedList } from "@/hooks/usePagedList";
import { DataPage, StatusBadge, formatStatusLabel } from "@/components/admin/DataPage";
import { GenericJsonDetailView } from "@/components/admin/DetailViews";
import { Bell, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchNotificationDetail,
  markAllNotificationsRead,
} from "@/lib/api/resources";
import { api, str } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { notificationNavTarget, notificationPayload } from "@/lib/notification-nav";

type NotificationRow = {
  id: string;
  category: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  status: string;
  data: Record<string, unknown>;
};

export const Route = createFileRoute("/_admin/notifications")({
  head: () => ({ meta: [{ title: "Notifications — ScopsK" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const list = usePagedList<NotificationRow>({
    queryKey: ["notifications"],
    path: "/notifications",
    map: (r: any) => {
      const data = notificationPayload(r.data);
      const kind = str(data.type ?? r.category ?? r.type, "system");
      const read = Boolean(r.readAt ?? r.read ?? r.isRead) || r.status === "read";
      return {
        id: str(r.id),
        category: formatStatusLabel(kind),
        title: str(r.title, "—"),
        body: str(r.body ?? r.message, "—"),
        time: r.createdAt ? String(r.createdAt).replace("T", " ").slice(0, 16) : "—",
        read,
        status: read ? "read" : "unread",
        data,
      };
    },
  });
  const rows = list.rows;
  const isLoading = list.isLoading;
  const isError = list.isError;

  const unread = rows.filter((r) => !r.read).length;

  return (
    <DataPage
      title="Notifications"
      description="Alerts from the marketplace. Tap one to open the related record."
      icon={<Bell className="h-5 w-5 text-primary" />}
      entityName="Notification"
      viewFields={[
        { key: "category", label: "Category" },
        { key: "title", label: "Title" },
        { key: "body", label: "Detail" },
        { key: "time", label: "Time" },
        { key: "status", label: "Status" },
      ]}
      loadDetail={async (row) => {
        try {
          return await fetchNotificationDetail(row.id);
        } catch {
          return row;
        }
      }}
      renderView={(detail) => <GenericJsonDetailView detail={detail} />}
      filters={
        <Button
          variant="outline"
          size="sm"
          disabled={!unread}
          onClick={async () => {
            try {
              await markAllNotificationsRead();
              await queryClient.invalidateQueries({ queryKey: ["notifications"] });
              toast.success("All notifications marked read");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Failed to mark all read");
            }
          }}
        >
          <CheckCheck className="h-4 w-4 mr-1.5" />
          Mark all read
        </Button>
      }
      kpis={[
        { label: "Unread", value: String(unread), tone: "warning" },
        { label: "Total", value: String(rows.length) },
        {
          label: "Approval queue",
          value: String(rows.filter((r) => /approv|registration/i.test(r.category)).length),
          tone: "info",
        },
        {
          label: "Critical",
          value: String(rows.filter((r) => /fraud|critical/i.test(r.category)).length),
          tone: "destructive",
        },
      ]}
      rows={rows}
      serverPagination={pagedListProps(list)}
      searchKeys={["id", "title", "body", "category"]}
      emptyHint={
        isLoading ? "Loading…" : isError ? "Failed to load notifications." : "No notifications."
      }
      columns={[
        { key: "category", label: "Category" },
        {
          key: "title",
          label: "Title",
          render: (r) => (
            <span className={cn(r.read ? "text-muted-foreground" : "font-medium")}>{r.title}</span>
          ),
        },
        { key: "body", label: "Detail", className: "text-muted-foreground" },
        { key: "time", label: "Time" },
        {
          key: "read",
          label: "Status",
          render: (r) => <StatusBadge status={r.read ? "read" : "unread"} />,
        },
      ]}
      onRowClick={(row) => {
        if (!row.read) {
          void api
            .post(`/notifications/${row.id}/read`)
            .finally(() => queryClient.invalidateQueries({ queryKey: ["notifications"] }));
        }
        const target = notificationNavTarget(row);
        if (!target) return false;
        void navigate({ to: target.to, search: target.search ?? {} });
      }}
    />
  );
}
