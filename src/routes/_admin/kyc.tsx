import { createFileRoute } from "@tanstack/react-router";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { kycQueue } from "@/lib/mock-data-extra";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_admin/kyc")({
  head: () => ({ meta: [{ title: "KYC Queue — Prime Plate" }] }),
  component: () => (
    <DataPage
      title="KYC Queue"
      description="Verification workflow for restaurants and suppliers with document review."
      icon={<ShieldCheck className="h-5 w-5 text-primary" />}
      kpis={[
        { label: "Pending review", value: "12", tone: "warning" },
        { label: "Approved (30d)", value: "184", tone: "success" },
        { label: "Avg. review time", value: "1.8h", tone: "info" },
        { label: "Rejection rate", value: "4.2%", tone: "destructive" },
      ]}
      rows={kycQueue}
      searchKeys={["id", "entity", "reviewer"]}
      columns={[
        { key: "id", label: "ID", className: "font-mono text-xs" },
        { key: "entity", label: "Entity", render: (r) => <span className="font-medium">{r.entity}</span> },
        { key: "type", label: "Type" },
        { key: "submitted", label: "Submitted" },
        { key: "priority", label: "Priority", render: (r) => (
          <span className={cn("text-xs font-medium",
            r.priority === "high" ? "text-destructive" : r.priority === "medium" ? "text-warning" : "text-muted-foreground"
          )}>{r.priority}</span>
        ) },
        { key: "reviewer", label: "Reviewer" },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  ),
});
