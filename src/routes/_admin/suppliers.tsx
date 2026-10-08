import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DataPage, StatusBadge, AED } from "@/components/admin/DataPage";
import { OrganizationDetailView } from "@/components/admin/DetailViews";
import { TagListDropdown } from "@/components/admin/TagListDropdown";
import { Truck } from "lucide-react";
import {
  fetchOrganizationDetail,
  fetchOrganizationsByType,
  updateOrganization,
  updateOrgProfile,
  updateOrgSettings,
} from "@/lib/api/resources";
import { useAdminLookups } from "@/hooks/useAdminLookups";

export const Route = createFileRoute("/_admin/suppliers")({
  head: () => ({ meta: [{ title: "Suppliers — ScopsK" }] }),
  component: SuppliersPage,
});

function SuppliersPage() {
  const { categories } = useAdminLookups(["categories"]);
  const queryClient = useQueryClient();

  const {
    data: rows = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["organizations", "supplier"],
    staleTime: 60_000,
    queryFn: async () => {
      // List API already embeds profile + settings — do not N+1 /profile + /settings per row.
      return fetchOrganizationsByType("supplier");
    },
  });

  const verified = rows.filter((r) => ["verified", "active"].includes(r.status)).length;
  const pending = rows.filter((r) => r.status === "pending").length;
  const avgWin = rows.length
    ? Math.round(rows.reduce((s, r) => s + (r.winRate || 0), 0) / rows.length)
    : 0;

  const categoryOptions = categories.map((c) => ({ value: c.label, label: c.label }));

  return (
    <DataPage
      title="Suppliers"
      description="Vetted suppliers with performance, win-rate and category coverage."
      icon={<Truck className="h-5 w-5 text-primary" />}
      entityName="Supplier"
      lookups={{
        categories: categoryOptions,
        category: categoryOptions,
      }}
      formFields={[
        { key: "name", label: "Supplier", required: true, type: "text" },
        {
          key: "email",
          label: "Email",
          required: true,
          type: "text",
          placeholder: "ops@supplier.com",
        },
        { key: "phone", label: "Phone", type: "text" },
        {
          key: "categories",
          label: "Category",
          type: "searchable",
          selectOptions: categoryOptions,
          placeholder: "Search categories…",
        },
        { key: "ownerName", label: "Owner name", type: "text" },
        { key: "tradeLicenseNumber", label: "Trade license #", type: "text" },
        { key: "vatRegistrationNumber", label: "VAT registration #", type: "text" },
        { key: "poApprovalLevels", label: "PO approval levels", type: "number" },
        { key: "minRfqValueAed", label: "Min RFQ value (AED)", type: "number" },
        {
          key: "rfqIntakeMode",
          label: "RFQ intake mode",
          type: "select",
          options: ["manual", "auto"],
        },
        {
          key: "status",
          label: "Status",
          required: true,
          type: "select",
          options: ["active", "pending", "verified", "suspended", "rejected"],
        },
      ]}
      viewFields={[
        { key: "name", label: "Supplier" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "legalName", label: "Legal name" },
        { key: "region", label: "Region" },
        { key: "ownerName", label: "Owner" },
        { key: "tradeLicenseNumber", label: "Trade license" },
        { key: "vatRegistrationNumber", label: "VAT #" },
        { key: "poApprovalLevels", label: "PO approval levels" },
        { key: "minRfqValueAed", label: "Min RFQ (AED)" },
        { key: "rfqIntakeMode", label: "RFQ intake" },
        { key: "revenue", label: "Revenue (90d)" },
        { key: "winRate", label: "Win rate" },
        { key: "verificationStatus", label: "Verification" },
        { key: "status", label: "Status" },
      ]}
      loadDetail={async (row) => fetchOrganizationDetail(row.id)}
      renderView={(detail) => <OrganizationDetailView detail={detail} />}
      kpis={[
        { label: "Total suppliers", value: String(rows.length) },
        { label: "Verified", value: String(verified), tone: "success" },
        { label: "Pending review", value: String(pending), tone: "warning" },
        { label: "Avg. win-rate", value: `${avgWin}%`, tone: "info" },
      ]}
      rows={rows}
      searchKeys={["name", "id", "email", "status"]}
      emptyHint={
        isLoading ? "Loading…" : isError ? "Failed to load suppliers." : "No suppliers found."
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
          label: "Supplier",
          render: (r) => <span className="font-medium">{r.name}</span>,
        },
        {
          key: "categories",
          label: "Categories",
          className: "whitespace-nowrap max-w-[220px]",
          render: (r) => <TagListDropdown value={r.categories} />,
        },
        { key: "poApprovalLevels", label: "PO levels" },
        { key: "minRfqValueAed", label: "Min RFQ", render: (r) => AED(r.minRfqValueAed) },
        {
          key: "rfqIntakeMode",
          label: "RFQ intake",
          className: "capitalize whitespace-nowrap",
          render: (r) => String(r.rfqIntakeMode || "manual"),
        },
        { key: "revenue", label: "Revenue (90d)", render: (r) => AED(r.revenue) },
        { key: "winRate", label: "Win rate", render: (r) => `${r.winRate}%` },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
      onUpdate={async (id, data) => {
        if (!id || id === "undefined") throw new Error("Missing supplier id");
        if (!data.name?.trim()) throw new Error("Supplier name is required");
        const payload = {
          ...data,
          categories: Array.isArray(data.categories)
            ? data.categories
            : data.categories
              ? String(data.categories)
              : [],
        };
        const updated = await updateOrganization(id, payload, "supplier");
        await updateOrgSettings(id, {
          poApprovalLevels: data.poApprovalLevels,
          minRfqValueAed: data.minRfqValueAed,
          rfqIntakeMode: data.rfqIntakeMode,
        });
        await updateOrgProfile(id, data);
        await queryClient.invalidateQueries({ queryKey: ["organizations", "supplier"] });
        return {
          ...updated,
          poApprovalLevels: Number(data.poApprovalLevels ?? updated.poApprovalLevels),
          minRfqValueAed: Number(data.minRfqValueAed ?? updated.minRfqValueAed),
          rfqIntakeMode: String(data.rfqIntakeMode ?? updated.rfqIntakeMode ?? "manual"),
          ownerName: String(data.ownerName ?? updated.ownerName ?? ""),
          tradeLicenseNumber: String(data.tradeLicenseNumber ?? updated.tradeLicenseNumber ?? ""),
          vatRegistrationNumber: String(
            data.vatRegistrationNumber ?? updated.vatRegistrationNumber ?? "",
          ),
        };
      }}
    />
  );
}
