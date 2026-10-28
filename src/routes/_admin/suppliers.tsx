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
  organizationStreet,
  updateOrganization,
  updateOrgProfile,
  updateOrgSettings,
} from "@/lib/api/resources";
import {
  PAYMENT_TERM_OPTIONS,
  WEEKDAY_OPTIONS,
  areaOptions,
  categoryOptions,
} from "@/lib/org-app-fields";

export const Route = createFileRoute("/_admin/suppliers")({
  head: () => ({ meta: [{ title: "Suppliers — ScopsK" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    open: typeof search.open === "string" ? search.open : undefined,
  }),
  component: SuppliersPage,
});

function SuppliersPage() {
  const navigate = Route.useNavigate();
  const { open: openId } = Route.useSearch();
  const lookups = useMemo(
    () => ({
      dubaiArea: areaOptions(),
      coverageAreas: areaOptions(),
      categories: categoryOptions(),
      workingDays: WEEKDAY_OPTIONS,
    }),
    [],
  );
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
      description="Review supplier accounts, categories, coverage, and how they get paid."
      icon={<Truck className="h-5 w-5 text-primary" />}
      entityName="Supplier"
      lookups={lookups}
      formFields={[
        { key: "name", label: "Company name", required: true, type: "text" },
        { key: "ownerName", label: "Owner name", type: "text" },
        {
          key: "email",
          label: "Business email",
          required: true,
          type: "text",
          placeholder: "ops@supplier.com",
        },
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
          key: "coverageAreas",
          label: "Coverage areas",
          type: "multiselect",
          placeholder: "Select coverage…",
        },
        {
          key: "workingDays",
          label: "Working days",
          type: "multiselect",
          placeholder: "Select days…",
        },
        { key: "workingOpen", label: "Opening time (HH:mm)", type: "text", placeholder: "08:00" },
        { key: "workingClose", label: "Closing time (HH:mm)", type: "text", placeholder: "18:00" },
        {
          key: "categories",
          label: "Product categories",
          type: "multiselect",
          placeholder: "Select categories…",
        },
        {
          key: "sellingTerms",
          label: "How they get paid",
          type: "select",
          options: PAYMENT_TERM_OPTIONS,
        },
        { key: "requestedCreditLimit", label: "Credit offered (AED)", type: "number", min: 0 },
        { key: "paymentTermsDays", label: "Credit duration (days)", type: "number", min: 0 },
        { key: "bankName", label: "Bank name", type: "text" },
        { key: "bankAccountName", label: "Account holder", type: "text" },
        { key: "bankAccountNumber", label: "Account number", type: "text" },
        { key: "bankIban", label: "IBAN", type: "text" },
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
        { key: "ownerName", label: "Owner" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "dubaiArea", label: "Area" },
        { key: "address", label: "Street" },
        { key: "city", label: "City" },
        { key: "country", label: "Country" },
        { key: "status", label: "Status" },
      ]}
      loadDetail={async (row) => {
        const detail = await fetchOrganizationDetail(row.id);
        return { ...detail, address: organizationStreet(detail) || row.address || "" };
      }}
      loadEdit={async (row) => {
        const detail = await fetchOrganizationDetail(row.id);
        return mapOrgRow(detail, "supplier");
      }}
      autoOpenId={openId}
      onAutoOpened={() => {
        if (openId) void navigate({ to: "/suppliers", search: {} });
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
          key: "categories",
          label: "Categories",
          className: "whitespace-nowrap max-w-[220px]",
          render: (r) => <TagListDropdown value={r.categories?.length ? r.categories : r.cuisines} />,
        },
        {
          key: "coverageAreas",
          label: "Coverage",
          className: "whitespace-nowrap max-w-[180px]",
          render: (r) => <TagListDropdown value={r.coverageAreas} />,
        },
        { key: "phone", label: "Phone" },
        { key: "dubaiArea", label: "Area" },
        {
          key: "sellingTerms",
          label: "Selling terms",
          className: "whitespace-nowrap",
          render: (r) => {
            const key = String(r.sellingTerms || "").toLowerCase();
            if (key === "cash_only") return "Cash";
            if (key === "credit_only") return "Credit";
            if (key === "cash_or_credit") return "Cash & credit";
            return "—";
          },
        },
        {
          key: "requestedCreditLimit",
          label: "Credit offered",
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
        const updated = await updateOrganization(id, data, "supplier");
        await updateOrgSettings(id, {
          poApprovalLevels: data.poApprovalLevels,
          minRfqValueAed: data.minRfqValueAed,
          rfqIntakeMode: data.rfqIntakeMode,
          paymentTermsDays: data.paymentTermsDays,
          metadata: {
            sellingTerms: data.sellingTerms,
            offersCredit: String(data.sellingTerms || "") !== "cash_only",
            requestedCreditLimit: Number(data.requestedCreditLimit) || 0,
          },
        });
        await updateOrgProfile(id, data);
        await queryClient.invalidateQueries({ queryKey: ["organizations", "supplier"] });
        return {
          ...updated,
          ...data,
          poApprovalLevels: Number(data.poApprovalLevels ?? updated.poApprovalLevels),
          minRfqValueAed: Number(data.minRfqValueAed ?? updated.minRfqValueAed),
          rfqIntakeMode: String(data.rfqIntakeMode ?? updated.rfqIntakeMode ?? "manual"),
        };
      }}
      onDelete={async (id) => {
        await deleteOrganization(id);
        await queryClient.invalidateQueries({ queryKey: ["organizations", "supplier"] });
      }}
    />
  );
}
