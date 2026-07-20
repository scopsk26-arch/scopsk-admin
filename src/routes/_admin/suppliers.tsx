import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DataPage, StatusBadge, AED } from "@/components/admin/DataPage";
import { Truck } from "lucide-react";
import {
  enrichOrganizationRow,
  fetchOrganizationsByType,
  updateOrganization,
  updateOrgProfile,
  updateOrgSettings,
} from "@/lib/api/resources";
import { useAdminLookups } from "@/hooks/useAdminLookups";

export const Route = createFileRoute("/_admin/suppliers")({
  head: () => ({ meta: [{ title: "Suppliers — Prime Plate" }] }),
  component: SuppliersPage,
});

function SuppliersPage() {
  const { categories } = useAdminLookups();
  const queryClient = useQueryClient();

  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["organizations", "supplier"],
    queryFn: async () => {
      const base = await fetchOrganizationsByType("supplier");
      return Promise.all(base.map((r) => enrichOrganizationRow(r, "supplier")));
    },
  });

  const verified = rows.filter((r) => ["verified", "active"].includes(r.status)).length;
  const pending = rows.filter((r) => r.status === "pending").length;
  const avgWin = rows.length ? Math.round(rows.reduce((s, r) => s + (r.winRate || 0), 0) / rows.length) : 0;

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
        { key: "name", label: "Supplier", type: "text" },
        { key: "email", label: "Email", type: "text", placeholder: "ops@supplier.com" },
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
          key: "status",
          label: "Status",
          type: "select",
          options: ["active", "pending", "verified", "suspended", "rejected"],
        },
      ]}
      kpis={[
        { label: "Total suppliers", value: String(rows.length) },
        { label: "Verified", value: String(verified), tone: "success" },
        { label: "Pending review", value: String(pending), tone: "warning" },
        { label: "Avg. win-rate", value: `${avgWin}%`, tone: "info" },
      ]}
      rows={rows}
      searchKeys={["name", "id", "email", "status"]}
      emptyHint={isLoading ? "Loading…" : isError ? "Failed to load suppliers." : "No suppliers found."}
      columns={[
        { key: "id", label: "ID", className: "font-mono text-xs", render: (r) => String(r.id).slice(0, 8) },
        { key: "name", label: "Supplier", render: (r) => <span className="font-medium">{r.name}</span> },
        { key: "categories", label: "Categories", render: (r) => (r.categories?.length ? r.categories.join(", ") : "—") },
        { key: "poApprovalLevels", label: "PO levels" },
        { key: "minRfqValueAed", label: "Min RFQ", render: (r) => AED(r.minRfqValueAed) },
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
        });
        await updateOrgProfile(id, data);
        await queryClient.invalidateQueries({ queryKey: ["organizations", "supplier"] });
        return enrichOrganizationRow(
          {
            ...updated,
            poApprovalLevels: Number(data.poApprovalLevels ?? updated.poApprovalLevels),
            minRfqValueAed: Number(data.minRfqValueAed ?? updated.minRfqValueAed),
            ownerName: String(data.ownerName ?? ""),
            tradeLicenseNumber: String(data.tradeLicenseNumber ?? ""),
            vatRegistrationNumber: String(data.vatRegistrationNumber ?? ""),
          },
          "supplier",
        );
      }}
    />
  );
}
