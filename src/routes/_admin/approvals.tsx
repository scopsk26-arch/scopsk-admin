import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { CheckSquare } from "lucide-react";
import {
  approveApprovalRequest,
  fetchList,
  rejectApprovalRequest,
} from "@/lib/api/resources";
import { num, str } from "@/lib/api/client";

export const Route = createFileRoute("/_admin/approvals")({
  head: () => ({ meta: [{ title: "Approvals — Prime Plate" }] }),
  component: ApprovalsPage,
});

type ApprovalRow = {
  id: string;
  organization: string;
  organizationId: string;
  entityType: string;
  entityId: string;
  level: string;
  currentLevel: number;
  requiredLevels: number;
  status: string;
  requestedBy: string;
  created: string;
};

function mapApproval(r: any): ApprovalRow {
  return {
    id: str(r.id),
    organization: str(r.organization?.name ?? r.organizationId, "—"),
    organizationId: str(r.organizationId ?? r.organization?.id, ""),
    entityType: str(r.entityType, "—"),
    entityId: str(r.entityId, "—"),
    currentLevel: num(r.currentLevel),
    requiredLevels: num(r.requiredLevels),
    level: `${num(r.currentLevel)} / ${num(r.requiredLevels)}`,
    status: str(r.status, "pending"),
    requestedBy: str(r.requestedBy, "—"),
    created: r.createdAt ? String(r.createdAt).replace("T", " ").slice(0, 16) : "—",
  };
}

function ApprovalsPage() {
  const queryClient = useQueryClient();

  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["approvals"],
    queryFn: async () => {
      const list = await fetchList("/approvals");
      return list.map(mapApproval);
    },
  });

  const pending = rows.filter((r) => r.status === "pending").length;
  const poApprovals = rows.filter((r) => r.entityType === "purchase_order").length;

  return (
    <DataPage
      title="Approvals"
      description="Monitor multi-level PO approval requests across organizations. Set status to approved or rejected to act."
      icon={<CheckSquare className="h-5 w-5 text-primary" />}
      entityName="Approval"
      formFields={[
        { key: "organization", label: "Organization", type: "text" },
        { key: "entityType", label: "Entity type", type: "text" },
        { key: "entityId", label: "Entity ID", type: "text" },
        { key: "level", label: "Level progress", type: "text" },
        {
          key: "status",
          label: "Decision",
          type: "select",
          options: ["approved", "rejected", "pending"],
        },
      ]}
      kpis={[
        { label: "Pending", value: String(pending), tone: "warning" },
        { label: "PO approvals", value: String(poApprovals), tone: "info" },
        { label: "Total shown", value: String(rows.length) },
        {
          label: "Avg levels",
          value: rows.length
            ? (rows.reduce((s, r) => s + r.requiredLevels, 0) / rows.length).toFixed(1)
            : "0",
        },
      ]}
      rows={rows}
      searchKeys={["organization", "entityType", "entityId", "status", "id"]}
      emptyHint={isLoading ? "Loading…" : isError ? "Failed to load approvals." : "No pending approvals."}
      columns={[
        { key: "id", label: "ID", className: "font-mono text-xs", render: (r) => String(r.id).slice(0, 8) },
        { key: "organization", label: "Organization", render: (r) => <span className="font-medium">{r.organization}</span> },
        { key: "entityType", label: "Type" },
        {
          key: "entityId",
          label: "Entity",
          className: "font-mono text-xs",
          render: (r) => String(r.entityId).slice(0, 8),
        },
        { key: "level", label: "Level" },
        { key: "created", label: "Created" },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
      onUpdate={async (id, data, row) => {
        const status = String(data.status || "").toLowerCase();
        if (status === "approved") {
          await approveApprovalRequest(id);
        } else if (status === "rejected") {
          await rejectApprovalRequest(id);
        } else {
          throw new Error("Set status to approved or rejected to persist");
        }
        await queryClient.invalidateQueries({ queryKey: ["approvals"] });
        await queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
        return { ...row, status };
      }}
    />
  );
}
