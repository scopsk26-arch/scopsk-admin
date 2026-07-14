import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DataPage, StatusBadge, AED } from "@/components/admin/DataPage";
import { Truck } from "lucide-react";
import { fetchOrganizationsByType } from "@/lib/api/resources";
import { useAdminLookups } from "@/hooks/useAdminLookups";

export const Route = createFileRoute("/_admin/suppliers")({
  head: () => ({ meta: [{ title: "Suppliers — Prime Plate" }] }),
  component: SuppliersPage,
});

function SuppliersPage() {
  const { categories } = useAdminLookups();

  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["organizations", "supplier"],
    queryFn: () => fetchOrganizationsByType("supplier"),
  });

  const verified = rows.filter((r) => ["verified", "active"].includes(r.status)).length;
  const pending = rows.filter((r) => r.status === "pending").length;
  const avgWin = rows.length ? Math.round(rows.reduce((s, r) => s + (r.winRate || 0), 0) / rows.length) : 0;

  return (
    <DataPage
      title="Suppliers"
      description="Vetted suppliers with performance, win-rate and category coverage."
      icon={<Truck className="h-5 w-5 text-primary" />}
      lookups={{
        categories: categories.map((c) => ({ value: c.label, label: c.label })),
        category: categories.map((c) => ({ value: c.label, label: c.label })),
      }}
      formFields={[
        { key: "name", label: "Supplier", type: "text" },
        {
          key: "categories",
          label: "Category",
          type: "searchable",
          selectOptions: categories.map((c) => ({ value: c.label, label: c.label })),
          placeholder: "Search categories…",
        },
        { key: "status", label: "Status", type: "select", options: ["active", "pending", "verified", "suspended"] },
      ]}
      kpis={[
        { label: "Total suppliers", value: String(rows.length) },
        { label: "Verified", value: String(verified), tone: "success" },
        { label: "Pending review", value: String(pending), tone: "warning" },
        { label: "Avg. win-rate", value: `${avgWin}%`, tone: "info" },
      ]}
      rows={rows}
      searchKeys={["name", "id"]}
      emptyHint={isLoading ? "Loading…" : isError ? "Failed to load suppliers." : "No suppliers found."}
      columns={[
        { key: "id", label: "ID", className: "font-mono text-xs", render: (r) => String(r.id).slice(0, 8) },
        { key: "name", label: "Supplier", render: (r) => <span className="font-medium">{r.name}</span> },
        { key: "categories", label: "Categories", render: (r) => (r.categories?.length ? r.categories.join(", ") : "—") },
        { key: "revenue", label: "Revenue (90d)", render: (r) => AED(r.revenue) },
        { key: "winRate", label: "Win rate", render: (r) => `${r.winRate}%` },
        { key: "rating", label: "Rating", render: (r) => `★ ${r.rating}` },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  );
}
