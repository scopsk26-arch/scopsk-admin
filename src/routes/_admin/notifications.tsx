import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DataPage } from "@/components/admin/DataPage";
import { GenericJsonDetailView } from "@/components/admin/DetailViews";
import { Bell, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchList,
  fetchNotificationDetail,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api/resources";
import { str } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/notifications")({
  head: () => ({ meta: [{ title: "Notifications — ResPy" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const queryClient = useQueryClient();

  const {
    data: rows = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const list = await fetchList("/notifications");
      return list.map((r: any) => ({
        id: str(r.id),
        category: str(r.category ?? r.type, "System"),
        title: str(r.title, "—"),
        body: str(r.body ?? r.message, "—"),
        time: r.createdAt ? String(r.createdAt).replace("T", " ").slice(0, 16) : "—",
        read: Boolean(r.readAt ?? r.read ?? r.isRead),
        status: Boolean(r.readAt ?? r.read ?? r.isRead) ? "read" : "unread",
      }));
    },
  });

  const unread = rows.filter((r) => !r.read).length;

  return (
    <DataPage
      title="Notifications"
      description="System and operational notifications for the admin team. Mark items read via edit."
      icon={<Bell className="h-5 w-5 text-primary" />}
      entityName="Notification"
      formFields={[
        { key: "category", label: "Category", type: "text" },
        { key: "title", label: "Title", required: true, type: "text" },
        { key: "body", label: "Detail", required: true, type: "text" },
        {
          key: "status",
          label: "Status",
          required: true,
          type: "select",
          options: ["read", "unread"],
        },
      ]}
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
          value: String(rows.filter((r) => /approv/i.test(r.category)).length),
          tone: "info",
        },
        {
          label: "Critical",
          value: String(rows.filter((r) => /fraud|critical/i.test(r.category)).length),
          tone: "destructive",
        },
      ]}
      rows={rows}
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
          render: (r) => (
            <span
              className={cn(
                "text-xs",
                r.read ? "text-muted-foreground" : "text-primary font-medium",
              )}
            >
              {r.read ? "Read" : "Unread"}
            </span>
          ),
        },
      ]}
      onUpdate={async (id, data, row) => {
        const status = String(data.status || "").toLowerCase();
        if (status === "read" || status === "unread") {
          if (status === "read" && !row.read) {
            await markNotificationRead(id);
          } else if (status === "unread") {
            throw new Error("Marking unread is not supported by the API");
          }
        } else {
          throw new Error("Set status to read to mark as read");
        }
        await queryClient.invalidateQueries({ queryKey: ["notifications"] });
        return { ...row, read: true, status: "read" };
      }}
    />
  );
}
