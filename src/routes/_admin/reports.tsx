import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/admin/DataPage";
import { reports } from "@/lib/mock-data-extra";
import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_admin/reports")({
  head: () => ({ meta: [{ title: "Reports & BI — Prime Plate" }] }),
  component: () => (
    <DataPage
      title="Reports & Business Intelligence"
      description="Scheduled and ad-hoc reports across finance, marketplace and risk."
      icon={<BarChart3 className="h-5 w-5 text-primary" />}
      kpis={[
        { label: "Scheduled reports", value: "18" },
        { label: "Runs (30d)", value: "412", tone: "success" },
        { label: "Avg. run time", value: "12s", tone: "info" },
        { label: "Subscribed users", value: "84" },
      ]}
      rows={reports}
      searchKeys={["id", "name", "category", "owner"]}
      columns={[
        { key: "id", label: "ID", className: "font-mono text-xs" },
        { key: "name", label: "Report", render: (r) => <span className="font-medium">{r.name}</span> },
        { key: "category", label: "Category" },
        { key: "schedule", label: "Schedule" },
        { key: "lastRun", label: "Last run" },
        { key: "owner", label: "Owner" },
        { key: "actions", label: "", render: () => <Button size="sm" variant="outline">Run</Button> },
      ]}
    />
  ),
});
