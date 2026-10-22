import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { pagedListProps, usePagedList } from "@/hooks/usePagedList";
import { DataPage, AED } from "@/components/admin/DataPage";
import { OrganizationDetailView } from "@/components/admin/DetailViews";
import { TagListDropdown } from "@/components/admin/TagListDropdown";
import { Truck } from "lucide-react";
import {
  deleteOrganization,
  fetchOrganizationDetail,
  mapOrgRow,
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
  const { cuisines: cuisineOptions } = useAdminLookups(["cuisines"]);
  const cuisineLookups = useMemo(() => ({ cuisineIds: cuisineOptions }), [cuisineOptions]);
  const queryClient = useQueryClient();

  const list = usePagedList({
    queryKey: ["organizations", "supplier"],
    path: "/organizations",
    query: { type: "supplier" },
    map: (row) => mapOrgRow(row, "supplier"),
  });
  const rows = list.rows;
  const isLoading = list.isLoading;
  const isError = list.isError;

  const verified = rows.filter((r) => ["verified", "active"].includes(r.status)).length;
  const pending = rows.filter((r) => r.status === "pending").length;
  const avgWin = rows.length
    ? Math.round(rows.reduce((s, r) => s + (r.winRate || 0), 0) / rows.length)
    : 0;

  return (
    <DataPage
      title="Suppliers"
      description="Vetted suppliers with performance, win-rate and cuisine coverage."
      icon={<Truck className="h-5 w-5 text-primary" />}
      entityName="Supplier"
      lookups={cuisineLookups}
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
          key: "cuisineIds",
          label: "Cuisines",
          type: "multiselect",
          placeholder: "Select cuisines…",
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
        { key: "status", label: "Status" },
      ]}
      loadDetail={async (row) => fetchOrganizationDetail(row.id)}
      loadEdit={async (row) => {
        const detail = await fetchOrganizationDetail(row.id);
        const mapped = mapOrgRow(detail, "supplier");
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
          poApprovalLevels: mapped.poApprovalLevels,
          minRfqValueAed: mapped.minRfqValueAed,
          rfqIntakeMode: mapped.rfqIntakeMode,
        };
      }}
      renderView={(detail, row) => <OrganizationDetailView detail={detail} row={row} />}
      kpis={[
        { label: "Total suppliers", value: String(list.total) },
        { label: "Verified", value: String(verified), tone: "success" },
        { label: "Pending review", value: String(pending), tone: "warning" },
        { label: "Avg. win-rate", value: `${avgWin}%`, tone: "info" },
      ]}
      rows={rows}
      serverPagination={pagedListProps(list)}
      onStatusChange={async (id, status) => {
        await updateOrganization(id, { status }, "supplier");
        await queryClient.invalidateQueries({ queryKey: ["organizations", "supplier"] });
      }}
      searchKeys={["name", "id", "email", "cuisines", "status"]}
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
          render: (r) => <TagListDropdown value={r.cuisines || r.categories} />,
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
        { key: "status", label: "Status" },
      ]}
      onUpdate={async (id, data) => {
        if (!id || id === "undefined") throw new Error("Missing supplier id");
        if (!data.name?.trim()) throw new Error("Supplier name is required");
        const cuisineIds = Array.isArray(data.cuisineIds)
          ? data.cuisineIds.map(String).filter(Boolean)
          : [];
        const cuisineLabel = cuisineOptions
          .filter((o) => cuisineIds.includes(o.value))
          .map((o) => o.label)
          .join(", ");
        const payload = {
          ...data,
          cuisineIds,
          industry: cuisineLabel || data.industry,
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
          email: String(data.email ?? updated.email ?? ""),
          ownerName: String(data.ownerName ?? updated.ownerName ?? ""),
          tradeLicenseNumber: String(data.tradeLicenseNumber ?? updated.tradeLicenseNumber ?? ""),
          vatRegistrationNumber: String(
            data.vatRegistrationNumber ?? updated.vatRegistrationNumber ?? "",
          ),
          cuisineIds,
          cuisines: cuisineLabel || updated.cuisines || "—",
        };
      }}
      onDelete={async (id) => {
        await deleteOrganization(id);
        await queryClient.invalidateQueries({ queryKey: ["organizations", "supplier"] });
      }}
    />
  );
}
