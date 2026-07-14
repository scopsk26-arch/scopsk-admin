import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DataPage, StatusBadge, AED } from "@/components/admin/DataPage";
import { Store } from "lucide-react";
import { fetchOrganizationsByType } from "@/lib/api/resources";
import { useAdminLookups } from "@/hooks/useAdminLookups";

export const Route = createFileRoute("/_admin/restaurants")({
  head: () => ({ meta: [{ title: "Restaurants — Prime Plate" }] }),
  component: RestaurantsPage,
});

function RestaurantsPage() {
  const { categories } = useAdminLookups();

  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["organizations", "restaurant"],
    queryFn: () => fetchOrganizationsByType("restaurant"),
  });

  const active = rows.filter((r) => r.status === "active").length;
  const pending = rows.filter((r) => r.status === "pending").length;
  const spend = rows.reduce((s, r) => s + (r.spend || 0), 0);

  return (
    <DataPage
      title="Restaurants"
      description="Manage onboarded restaurants, branches, KYC status and procurement activity."
      icon={<Store className="h-5 w-5 text-primary" />}
      lookups={{
        categories: categories.map((c) => ({ value: c.label, label: c.label })),
        category: categories.map((c) => ({ value: c.label, label: c.label })),
      }}
      formFields={[
        { key: "name", label: "Restaurant", type: "text" },
        { key: "industry", label: "Cuisine", type: "text" },
        { key: "region", label: "Region", type: "text" },
        { key: "status", label: "Status", type: "select", options: ["active", "pending", "suspended", "verified"] },
      ]}
      kpis={[
        { label: "Total restaurants", value: String(rows.length) },
        { label: "Active", value: String(active), tone: "success" },
        { label: "Pending verification", value: String(pending), tone: "warning" },
        { label: "Total spend", value: AED(spend), tone: "info" },
      ]}
      rows={rows}
      searchKeys={["name", "region", "industry", "id"]}
      emptyHint={isLoading ? "Loading…" : isError ? "Failed to load restaurants." : "No restaurants found."}
      columns={[
        { key: "id", label: "ID", className: "font-mono text-xs", render: (r) => String(r.id).slice(0, 8) },
        { key: "name", label: "Restaurant", render: (r) => <span className="font-medium">{r.name}</span> },
        { key: "industry", label: "Cuisine" },
        { key: "region", label: "Region" },
        { key: "branches", label: "Branches", className: "text-right" },
        { key: "orders", label: "Orders" },
        { key: "spend", label: "Spend", render: (r) => AED(r.spend) },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  );
}
