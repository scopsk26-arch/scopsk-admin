import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/admin/DataPage";
import { notifications } from "@/lib/mock-data-extra";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_admin/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Prime Plate" }] }),
  component: () => (
    <DataPage
      title="Notifications"
      description="System and operational notifications for the admin team."
      icon={<Bell className="h-5 w-5 text-primary" />}
      kpis={[
        { label: "Unread", value: "3", tone: "warning" },
        { label: "Today", value: "42" },
        { label: "Approval queue", value: "8", tone: "info" },
        { label: "Critical (24h)", value: "2", tone: "destructive" },
      ]}
      rows={notifications}
      searchKeys={["id", "title", "body", "category"]}
      columns={[
        { key: "category", label: "Category" },
        { key: "title", label: "Title", render: (r) => (
          <span className={cn(r.read ? "text-muted-foreground" : "font-medium")}>{r.title}</span>
        ) },
        { key: "body", label: "Detail", className: "text-muted-foreground" },
        { key: "time", label: "Time" },
        { key: "read", label: "Status", render: (r) => (
          <span className={cn("text-xs", r.read ? "text-muted-foreground" : "text-primary font-medium")}>
            {r.read ? "Read" : "Unread"}
          </span>
        ) },
      ]}
    />
  ),
});
