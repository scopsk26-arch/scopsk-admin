import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchList } from "@/lib/api/resources";
import { str } from "@/lib/api/client";

export const Route = createFileRoute("/_admin/kyc")({
  head: () => ({ meta: [{ title: "KYC Queue — Prime Plate" }] }),
  component: KycPage,
});

function KycPage() {
  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["kyc", "applications"],
    queryFn: async () => {
      const list = await fetchList("/kyc/applications");
      return list.map((r: any) => ({
        id: str(r.id),
        entity: str(r.organization?.name ?? r.organizationId, "—"),
        type: str(r.type, "—"),
        submitted: r.createdAt ? String(r.createdAt).slice(0, 10) : "—",
        priority: str(r.priority ?? r.metadata?.priority, "medium"),
        reviewer: str(r.reviewer?.email ?? r.reviewedBy, "—"),
        status: str(r.status, "pending"),
      }));
    },
  });

  const pending = rows.filter((r) => ["pending", "review", "submitted"].includes(r.status)).length;
  const approved = rows.filter((r) => r.status === "approved").length;

  return (
    <DataPage
      title="KYC Queue"
      description="Verification workflow for restaurants and suppliers with document review."
      icon={<ShieldCheck className="h-5 w-5 text-primary" />}
      kpis={[
        { label: "Pending review", value: String(pending), tone: "warning" },
        { label: "Approved", value: String(approved), tone: "success" },
        { label: "Total", value: String(rows.length), tone: "info" },
        { label: "Rejection rate", value: "—", tone: "destructive" },
      ]}
      rows={rows}
      searchKeys={["id", "entity", "reviewer"]}
      emptyHint={isLoading ? "Loading…" : isError ? "Failed to load KYC." : "No KYC applications."}
      columns={[
        { key: "id", label: "ID", className: "font-mono text-xs", render: (r) => String(r.id).slice(0, 8) },
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
  );
}
