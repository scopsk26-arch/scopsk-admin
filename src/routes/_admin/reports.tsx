import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DataPage } from "@/components/admin/DataPage";
import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/_admin/reports")({
  head: () => ({ meta: [{ title: "Reports & BI — Prime Plate" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const [procurement, catalog, finance] = await Promise.all([
        api.get("/reports/procurement").catch(() => null),
        api.get("/reports/catalog").catch(() => null),
        api.get("/reports/finance").catch(() => null),
      ]);
      const now = new Date().toISOString().slice(0, 16).replace("T", " ");
      return [
        {
          id: "RPT-procurement",
          name: "Procurement Summary",
          category: "Marketplace",
          schedule: "On demand",
          lastRun: now,
          owner: "Ops",
          detail: procurement ? JSON.stringify(procurement) : "—",
        },
        {
          id: "RPT-catalog",
          name: "Catalog Summary",
          category: "Catalog",
          schedule: "On demand",
          lastRun: now,
          owner: "Catalog",
          detail: catalog ? JSON.stringify(catalog) : "—",
        },
        {
          id: "RPT-finance",
          name: "Finance Summary",
          category: "Finance",
          schedule: "On demand",
          lastRun: now,
          owner: "Finance",
          detail: finance ? JSON.stringify(finance) : "—",
        },
      ];
    },
  });

  return (
    <DataPage
      title="Reports & Business Intelligence"
      description="Scheduled and ad-hoc reports across finance, marketplace and risk."
      icon={<BarChart3 className="h-5 w-5 text-primary" />}
      disableCrud
      kpis={[
        { label: "Report endpoints", value: String(rows.length) },
        { label: "Runs", value: "—", tone: "success" },
        { label: "Avg. run time", value: "—", tone: "info" },
        { label: "Subscribed users", value: "—" },
      ]}
      rows={rows}
      searchKeys={["id", "name", "category", "owner"]}
      emptyHint={isLoading ? "Loading…" : isError ? "Failed to load reports." : "No reports available."}
      columns={[
        { key: "id", label: "ID", className: "font-mono text-xs" },
        { key: "name", label: "Report", render: (r) => <span className="font-medium">{r.name}</span> },
        { key: "category", label: "Category" },
        { key: "schedule", label: "Schedule" },
        { key: "lastRun", label: "Last run" },
        { key: "owner", label: "Owner" },
        { key: "actions", label: "", render: () => <Button size="sm" variant="outline">Run</Button> },
      ]}
    />
  );
}
