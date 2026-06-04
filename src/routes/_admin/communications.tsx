import { createFileRoute } from "@tanstack/react-router";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { communications } from "@/lib/mock-data-extra";
import { MessageSquare } from "lucide-react";

export const Route = createFileRoute("/_admin/communications")({
  head: () => ({ meta: [{ title: "Communications — Prime Plate" }] }),
  component: () => (
    <DataPage
      title="Communications"
      description="In-app, email, SMS and push messages across the marketplace."
      icon={<MessageSquare className="h-5 w-5 text-primary" />}
      kpis={[
        { label: "Sent today", value: "4,820", tone: "info" },
        { label: "Delivery rate", value: "98.4%", tone: "success" },
        { label: "Open rate", value: "62%" },
        { label: "Failed", value: "12", tone: "destructive" },
      ]}
      rows={communications}
      searchKeys={["id", "subject", "from", "to"]}
      columns={[
        { key: "id", label: "ID", className: "font-mono text-xs" },
        { key: "channel", label: "Channel" },
        { key: "subject", label: "Subject", render: (r) => <span className="font-medium">{r.subject}</span> },
        { key: "from", label: "From" },
        { key: "to", label: "To" },
        { key: "time", label: "Time" },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  ),
});
