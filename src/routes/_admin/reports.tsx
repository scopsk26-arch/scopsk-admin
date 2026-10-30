import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DataPage } from "@/components/admin/DataPage";
import { BarChart3, Download, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, asArray, num, str } from "@/lib/api/client";
import { flattenForExport } from "@/lib/admin-export";
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

function money(value: unknown) {
  return `AED ${num(value).toLocaleString()}`;
}

function statusLabel(value: unknown) {
  const key = String(value || "").toLowerCase();
  const labels: Record<string, string> = {
    draft: "Draft",
    submitted: "Submitted",
    awarded: "Awarded",
    accepted: "Accepted",
    confirmed: "Confirmed",
    in_progress: "In progress",
    delivered: "Delivered",
    completed: "Completed",
    cancelled: "Cancelled",
    canceled: "Cancelled",
    issued: "Issued",
    paid: "Paid",
    overdue: "Overdue",
  };
  return labels[key] || (key ? key.replace(/_/g, " ") : "—");
}

function StatGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-xl border border-border bg-muted/40 px-3 py-2.5">
          <div className="text-xs font-medium text-muted-foreground">{label}</div>
          <div className="mt-1 text-sm font-medium">{value}</div>
        </div>
      ))}
    </div>
  );
}

function ReportDetailView({ detail, row }: { detail: any; row?: ReportRow }) {
  const kind = String(row?.id || "");
  const byStatus = Array.isArray(detail?.purchaseOrdersByStatus) ? detail.purchaseOrdersByStatus : [];

  if (kind === "catalog") {
    return (
      <StatGrid
        items={[
          ["Products", String(num(detail?.products))],
          ["Categories", String(num(detail?.categories))],
          ["Market prices", String(num(detail?.marketPrices))],
        ]}
      />
    );
  }

  if (kind === "finance") {
    return (
      <StatGrid
        items={[
          ["Issued invoices", String(num(detail?.issued))],
          ["Paid invoices", String(num(detail?.paid))],
          ["Overdue invoices", String(num(detail?.overdue))],
          ["Paid total", money(detail?.paidTotal)],
          ["VAT", money(detail?.vatTotal)],
          ["Commission", money(detail?.commissionTotal)],
        ]}
      />
    );
  }

  return (
    <div className="space-y-4">
      <StatGrid
        items={[
          ["Quote requests", String(num(detail?.rfqs))],
          ["Orders", String(num(detail?.purchaseOrders))],
          ["Quotations", String(num(detail?.quotations))],
          ["Deliveries", String(num(detail?.deliveries))],
          ["Invoice total", money(detail?.invoiceTotal)],
          ["Delivered order value", money(detail?.totalSpend)],
        ]}
      />
      {byStatus.length > 0 ? (
        <div className="rounded-xl border border-border">
          <div className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">Orders by status</div>
          {byStatus.map((entry: { status?: string; count?: number }) => (
            <div key={String(entry.status)} className="flex items-center justify-between px-3 py-2 text-sm">
              <span>{statusLabel(entry.status)}</span>
              <span className="tabular-nums">{num(entry.count)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
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
      const p = (procurement || {}) as Record<string, unknown>;
      const c = (catalog || {}) as Record<string, unknown>;
      const f = (finance || {}) as Record<string, unknown>;
      const aed = (value: unknown) => `AED ${num(value).toLocaleString()}`;
      return [
        {
          id: "procurement",
          name: "Quote requests and orders",
          category: "Orders",
          schedule: `${num(p.purchaseOrders)} orders`,
          lastRun: `${num(p.rfqs)} quote requests`,
          owner: aed(p.totalSpend),
          endpoint: "/reports/procurement",
          payload: p,
        },
        {
          id: "catalog",
          name: "Catalog",
          category: "Catalog",
          schedule: `${num(c.products)} products`,
          lastRun: `${num(c.categories)} categories`,
          owner: `${num(c.marketPrices)} prices`,
          endpoint: "/reports/catalog",
          payload: c,
        },
        {
          id: "finance",
          name: "Invoices and payments",
          category: "Finance",
          schedule: `${num(f.paid)} paid`,
          lastRun: `${num(f.issued)} issued · ${num(f.overdue)} overdue`,
          owner: aed(f.paidTotal),
          endpoint: "/reports/finance",
          payload: f,
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
      const sample = detailRows[0];
      const columns = Object.keys(sample).map((key) => ({
        key,
        label: key
          .replace(/[._]/g, " ")
          .replace(/([a-z])([A-Z])/g, "$1 $2")
          .replace(/\b\w/g, (letter) => letter.toUpperCase()),
      }));
      const { downloadTablePdf } = await import("@/lib/pdf-export");
      downloadTablePdf({
        title: row.name,
        description: `${row.category} report · ${row.schedule} · Owner ${row.owner}`,
        filename: `${row.id.toLowerCase()}.pdf`,
        columns,
        rows: detailRows,
        meta: [`${detailRows.length} rows`, row.lastRun ? `Last run ${row.lastRun}` : ""].filter(Boolean),
      });
      toast.success("PDF exported", { description: `${detailRows.length} rows · ${row.name}` });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    }
  };

  return (
    <DataPage
      title="Business reports"
      description="Download marketplace and finance reports as PDF."
      icon={<BarChart3 className="h-5 w-5 text-primary" />}
      disableCrud
      hideExport
      viewFields={[
        { key: "name", label: "Report" },
        { key: "category", label: "Category" },
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
      renderView={(detail, row) => <ReportDetailView detail={detail} row={row as ReportRow} />}
      kpis={[
        { label: "Reports", value: String(rows.length) },
        {
          label: "Quote requests",
          value: String(num((rows.find((r) => r.id === "procurement")?.payload as any)?.rfqs)),
          tone: "info",
        },
        {
          label: "Paid invoice total",
          value: money((rows.find((r) => r.id === "finance")?.payload as any)?.paidTotal),
          tone: "success",
        },
        {
          label: "Catalog products",
          value: String(num((rows.find((r) => r.id === "catalog")?.payload as any)?.products)),
        },
      ]}
      rows={rows}
      searchKeys={["id", "name", "category", "owner"]}
      emptyHint={isLoading ? "Loading…" : isError ? "Failed to load reports." : "No reports available."}
      columns={[
        { key: "name", label: "Report", render: (r) => <span className="font-medium">{r.name}</span> },
        { key: "category", label: "Category" },
        { key: "schedule", label: "Records", className: "whitespace-nowrap" },
        { key: "lastRun", label: "Detail", className: "whitespace-nowrap" },
        { key: "owner", label: "Total", className: "whitespace-nowrap" },
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
