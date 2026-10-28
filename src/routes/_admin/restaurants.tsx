import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { pagedListProps, usePagedList } from "@/hooks/usePagedList";
import { DataPage, StatusBadge, AED } from "@/components/admin/DataPage";
import { OrganizationDetailView } from "@/components/admin/DetailViews";
import { TagListDropdown } from "@/components/admin/TagListDropdown";
import { Store } from "lucide-react";
import {
  fetchOrganizationDetail,
  mapOrgRow,
  deleteOrganization,
  updateOrganization,
  updateOrgProfile,
  updateOrgSettings,
} from "@/lib/api/resources";
import { api } from "@/lib/api/client";
import { useAdminLookups } from "@/hooks/useAdminLookups";
import { PAYMENT_TERM_OPTIONS, areaOptions } from "@/lib/org-app-fields";

type OrgDoc = { id?: string; type: string; url?: string; fileName?: string; status?: string };

export const Route = createFileRoute("/_admin/restaurants")({
  head: () => ({ meta: [{ title: "Restaurants — ScopsK" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    open: typeof search.open === "string" ? search.open : undefined,
  }),
  component: RestaurantsPage,
});

function RestaurantsPage() {
  const navigate = Route.useNavigate();
  const { open: openId } = Route.useSearch();
  const { cuisines: cuisineOptions } = useAdminLookups(["cuisines"]);
  const cuisineLookups = useMemo(
    () => ({ cuisineIds: cuisineOptions, dubaiArea: areaOptions() }),
    [cuisineOptions],
  );
  const queryClient = useQueryClient();

  const list = usePagedList({
    queryKey: ["organizations", "restaurant"],
    path: "/organizations",
    query: { type: "restaurant" },
    map: (row) => mapOrgRow(row, "restaurant"),
  });
  const rows = list.rows;
  const isLoading = list.isLoading;
  const isError = list.isError;

  const active = rows.filter((r) => r.status === "active").length;
  const pending = rows.filter((r) => r.status === "pending").length;
  const spend = rows.reduce((s, r) => s + (r.spend || 0), 0);

  return (
    <DataPage
      title="Restaurants"
      description="Review restaurant accounts, documents, and payment terms."
      icon={<Store className="h-5 w-5 text-primary" />}
      lookups={cuisineLookups}
      formFields={[
        { key: "name", label: "Restaurant", required: true, type: "text" },
        { key: "branchName", label: "Branch name", type: "text" },
        { key: "ownerName", label: "Owner name", type: "text" },
        { key: "email", label: "Business email", type: "text", placeholder: "ops@restaurant.com" },
        { key: "phone", label: "Mobile number", type: "text" },
        {
          key: "dubaiArea",
          label: "Area / neighborhood",
          type: "searchable",
          placeholder: "Select area…",
        },
        { key: "address", label: "Building & street", type: "text" },
        { key: "city", label: "City / emirate", type: "text" },
        { key: "country", label: "Country", type: "text" },
        {
          key: "cuisineIds",
          label: "Cuisines",
          type: "multiselect",
          placeholder: "Select cuisines…",
        },
        {
          key: "purchasingTerms",
          label: "How they pay",
          type: "select",
          options: PAYMENT_TERM_OPTIONS,
        },
        { key: "requestedCreditLimit", label: "Requested credit (AED)", type: "number", min: 0 },
        { key: "paymentTermsDays", label: "Credit duration (days)", type: "number", min: 0 },
        { key: "creditLimit", label: "Approved credit limit (AED)", type: "number", min: 0 },
        { key: "bankName", label: "Bank name", type: "text" },
        { key: "bankAccountName", label: "Account holder", type: "text" },
        { key: "bankAccountNumber", label: "Account number", type: "text" },
        { key: "bankIban", label: "IBAN", type: "text" },
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
        { key: "branchName", label: "Branch" },
        { key: "ownerName", label: "Owner" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "dubaiArea", label: "Area" },
        { key: "address", label: "Street" },
        { key: "city", label: "City" },
        { key: "country", label: "Country" },
        { key: "status", label: "Status" },
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
          ...mapped,
          cuisineIds,
          creditPeriod: mapped.creditPeriod === "week" ? "week" : "month",
        };
      }}
      autoOpenId={openId}
      onAutoOpened={() => {
        if (openId) void navigate({ to: "/restaurants", search: {} });
      }}
      renderView={(detail, row) => <OrganizationDetailView detail={detail} row={row} />}
      kpis={[
        { label: "Total restaurants", value: String(list.total) },
        { label: "Active", value: String(active), tone: "success" },
        { label: "Pending verification", value: String(pending), tone: "warning" },
        { label: "Total spend", value: AED(spend), tone: "info" },
      ]}
      rows={rows}
      serverPagination={pagedListProps(list)}
      onStatusChange={async (id, status) => {
        await updateOrganization(id, { status }, "restaurant");
        await queryClient.invalidateQueries({ queryKey: ["organizations", "restaurant"] });
      }}
      searchKeys={["name", "email", "region", "cuisines", "industry", "id"]}
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
          key: "email",
          label: "Email",
          className: "whitespace-nowrap",
          render: (r) =>
            r.email ? (
              <span className="text-sm">{r.email}</span>
            ) : (
              <span className="text-muted-foreground">—</span>
            ),
        },
        {
          key: "cuisines",
          label: "Cuisines",
          className: "whitespace-nowrap max-w-[220px]",
          render: (r) => <TagListDropdown value={r.cuisines || r.categories || r.industry} />,
        },
        { key: "phone", label: "Phone" },
        { key: "branchName", label: "Branch" },
        { key: "dubaiArea", label: "Area" },
        { key: "city", label: "City" },
        {
          key: "rating",
          label: "Rating",
          className: "whitespace-nowrap w-[1%]",
          render: (r) => (r.rating > 0 ? String(r.rating) : "—"),
        },
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
            const pending = docs.filter((d) => !d.status || d.status === "pending").length;
            const rejected = docs.filter((d) => d.status === "rejected").length;
            const tone = rejected ? "rejected" : pending ? "pending" : "approved";
            return (
              <span className="inline-flex items-center gap-2">
                <span className="text-xs tabular-nums">{count}</span>
                <StatusBadge status={docs.length ? tone : "pending"} />
              </span>
            );
          },
        },
        { key: "poApprovalLevels", label: "PO levels" },
        { key: "minRfqValueAed", label: "Min RFQ", render: (r) => AED(r.minRfqValueAed) },
        {
          key: "purchasingTerms",
          label: "Payment",
          className: "whitespace-nowrap",
          render: (r) => {
            const key = String(r.purchasingTerms || "").toLowerCase();
            if (key === "cash_only") return "Cash";
            if (key === "credit_only") return "Credit";
            if (key === "cash_or_credit") return "Cash & credit";
            return r.paymentTermsDays > 0 ? "Cash & credit" : "Cash";
          },
        },
        {
          key: "requestedCreditLimit",
          label: "Requested credit",
          render: (r) =>
            r.requestedCreditLimit > 0 ? (
              <span>
                {AED(r.requestedCreditLimit)}
                {r.paymentTermsDays > 0 ? (
                  <span className="text-muted-foreground"> · {r.paymentTermsDays}d</span>
                ) : null}
              </span>
            ) : (
              "—"
            ),
        },
        { key: "creditLimit", label: "Live credit", render: (r) => AED(r.creditLimit) },
        { key: "paymentTermsDays", label: "Terms (d)" },
        {
          key: "verificationStatus",
          label: "KYC",
          render: (r) => (
            <StatusBadge status={r.verificationStatus !== "—" ? r.verificationStatus : r.status} />
          ),
        },
        { key: "status", label: "Status" },
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
          creditPeriod: data.creditPeriod === "week" ? "week" : "month",
          paymentTermsDays,
          discountMode: data.discountMode,
          discountValue,
          metadata: {
            purchasingTerms: data.purchasingTerms,
            requestedCreditLimit: nonNeg(data.requestedCreditLimit),
          },
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
          creditPeriod: data.creditPeriod === "week" ? "week" : "month",
          paymentTermsDays,
          discountMode: String(data.discountMode ?? updated.discountMode ?? "none"),
          discountValue,
          email: String(data.email ?? updated.email ?? ""),
          ownerName: String(data.ownerName ?? updated.ownerName ?? ""),
          cuisineIds,
          cuisines: cuisineLabel || updated.cuisines || "—",
          phone: String(data.phone ?? updated.phone ?? ""),
          branchName: String(data.branchName ?? updated.branchName ?? ""),
          dubaiArea: String(data.dubaiArea ?? updated.dubaiArea ?? ""),
          address: String(data.address ?? updated.address ?? ""),
          city: String(data.city ?? updated.city ?? ""),
          country: String(data.country ?? updated.country ?? ""),
          purchasingTerms: String(data.purchasingTerms ?? updated.purchasingTerms ?? ""),
          requestedCreditLimit: nonNeg(data.requestedCreditLimit),
          bankName: String(data.bankName ?? updated.bankName ?? ""),
          bankAccountName: String(data.bankAccountName ?? updated.bankAccountName ?? ""),
          bankAccountNumber: String(data.bankAccountNumber ?? updated.bankAccountNumber ?? ""),
          bankIban: String(data.bankIban ?? updated.bankIban ?? ""),
        };
      }}
      onDelete={async (id) => {
        await deleteOrganization(id);
        await queryClient.invalidateQueries({ queryKey: ["organizations", "restaurant"] });
      }}
    />
  );
}
