import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DataPage } from "@/components/admin/DataPage";
import { GenericJsonDetailView } from "@/components/admin/DetailViews";
import { BarChart3, Download, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, asArray, num, str } from "@/lib/api/client";
import { buildDetailedCsv, downloadCsv, flattenForExport } from "@/lib/admin-export";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/reports")({
  head: () => ({ meta: [{ title: "Reports & BI — ScopsK" }] }),
  component: ReportsPage,
});

type ReportRow = {
  id: string;
  name: string;
  category: string;
  schedule: string;
  lastRun: string;
  owner: string;
  endpoint: string;
  payload: Record<string, unknown> | null;
};

async function fetchReportDetailRows(endpoint: string): Promise<Record<string, unknown>[]> {
  // Prefer dedicated CSV-ready detail export when available
  try {
    const detailed = await api.get<any>(endpoint, { query: { export: "detailed" } });
    const list = asArray(detailed);
    if (list.length) return list.map((r) => flattenForExport(r as Record<string, unknown>));
    if (detailed && typeof detailed === "object" && !Array.isArray(detailed)) {
      const obj = detailed as Record<string, unknown>;
      if (Array.isArray(obj.rows)) {
        return (obj.rows as Record<string, unknown>[]).map((r) => flattenForExport(r));
      }
      return [flattenForExport(obj)];
    }
  } catch {
    /* fall through */
  }

  const summary = await api.get<any>(endpoint).catch(() => null);
  if (!summary) return [];
  if (Array.isArray(summary)) return summary.map((r) => flattenForExport(r as Record<string, unknown>));
  const obj = summary as Record<string, unknown>;
  // Expand nested arrays into their own row sets when present
  const nestedKeys = Object.keys(obj).filter((k) => Array.isArray(obj[k]));
  if (nestedKeys.length === 1) {
    const key = nestedKeys[0];
    const rows = obj[key] as Record<string, unknown>[];
    if (rows.length) return rows.map((r) => flattenForExport({ section: key, ...r }));
  }
  return [flattenForExport(obj)];
}

function ReportsPage() {
  const { data: rows = [], isLoading, isError, refetch } = useQuery({
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
          endpoint: "/reports/procurement",
          payload: procurement as Record<string, unknown> | null,
        },
        {
          id: "RPT-catalog",
          name: "Catalog Summary",
          category: "Catalog",
          schedule: "On demand",
          lastRun: now,
          owner: "Catalog",
          endpoint: "/reports/catalog",
          payload: catalog as Record<string, unknown> | null,
        },
        {
          id: "RPT-finance",
          name: "Finance Summary",
          category: "Finance",
          schedule: "On demand",
          lastRun: now,
          owner: "Finance",
          endpoint: "/reports/finance",
          payload: finance as Record<string, unknown> | null,
        },
      ] satisfies ReportRow[];
    },
  });

  const runReport = async (row: ReportRow) => {
    try {
      const payload = await api.get(row.endpoint);
      toast.success(`${row.name} refreshed`, {
        description: typeof payload === "object" ? `${Object.keys(payload as object).length} fields` : "OK",
      });
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to run report");
    }
  };

  const exportReport = async (row: ReportRow) => {
    try {
      toast.message(`Exporting ${row.name}…`);
      const detailRows = await fetchReportDetailRows(row.endpoint);
      if (!detailRows.length) {
        toast.error("No detailed data to export");
        return;
      }
      const csv = buildDetailedCsv(detailRows);
      downloadCsv(`${row.id.toLowerCase()}-detailed.csv`, csv);
      toast.success("Detailed report exported", { description: `${detailRows.length} rows · ${row.name}` });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    }
  };

  return (
    <DataPage
      title="Reports & Business Intelligence"
      description="Scheduled and ad-hoc reports across finance, marketplace and risk. Export downloads the full detailed dataset for that report."
      icon={<BarChart3 className="h-5 w-5 text-primary" />}
      disableCrud
      hideExport
      viewFields={[
        { key: "name", label: "Report" },
        { key: "category", label: "Category" },
        { key: "schedule", label: "Schedule" },
        { key: "lastRun", label: "Last run" },
        { key: "owner", label: "Owner" },
      ]}
      loadDetail={async (row) => {
        if (row.payload && typeof row.payload === "object") return row.payload as Record<string, unknown>;
        try {
          const payload = await api.get(row.endpoint);
          return (payload && typeof payload === "object" ? payload : { value: payload }) as Record<string, unknown>;
        } catch {
          return {
            name: row.name,
            category: row.category,
            schedule: row.schedule,
            lastRun: row.lastRun,
            owner: row.owner,
          };
        }
      }}
      renderView={(detail) => <GenericJsonDetailView detail={detail} omitKeys={["id", "payload", "endpoint"]} />}
      kpis={[
        { label: "Report endpoints", value: String(rows.length) },
        {
          label: "RFQs tracked",
          value: String(num((rows.find((r) => r.id === "RPT-procurement")?.payload as any)?.rfqs)),
          tone: "info",
        },
        {
          label: "Paid invoice total",
          value: `AED ${num((rows.find((r) => r.id === "RPT-finance")?.payload as any)?.paidTotal).toLocaleString()}`,
          tone: "success",
        },
        {
          label: "Catalog products",
          value: String(num((rows.find((r) => r.id === "RPT-catalog")?.payload as any)?.products)),
        },
      ]}
      rows={rows}
      searchKeys={["id", "name", "category", "owner"]}
      emptyHint={isLoading ? "Loading…" : isError ? "Failed to load reports." : "No reports available."}
      columns={[
        { key: "id", label: "ID", className: "font-mono text-xs whitespace-nowrap" },
        { key: "name", label: "Report", render: (r) => <span className="font-medium">{r.name}</span> },
        { key: "category", label: "Category" },
        { key: "schedule", label: "Schedule" },
        { key: "lastRun", label: "Last run", className: "whitespace-nowrap" },
        { key: "owner", label: "Owner" },
        {
          key: "actions",
          label: "",
          className: "whitespace-nowrap",
          render: (r) => (
            <div className="flex items-center gap-1.5 justify-end">
              <Button size="sm" variant="outline" onClick={() => void runReport(r)}>
                <Play className="h-3.5 w-3.5 mr-1" />
                Run
              </Button>
              <Button size="sm" variant="default" onClick={() => void exportReport(r)}>
                <Download className="h-3.5 w-3.5 mr-1" />
                Export
              </Button>
            </div>
          ),
        },
      ]}
    />
  );
}
