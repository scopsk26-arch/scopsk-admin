import { createFileRoute } from "@tanstack/react-router";
import { DataPage, StatusBadge, AED } from "@/components/admin/DataPage";
import { restaurants } from "@/lib/mock-data";
import { Store } from "lucide-react";

export const Route = createFileRoute("/_admin/restaurants")({
  head: () => ({ meta: [{ title: "Restaurants — Prime Plate" }] }),
  component: () => (
    <DataPage
      title="Restaurants"
      description="Manage onboarded restaurants, branches, KYC status and procurement activity."
      icon={<Store className="h-5 w-5 text-primary" />}
      kpis={[
        { label: "Total restaurants", value: "2,847" },
        { label: "Active this month", value: "2,184", tone: "success" },
        { label: "Pending verification", value: "37", tone: "warning" },
        { label: "Total spend (30d)", value: AED(4_820_000), tone: "info" },
      ]}
      rows={restaurants}
      searchKeys={["name", "region", "industry", "id"]}
      columns={[
        { key: "id", label: "ID", className: "font-mono text-xs" },
        { key: "name", label: "Restaurant", render: (r) => <span className="font-medium">{r.name}</span> },
        { key: "industry", label: "Cuisine" },
        { key: "region", label: "Region" },
        { key: "branches", label: "Branches", className: "text-right" },
        { key: "orders", label: "Orders" },
        { key: "spend", label: "Spend", render: (r) => AED(r.spend) },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  ),
});
