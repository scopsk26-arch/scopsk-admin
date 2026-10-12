import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { pagedListProps, usePagedList } from "@/hooks/usePagedList";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { ApprovalDetailView } from "@/components/admin/DetailViews";
import { CheckSquare } from "lucide-react";
import {
  approveApprovalRequest,
  fetchApprovalDetail,
  rejectApprovalRequest,
} from "@/lib/api/resources";
import { num, str } from "@/lib/api/client";

export const Route = createFileRoute("/_admin/approvals")({
  head: () => ({ meta: [{ title: "Approvals — ScopsK" }] }),
  component: ApprovalsPage,
});

type ApprovalRow = {
  id: string;
  organization: string;
  organizationId: string;
  entityType: string;
  entityId: string;
  entityNumber: string;
  entityTotal: string;
  level: string;
  currentLevel: number;
  requiredLevels: number;
  status: string;
  requestedBy: string;
  created: string;
};

function approvalTypeLabel(type: string) {
  const t = String(type || "").toLowerCase();
  if (t === "purchase_order" || t === "po") return "Purchase Order";
  if (t === "rfq") return "RFQ";
  if (t === "quotation" || t === "quote") return "Quotation";
  return type || "—";
}

function mapApproval(r: any): ApprovalRow {
  const entity = r.entity ?? r.entitySnapshot ?? r.purchaseOrder ?? r.rfq ?? r.quotation;
  return {
    id: str(r.id),
    organization: str(r.organization?.name ?? r.organizationId, "—"),
    organizationId: str(r.organizationId ?? r.organization?.id, ""),
    entityType: approvalTypeLabel(str(r.entityType, "")),
    entityId: str(r.entityId, "—"),
    entityNumber: str(
      entity?.number ??
        r.purchaseOrder?.number ??
        r.rfq?.number ??
        r.quotation?.number ??
        r.entityNumber,
      "—",
    ),
    entityTotal: entity?.total != null ? String(entity.total) : "—",
    currentLevel: num(r.currentLevel),
    requiredLevels: num(r.requiredLevels ?? r.requiredLevels),
    level: `${num(r.currentLevel)} / ${num(r.requiredLevels ?? r.requiredLevels)}`,
    status: str(r.status, "pending"),
    requestedBy: str(r.requester?.email ?? r.requestedBy, "—"),
    created: r.createdAt ? String(r.createdAt).replace("T", " ").slice(0, 16) : "—",
  };
}

function ApprovalsPage() {
  const queryClient = useQueryClient();

  const list = usePagedList({
    queryKey: ["approvals"],
    path: "/approvals",
    map: mapApproval,
  });
  const rows = list.rows;
  const isLoading = list.isLoading;
  const isError = list.isError;

  const pending = rows.filter((r) => r.status === "pending").length;
  const poApprovals = rows.filter((r) =>
    String(r.entityType).toLowerCase().includes("purchase"),
  ).length;
  const rfqApprovals = rows.filter((r) => String(r.entityType).toLowerCase() === "rfq").length;

  return (
    <DataPage
      title="Approvals"
      description="Pending restaurant workflow approvals: RFQs waiting to publish, quotations waiting to award, and purchase orders waiting for supplier release. Approve or reject from Edit."
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
          required: true,
          type: "select",
          options: ["approved", "rejected", "pending"],
        },
      ]}
      viewFields={[
        { key: "organization", label: "Organization" },
        { key: "entityType", label: "Entity type" },
        { key: "entityNumber", label: "Entity #" },
        { key: "entityId", label: "Entity ID" },
        { key: "entityTotal", label: "Entity total" },
        { key: "level", label: "Level" },
        { key: "requestedBy", label: "Requested by" },
        { key: "created", label: "Created" },
        { key: "status", label: "Status" },
      ]}
      loadDetail={async (row) => {
        try {
          const detail = await fetchApprovalDetail(row.id);
          try {
            return JSON.parse(JSON.stringify(detail));
          } catch {
            return detail;
          }
        } catch {
          return row as Record<string, any>;
        }
      }}
      renderView={(detail) => <ApprovalDetailView detail={detail} />}
      kpis={[
        { label: "Pending", value: String(pending), tone: "warning" },
        { label: "PO approvals", value: String(poApprovals), tone: "info" },
        { label: "RFQ approvals", value: String(rfqApprovals), tone: "info" },
        {
          label: "Avg levels",
          value: rows.length
            ? (rows.reduce((s, r) => s + r.requiredLevels, 0) / rows.length).toFixed(1)
            : "0",
        },
      ]}
      rows={rows}
      serverPagination={pagedListProps(list)}
      searchKeys={["organization", "entityType", "entityId", "entityNumber", "status", "id"]}
      emptyHint={
        isLoading ? "Loading…" : isError ? "Failed to load approvals." : "No pending approvals."
      }
      columns={[
        {
          key: "id",
          label: "ID",
          className: "font-mono text-xs whitespace-nowrap w-[1%]",
          render: (r) => String(r.id).slice(0, 8),
        },
        {
          key: "organization",
          label: "Organization",
          render: (r) => <span className="font-medium">{r.organization}</span>,
        },
        { key: "entityType", label: "Type", className: "whitespace-nowrap w-[1%]" },
        {
          key: "entityNumber",
          label: "Entity",
          className: "font-mono text-xs whitespace-nowrap w-[1%]",
          render: (r) => (r.entityNumber !== "—" ? r.entityNumber : String(r.entityId).slice(0, 8)),
        },
        { key: "level", label: "Level", className: "whitespace-nowrap w-[1%]" },
        { key: "created", label: "Created", className: "whitespace-nowrap w-[1%]" },
        {
          key: "status",
          label: "Status",
          className: "whitespace-nowrap w-[1%]",
          render: (r) => <StatusBadge status={r.status} />,
        },
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
