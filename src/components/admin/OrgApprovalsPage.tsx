import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { OrganizationDetailView } from "@/components/admin/DetailViews";
import {
  AccountReviewDialog,
  accountWaitingOn,
  type AccountReviewRow,
} from "@/components/admin/AccountReviewDialog";
import type { LucideIcon } from "lucide-react";
import {
  fetchAdminWalletCreditRequests,
  fetchOrganizationDetail,
  fetchPendingOrganizations,
  mapOrgRow,
} from "@/lib/api/resources";

type OrgApprovalsPageProps = {
  type: "restaurant" | "supplier" | "both";
  title: string;
  description: string;
  icon: LucideIcon;
};

export function OrgApprovalsPage({ type, title, description, icon: Icon }: OrgApprovalsPageProps) {
  const queryClient = useQueryClient();
  const queryKey = ["organizations", type, "pendingApproval"] as const;
  const showsBoth = type === "both";
  const [review, setReview] = useState<AccountReviewRow | null>(null);

  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey,
    staleTime: 30_000,
    queryFn: async () => {
      const pending =
        type !== "both"
          ? await fetchPendingOrganizations(type)
          : (
              await Promise.all([
                fetchPendingOrganizations("restaurant"),
                fetchPendingOrganizations("supplier"),
              ])
            ).flat();
      const known = new Set(pending.map((row) => row.id));
      let openCreditIds: string[] = [];
      try {
        const credit = await fetchAdminWalletCreditRequests({ category: "credit_limit", limit: 100 });
        openCreditIds = [
          ...new Set(
            credit.rows
              .filter((item) => {
                const status = String(item.status || "").toLowerCase();
                return (
                  item.kind === "credit_limit" &&
                  item.organizationId &&
                  status !== "resolved" &&
                  status !== "closed"
                );
              })
              .map((item) => item.organizationId),
          ),
        ];
      } catch {
        openCreditIds = [];
      }
      const extras = (
        await Promise.all(
          openCreditIds
            .filter((id) => !known.has(id))
            .map(async (id) => {
              try {
                const detail = await fetchOrganizationDetail(id);
                const orgType = detail?.type === "supplier" ? "supplier" : "restaurant";
                if (type !== "both" && orgType !== type) return null;
                return { ...mapOrgRow(detail, orgType), openCredit: true as const };
              } catch {
                return null;
              }
            }),
        )
      ).filter((row): row is NonNullable<typeof row> => Boolean(row));
      const withCredit = new Set(openCreditIds);
      return [
        ...pending.map((row) => ({ ...row, openCredit: withCredit.has(row.id) })),
        ...extras,
      ];
    },
  });

  const pendingKyc = rows.filter((r) => accountWaitingOn(r) === "KYC").length;
  const creditWaiting = rows.filter((r) => accountWaitingOn(r) === "Credit request").length;
  const rejected = rows.filter((r) => String(r.status).toLowerCase() === "rejected").length;

  const refreshQueue = () => {
    void queryClient.invalidateQueries({ queryKey: ["organizations"] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "wallet-credit-requests"] });
  };

  return (
    <>
    <DataPage
      title={title}
      description={description}
      icon={<Icon className="h-5 w-5 text-primary" />}
      entityName={type === "restaurant" ? "Restaurant" : type === "supplier" ? "Supplier" : "Account"}
      viewFields={[
        { key: "name", label: "Organization" },
        { key: "ownerName", label: "Owner" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "branchName", label: "Branch" },
        { key: "dubaiArea", label: "Area" },
        { key: "city", label: "City" },
        { key: "country", label: "Country" },
        { key: "legalName", label: "Legal name" },
        { key: "verificationStatus", label: "KYC" },
        { key: "status", label: "Status" },
        { key: "rejectReason", label: "Reject reason" },
        { key: "submitted", label: "Created" },
      ]}
      loadDetail={async (row) => fetchOrganizationDetail(row.id)}
      renderView={(detail) => <OrganizationDetailView detail={detail} />}
      kpis={[
        { label: "In queue", value: String(rows.length), tone: "warning" },
        { label: "KYC waiting", value: String(pendingKyc), tone: "info" },
        { label: "Credit waiting", value: String(creditWaiting), tone: "warning" },
        { label: "Rejected", value: String(rejected), tone: "destructive" },
      ]}
      rows={rows}
      onRowClick={(row) => {
        setReview(row);
        return true;
      }}
      searchKeys={["name", "email", "id", "region", "status"]}
      emptyHint={
        isLoading
          ? "Loading…"
          : isError
            ? `Failed to load ${type} approvals.`
            : showsBoth
              ? "No pending restaurant or supplier accounts."
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
          label: showsBoth ? "Account" : type === "restaurant" ? "Restaurant" : "Supplier",
          className: "whitespace-nowrap",
          render: (r) => <span className="font-medium">{r.name}</span>,
        },
        ...(showsBoth
          ? [
              {
                key: "type" as const,
                label: "Type",
                className: "whitespace-nowrap w-[1%] capitalize",
                render: (r: { type?: string }) =>
                  r.type === "supplier" ? "Supplier" : "Restaurant",
              },
            ]
          : []),
        { key: "email", label: "Email", className: "whitespace-nowrap" },
        { key: "phone", label: "Phone", className: "whitespace-nowrap w-[1%]" },
        { key: "dubaiArea", label: "Area", className: "whitespace-nowrap w-[1%]" },
        { key: "city", label: "City", className: "whitespace-nowrap w-[1%]" },
        { key: "submitted", label: "Created", className: "whitespace-nowrap w-[1%]" },
        {
          key: "verificationStatus",
          label: "KYC",
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
        {
          key: "waitingOn",
          label: "Waiting on",
          className: "whitespace-nowrap w-[1%]",
          render: (r) => {
            const waiting = accountWaitingOn(r);
            const tone =
              waiting === "Closed" || waiting === "Suspended"
                ? "destructive"
                : waiting === "Done"
                  ? "success"
                  : "warning";
            return <StatusBadge status={waiting} tone={tone} />;
          },
        },
      ]}
    />
    <AccountReviewDialog
      row={review}
      open={review !== null}
      onOpenChange={(next) => {
        if (!next) setReview(null);
      }}
      onUpdated={refreshQueue}
    />
    </>
  );
}
