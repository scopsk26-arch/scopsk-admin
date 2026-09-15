import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { OrganizationDetailView } from "@/components/admin/DetailViews";
import type { LucideIcon } from "lucide-react";
import {
  activateOrganization,
  approveOrganization,
  deactivateOrganization,
  fetchOrganizationDetail,
  fetchPendingOrganizations,
  rejectOrganization,
} from "@/lib/api/resources";

type OrgApprovalsPageProps = {
  type: "restaurant" | "supplier";
  title: string;
  description: string;
  icon: LucideIcon;
};

export function OrgApprovalsPage({ type, title, description, icon: Icon }: OrgApprovalsPageProps) {
  const queryClient = useQueryClient();
  const queryKey = ["organizations", type, "pendingApproval"] as const;

  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey,
    staleTime: 30_000,
    queryFn: () => fetchPendingOrganizations(type),
  });

  const pending = rows.filter((r) =>
    ["pending", "unverified", "rejected"].includes(String(r.verificationStatus || r.status).toLowerCase()),
  ).length;
  const rejected = rows.filter((r) => String(r.status).toLowerCase() === "rejected").length;

  return (
    <DataPage
      title={title}
      description={description}
      icon={<Icon className="h-5 w-5 text-primary" />}
      entityName={type === "restaurant" ? "Restaurant" : "Supplier"}
      formFields={[
        { key: "name", label: "Organization", type: "readonly" },
        { key: "email", label: "Email", type: "readonly" },
        { key: "verificationStatus", label: "Verification", type: "readonly" },
        { key: "status", label: "Current status", type: "readonly" },
        {
          key: "decision",
          label: "Decision",
          type: "select",
          options: ["approve", "reject", "activate", "deactivate"],
        },
        {
          key: "reason",
          label: "Reason (required to reject)",
          type: "text",
          placeholder: "Rejection or deactivate reason…",
        },
      ]}
      viewFields={[
        { key: "name", label: "Organization" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "legalName", label: "Legal name" },
        { key: "region", label: "Region" },
        { key: "verificationStatus", label: "Verification" },
        { key: "status", label: "Status" },
        { key: "rejectReason", label: "Reject reason" },
        { key: "submitted", label: "Created" },
      ]}
      loadDetail={async (row) => fetchOrganizationDetail(row.id)}
      renderView={(detail) => <OrganizationDetailView detail={detail} />}
      kpis={[
        { label: "In queue", value: String(rows.length), tone: "warning" },
        { label: "Pending / unverified", value: String(pending), tone: "info" },
        { label: "Rejected", value: String(rejected), tone: "destructive" },
        {
          label: type === "restaurant" ? "Restaurants" : "Suppliers",
          value: String(rows.length),
        },
      ]}
      rows={rows.map((r) => ({ ...r, decision: "", reason: "" }))}
      searchKeys={["name", "email", "id", "region", "status"]}
      emptyHint={
        isLoading
          ? "Loading…"
          : isError
            ? `Failed to load ${type} approvals.`
            : `No pending ${type} approvals.`
      }
      columns={[
        {
          key: "id",
          label: "ID",
          className: "font-mono text-xs whitespace-nowrap w-[1%]",
          render: (r) => String(r.id).slice(0, 8),
        },
        {
          key: "name",
          label: type === "restaurant" ? "Restaurant" : "Supplier",
          className: "whitespace-nowrap",
          render: (r) => <span className="font-medium">{r.name}</span>,
        },
        { key: "email", label: "Email", className: "whitespace-nowrap" },
        { key: "region", label: "Region", className: "whitespace-nowrap w-[1%]" },
        { key: "submitted", label: "Created", className: "whitespace-nowrap w-[1%]" },
        {
          key: "verificationStatus",
          label: "Verification",
          className: "whitespace-nowrap w-[1%]",
          render: (r) => (
            <StatusBadge status={r.verificationStatus !== "—" ? r.verificationStatus : r.status} />
          ),
        },
        {
          key: "status",
          label: "Status",
          className: "whitespace-nowrap w-[1%]",
          render: (r) => <StatusBadge status={r.status} />,
        },
      ]}
      onUpdate={async (id, data, row) => {
        const decision = String(data.decision || "").trim().toLowerCase();
        const reason = String(data.reason || "").trim();
        if (!decision) throw new Error("Select a decision: approve, reject, activate, or deactivate");
        if (decision === "approve") {
          await approveOrganization(id, reason || undefined);
        } else if (decision === "reject") {
          if (!reason) throw new Error("Reason is required to reject");
          await rejectOrganization(id, reason);
        } else if (decision === "activate") {
          await activateOrganization(id, reason || undefined);
        } else if (decision === "deactivate") {
          await deactivateOrganization(id, reason || undefined);
        } else {
          throw new Error("Unknown decision");
        }
        await queryClient.invalidateQueries({ queryKey: [...queryKey] });
        await queryClient.invalidateQueries({ queryKey: ["organizations", type] });
        return {
          ...row,
          decision,
          reason,
          status:
            decision === "approve" || decision === "activate"
              ? "active"
              : decision === "reject"
                ? "rejected"
                : "suspended",
          verificationStatus:
            decision === "approve" || decision === "activate"
              ? "verified"
              : decision === "reject"
                ? "rejected"
                : row.verificationStatus,
          rejectReason: decision === "reject" ? reason : row.rejectReason,
        };
      }}
    />
  );
}
