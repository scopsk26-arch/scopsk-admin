import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DataPage, StatusBadge, AED } from "@/components/admin/DataPage";
import { OrganizationDetailView } from "@/components/admin/DetailViews";
import { TagListDropdown } from "@/components/admin/TagListDropdown";
import { ExternalLink, Store } from "lucide-react";
import {
  fetchOrganizationDetail,
  fetchOrganizationsByType,
  mapOrgRow,
  updateOrganization,
  updateOrgProfile,
  updateOrgSettings,
} from "@/lib/api/resources";
import { api } from "@/lib/api/client";
import { useAdminLookups } from "@/hooks/useAdminLookups";

type OrgDoc = { id?: string; type: string; url?: string; fileName?: string };

export const Route = createFileRoute("/_admin/restaurants")({
  head: () => ({ meta: [{ title: "Restaurants — ScopsK" }] }),
  component: RestaurantsPage,
});

function RestaurantsPage() {
  const { cuisines: cuisineOptions } = useAdminLookups(["cuisines"]);
  const cuisineLookups = useMemo(() => ({ cuisineIds: cuisineOptions }), [cuisineOptions]);
  const queryClient = useQueryClient();

  const {
    data: rows = [],
    isLoading,
    isError,
  } = useQuery({
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
      lookups={cuisineLookups}
      formFields={[
        { key: "name", label: "Restaurant", required: true, type: "text" },
        {
          key: "cuisineIds",
          label: "Cuisines",
          type: "multiselect",
          placeholder: "Select cuisines…",
        },
        { key: "region", label: "Region", type: "text" },
        { key: "ownerName", label: "Owner name", type: "text" },
        { key: "tradeLicenseNumber", label: "Trade license #", type: "text" },
        { key: "vatRegistrationNumber", label: "VAT registration #", type: "text" },
        { key: "foodLicenseNumber", label: "Food license #", type: "text" },
        { key: "rating", label: "Rating (0–5)", type: "number", min: 0, max: 5 },
        { key: "poApprovalLevels", label: "PO approval levels", type: "number", min: 0 },
        { key: "minRfqValueAed", label: "Min RFQ value (AED)", type: "number", min: 0 },
        {
          key: "deliveryFeeMode",
          label: "Delivery fee mode",
          type: "select",
          options: ["none", "fixed", "percent"],
        },
        { key: "deliveryFeeValue", label: "Delivery fee value", type: "number", min: 0 },
        { key: "creditLimit", label: "Credit limit (AED)", type: "number", min: 0 },
        { key: "paymentTermsDays", label: "Payment terms (days)", type: "number", min: 0 },
        {
          key: "discountMode",
          label: "Discount mode",
          type: "select",
          options: ["none", "fixed", "percent"],
        },
        { key: "discountValue", label: "Discount value", type: "number", min: 0 },
        {
          key: "status",
          label: "Status",
          required: true,
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
        { key: "rating", label: "Rating (0–5)" },
        { key: "poApprovalLevels", label: "PO approval levels" },
        { key: "minRfqValueAed", label: "Min RFQ (AED)" },
        { key: "deliveryFeeMode", label: "Delivery fee mode" },
        { key: "deliveryFeeValue", label: "Delivery fee value" },
        { key: "creditLimit", label: "Credit limit" },
        { key: "paymentTermsDays", label: "Payment terms (days)" },
        { key: "discountMode", label: "Discount mode" },
        { key: "discountValue", label: "Discount value" },
        { key: "verificationStatus", label: "Verification" },
        { key: "status", label: "Status" },
        { key: "documentCount", label: "Documents" },
      ]}
      loadDetail={async (row) => fetchOrganizationDetail(row.id)}
      loadEdit={async (row) => {
        const detail = await fetchOrganizationDetail(row.id);
        let mapped = mapOrgRow(detail, "restaurant");
        if (!mapped.cuisineIds.length) {
          try {
            const profile = await api.get<any>("/restaurants/profile", {
              headers: { "X-Organization-Id": row.id },
            });
            mapped = mapOrgRow({ ...detail, ...profile }, "restaurant");
          } catch {
            // list/detail already tried
          }
        }
        let cuisineIds = mapped.cuisineIds;
        if (!cuisineIds.length && mapped.cuisines && mapped.cuisines !== "—") {
          const names = String(mapped.cuisines)
            .split(/[,;|]/)
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean);
          cuisineIds = cuisineOptions
            .filter((o) => names.includes(o.label.toLowerCase()))
            .map((o) => o.value);
        }
        return {
          cuisineIds,
          cuisines: mapped.cuisines,
          rating: mapped.rating,
          deliveryFeeMode: mapped.deliveryFeeMode,
          deliveryFeeValue: mapped.deliveryFeeValue,
          creditLimit: mapped.creditLimit,
          paymentTermsDays: mapped.paymentTermsDays,
          discountMode: mapped.discountMode,
          discountValue: mapped.discountValue,
        };
      }}
      renderView={(detail) => <OrganizationDetailView detail={detail} />}
      kpis={[
        { label: "Total restaurants", value: String(rows.length) },
        { label: "Active", value: String(active), tone: "success" },
        { label: "Pending verification", value: String(pending), tone: "warning" },
        { label: "Total spend", value: AED(spend), tone: "info" },
      ]}
      rows={rows}
      searchKeys={["name", "region", "cuisines", "industry", "tradeLicenseNumber", "id"]}
      emptyHint={
        isLoading ? "Loading…" : isError ? "Failed to load restaurants." : "No restaurants found."
      }
      columns={[
        {
          key: "id",
          label: "ID",
          className: "font-mono text-xs",
          render: (r) => String(r.id).slice(0, 8),
        },
        {
          key: "name",
          label: "Restaurant",
          render: (r) => <span className="font-medium">{r.name}</span>,
        },
        {
          key: "cuisines",
          label: "Cuisines",
          className: "whitespace-nowrap max-w-[220px]",
          render: (r) => <TagListDropdown value={r.cuisines || r.categories || r.industry} />,
        },
        { key: "region", label: "Region" },
        {
          key: "rating",
          label: "Rating",
          className: "whitespace-nowrap w-[1%]",
          render: (r) => (r.rating > 0 ? String(r.rating) : "—"),
        },
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
                      <span className="truncate">
                        {(d.type || d.fileName || "file").replace(/_/g, " ")}
                      </span>
                    </a>
                  ) : (
                    <span
                      key={d.id || `${d.type}-${i}`}
                      className="text-xs text-muted-foreground truncate"
                    >
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
        { key: "creditLimit", label: "Credit", render: (r) => AED(r.creditLimit) },
        { key: "paymentTermsDays", label: "Terms (d)" },
        {
          key: "verificationStatus",
          label: "KYC",
          render: (r) => (
            <StatusBadge status={r.verificationStatus !== "—" ? r.verificationStatus : r.status} />
          ),
        },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
      onUpdate={async (id, data) => {
        if (!data.name?.trim()) throw new Error("Restaurant name is required");
        const nonNeg = (v: unknown, fallback = 0) => {
          const n = Number(v);
          if (!Number.isFinite(n) || n < 0) return fallback;
          return n;
        };
        const cuisineIds = Array.isArray(data.cuisineIds)
          ? data.cuisineIds.map(String).filter(Boolean)
          : [];
        const cuisineLabel = cuisineOptions
          .filter((o) => cuisineIds.includes(o.value))
          .map((o) => o.label)
          .join(", ");
        const poApprovalLevels = nonNeg(data.poApprovalLevels);
        const minRfqValueAed = nonNeg(data.minRfqValueAed);
        const deliveryFeeValue = nonNeg(data.deliveryFeeValue);
        const creditLimit = nonNeg(data.creditLimit);
        const paymentTermsDays = nonNeg(data.paymentTermsDays);
        const discountValue = nonNeg(data.discountValue);
        const ratingRaw = Number(data.rating);
        const rating = Number.isFinite(ratingRaw) ? Math.min(5, Math.max(0, ratingRaw)) : 0;
        const updated = await updateOrganization(
          id,
          { ...data, cuisineIds, industry: cuisineLabel || data.industry, rating },
          "restaurant",
        );
        await updateOrgSettings(id, {
          poApprovalLevels,
          minRfqValueAed,
          deliveryFeeMode: data.deliveryFeeMode,
          deliveryFeeValue,
          creditLimit,
          paymentTermsDays,
          discountMode: data.discountMode,
          discountValue,
        });
        await updateOrgProfile(id, data);
        await queryClient.invalidateQueries({ queryKey: ["organizations", "restaurant"] });
        return {
          ...updated,
          rating: Number(updated.rating ?? rating),
          poApprovalLevels,
          minRfqValueAed,
          deliveryFeeMode: String(data.deliveryFeeMode ?? updated.deliveryFeeMode ?? "none"),
          deliveryFeeValue,
          creditLimit,
          paymentTermsDays,
          discountMode: String(data.discountMode ?? updated.discountMode ?? "none"),
          discountValue,
          ownerName: String(data.ownerName ?? updated.ownerName ?? ""),
          tradeLicenseNumber: String(data.tradeLicenseNumber ?? updated.tradeLicenseNumber ?? ""),
          vatRegistrationNumber: String(
            data.vatRegistrationNumber ?? updated.vatRegistrationNumber ?? "",
          ),
          foodLicenseNumber: String(data.foodLicenseNumber ?? updated.foodLicenseNumber ?? ""),
          cuisineIds,
          cuisines: cuisineLabel || updated.cuisines || "—",
        };
      }}
    />
  );
}
