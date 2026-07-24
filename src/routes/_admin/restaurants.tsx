import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DataPage, StatusBadge, AED } from "@/components/admin/DataPage";
import { ExternalLink, Store } from "lucide-react";
import {
  enrichOrganizationRow,
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
  const { categories } = useAdminLookups();
  const queryClient = useQueryClient();

  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["organizations", "restaurant"],
    queryFn: async () => {
      const base = await fetchOrganizationsByType("restaurant");
      // Enrich with settings + profile (best-effort, capped concurrency feel via Promise.all)
      return Promise.all(base.map((r) => enrichOrganizationRow(r, "restaurant")));
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
          render: (r) => {
            const docs = (r.documents as OrgDoc[]) || [];
            if (!docs.length) {
              return <span className="text-xs text-muted-foreground">No documents</span>;
            }
            return (
              <div className="flex flex-col gap-1 max-w-[220px]">
                {docs.map((d, i) =>
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
        return enrichOrganizationRow(
          {
            ...updated,
            poApprovalLevels: Number(data.poApprovalLevels ?? updated.poApprovalLevels),
            minRfqValueAed: Number(data.minRfqValueAed ?? updated.minRfqValueAed),
            ownerName: String(data.ownerName ?? ""),
            tradeLicenseNumber: String(data.tradeLicenseNumber ?? ""),
            vatRegistrationNumber: String(data.vatRegistrationNumber ?? ""),
            foodLicenseNumber: String(data.foodLicenseNumber ?? ""),
            cuisines: String(data.cuisines || updated.cuisines || updated.industry || "—"),
          },
          "restaurant",
        );
      }}
    />
  );
}
