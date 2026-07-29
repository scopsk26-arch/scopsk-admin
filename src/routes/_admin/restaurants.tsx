import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DataPage, StatusBadge, AED } from "@/components/admin/DataPage";
import { OrganizationDetailView } from "@/components/admin/DetailViews";
import { ExternalLink, Store } from "lucide-react";
import {
  fetchOrganizationDetail,
  fetchOrganizationsByType,
  updateOrganization,
  updateOrgProfile,
  updateOrgSettings,
} from "@/lib/api/resources";
import { useAdminLookups } from "@/hooks/useAdminLookups";

type OrgDoc = { id?: string; type: string; url?: string; fileName?: string };

export const Route = createFileRoute("/_admin/restaurants")({
  head: () => ({ meta: [{ title: "Restaurants — Prime Plate" }] }),
  component: RestaurantsPage,
});

function RestaurantsPage() {
  const { categories } = useAdminLookups(["categories"]);
  const queryClient = useQueryClient();

  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["organizations", "restaurant"],
    staleTime: 60_000,
    queryFn: async () => {
      // List API already embeds profile + settings — do not N+1 /profile + /settings per row.
      return fetchOrganizationsByType("restaurant");
    },
  });

  const active = rows.filter((r) => r.status === "active").length;
  const pending = rows.filter((r) => r.status === "pending").length;
  const spend = rows.reduce((s, r) => s + (r.spend || 0), 0);

  return (
    <DataPage
      title="Restaurants"
      description="Manage onboarded restaurants, cuisines, KYC/profile fields and org procurement settings."
      icon={<Store className="h-5 w-5 text-primary" />}
      lookups={{
        categories: categories.map((c) => ({ value: c.label, label: c.label })),
        category: categories.map((c) => ({ value: c.label, label: c.label })),
      }}
      formFields={[
        { key: "name", label: "Restaurant", type: "text" },
        { key: "cuisines", label: "Cuisines", type: "text", placeholder: "From registration / metadata" },
        { key: "region", label: "Region", type: "text" },
        { key: "ownerName", label: "Owner name", type: "text" },
        { key: "tradeLicenseNumber", label: "Trade license #", type: "text" },
        { key: "vatRegistrationNumber", label: "VAT registration #", type: "text" },
        { key: "foodLicenseNumber", label: "Food license #", type: "text" },
        { key: "poApprovalLevels", label: "PO approval levels", type: "number" },
        { key: "minRfqValueAed", label: "Min RFQ value (AED)", type: "number" },
        {
          key: "status",
          label: "Status",
          type: "select",
          options: ["active", "pending", "suspended", "rejected"],
        },
      ]}
      viewFields={[
        { key: "name", label: "Restaurant" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "legalName", label: "Legal name" },
        { key: "cuisines", label: "Cuisines" },
        { key: "region", label: "Region" },
        { key: "ownerName", label: "Owner" },
        { key: "tradeLicenseNumber", label: "Trade license" },
        { key: "vatRegistrationNumber", label: "VAT #" },
        { key: "foodLicenseNumber", label: "Food license" },
        { key: "poApprovalLevels", label: "PO approval levels" },
        { key: "minRfqValueAed", label: "Min RFQ (AED)" },
        { key: "verificationStatus", label: "Verification" },
        { key: "status", label: "Status" },
        { key: "documentCount", label: "Documents" },
      ]}
      loadDetail={async (row) => fetchOrganizationDetail(row.id)}
      renderView={(detail) => <OrganizationDetailView detail={detail} />}
      kpis={[
        { label: "Total restaurants", value: String(rows.length) },
        { label: "Active", value: String(active), tone: "success" },
        { label: "Pending verification", value: String(pending), tone: "warning" },
        { label: "Total spend", value: AED(spend), tone: "info" },
      ]}
      rows={rows}
      searchKeys={["name", "region", "cuisines", "industry", "tradeLicenseNumber", "id"]}
      emptyHint={isLoading ? "Loading…" : isError ? "Failed to load restaurants." : "No restaurants found."}
      columns={[
        { key: "id", label: "ID", className: "font-mono text-xs", render: (r) => String(r.id).slice(0, 8) },
        { key: "name", label: "Restaurant", render: (r) => <span className="font-medium">{r.name}</span> },
        { key: "cuisines", label: "Cuisines" },
        { key: "region", label: "Region" },
        { key: "tradeLicenseNumber", label: "Trade license", className: "font-mono text-xs" },
        {
          key: "documents",
          label: "Documents",
          className: "whitespace-nowrap w-[1%]",
          render: (r) => {
            const docs = (r.documents as OrgDoc[]) || [];
            const count = docs.length || Number(r.documentCount || 0);
            if (!count) {
              return <span className="text-xs text-muted-foreground">None</span>;
            }
            if (!docs.length) {
              return <span className="text-xs text-muted-foreground">{count} file(s)</span>;
            }
            return (
              <div className="flex flex-col gap-1 max-w-[220px]">
                {docs.slice(0, 3).map((d, i) =>
                  d.url ? (
                    <a
                      key={d.id || `${d.type}-${i}`}
                      href={d.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      <span className="truncate">{(d.type || d.fileName || "file").replace(/_/g, " ")}</span>
                    </a>
                  ) : (
                    <span key={d.id || `${d.type}-${i}`} className="text-xs text-muted-foreground truncate">
                      {(d.type || "document").replace(/_/g, " ")}
                    </span>
                  ),
                )}
                {docs.length > 3 && (
                  <span className="text-xs text-muted-foreground">+{docs.length - 3} more</span>
                )}
              </div>
            );
          },
        },
        { key: "poApprovalLevels", label: "PO levels" },
        { key: "minRfqValueAed", label: "Min RFQ", render: (r) => AED(r.minRfqValueAed) },
        {
          key: "verificationStatus",
          label: "KYC",
          render: (r) => <StatusBadge status={r.verificationStatus !== "—" ? r.verificationStatus : r.status} />,
        },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
      onUpdate={async (id, data) => {
        if (!data.name?.trim()) throw new Error("Restaurant name is required");
        const updated = await updateOrganization(
          id,
          { ...data, industry: data.cuisines || data.industry },
          "restaurant",
        );
        await updateOrgSettings(id, {
          poApprovalLevels: data.poApprovalLevels,
          minRfqValueAed: data.minRfqValueAed,
        });
        await updateOrgProfile(id, data);
        await queryClient.invalidateQueries({ queryKey: ["organizations", "restaurant"] });
        return {
          ...updated,
          poApprovalLevels: Number(data.poApprovalLevels ?? updated.poApprovalLevels),
          minRfqValueAed: Number(data.minRfqValueAed ?? updated.minRfqValueAed),
          ownerName: String(data.ownerName ?? updated.ownerName ?? ""),
          tradeLicenseNumber: String(data.tradeLicenseNumber ?? updated.tradeLicenseNumber ?? ""),
          vatRegistrationNumber: String(
            data.vatRegistrationNumber ?? updated.vatRegistrationNumber ?? "",
          ),
          foodLicenseNumber: String(data.foodLicenseNumber ?? updated.foodLicenseNumber ?? ""),
          cuisines: String(data.cuisines || updated.cuisines || updated.industry || "—"),
        };
      }}
    />
  );
}
