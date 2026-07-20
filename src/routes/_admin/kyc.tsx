import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { approveKyc, fetchList, rejectKyc } from "@/lib/api/resources";
import { str } from "@/lib/api/client";

export const Route = createFileRoute("/_admin/kyc")({
  head: () => ({ meta: [{ title: "KYC Queue — Prime Plate" }] }),
  component: KycPage,
});

function KycPage() {
  const queryClient = useQueryClient();

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
        notes: "",
      }));
    },
  });

  const pending = rows.filter((r) => ["pending", "review", "submitted", "under_review"].includes(r.status)).length;
  const approved = rows.filter((r) => r.status === "approved").length;

  return (
    <DataPage
      title="KYC Queue"
      description="Verification workflow for restaurants and suppliers with document review. Set status to approved or rejected to persist."
      icon={<ShieldCheck className="h-5 w-5 text-primary" />}
      formFields={[
        { key: "entity", label: "Entity", type: "text" },
        { key: "type", label: "Type", type: "text" },
        {
          key: "status",
          label: "Decision",
          type: "select",
          options: ["approved", "rejected", "under_review", "pending", "submitted"],
        },
        { key: "notes", label: "Notes (required to reject)", type: "text", placeholder: "Rejection reason…" },
      ]}
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
      onUpdate={async (id, data) => {
        const status = String(data.status || "");
        if (status === "approved") {
          await approveKyc(id, data.notes ? String(data.notes) : undefined);
        } else if (status === "rejected") {
          const notes = String(data.notes || "").trim();
          if (!notes) throw new Error("Notes are required to reject KYC");
          await rejectKyc(id, notes);
        } else {
          throw new Error("Set status to approved or rejected to update KYC");
        }
        await queryClient.invalidateQueries({ queryKey: ["kyc", "applications"] });
        return { id, status, entity: data.entity, notes: data.notes };
      }}
    />
  );
}
