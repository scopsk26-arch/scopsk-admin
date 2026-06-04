import { useMemo, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download, Plus, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: keyof T | string;
  label: string;
  render?: (row: T) => ReactNode;
  className?: string;
};

export type Kpi = { label: string; value: string; hint?: string; tone?: "default" | "success" | "warning" | "destructive" | "info" };

export function DataPage<T extends Record<string, any>>({
  title,
  description,
  icon,
  kpis = [],
  columns,
  rows,
  searchKeys = [],
  filters,
  actions,
  emptyHint,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
  kpis?: Kpi[];
  columns: Column<T>[];
  rows: T[];
  searchKeys?: (keyof T | string)[];
  filters?: ReactNode;
  actions?: ReactNode;
  emptyHint?: string;
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const needle = q.toLowerCase();
    return rows.filter((r) =>
      (searchKeys.length ? searchKeys : Object.keys(r)).some((k) => {
        const v = r[k as keyof T];
        return v != null && String(v).toLowerCase().includes(needle);
      })
    );
  }, [q, rows, searchKeys]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {icon && (
            <div className="h-11 w-11 rounded-xl glass grid place-items-center shrink-0">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-display font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{description}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {actions ?? (
            <>
              <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1.5" />Export</Button>
              <Button size="sm"><Plus className="h-4 w-4 mr-1.5" />New</Button>
            </>
          )}
        </div>
      </div>

      {kpis.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-xl border border-border bg-card p-4 shadow-soft">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{k.label}</div>
              <div className={cn(
                "mt-1 text-2xl font-display font-semibold",
                k.tone === "success" && "text-success",
                k.tone === "warning" && "text-warning",
                k.tone === "destructive" && "text-destructive",
                k.tone === "info" && "text-info",
              )}>{k.value}</div>
              {k.hint && <div className="text-xs text-muted-foreground mt-0.5">{k.hint}</div>}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
        <div className="p-4 flex flex-wrap items-center gap-2 border-b border-border">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search..."
              className="pl-9 h-9"
            />
          </div>
          {filters ?? (
            <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-1.5" />Filter</Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left">
                {columns.map((c) => (
                  <th key={String(c.key)} className={cn("px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground", c.className)}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    {emptyHint ?? "No results found."}
                  </td>
                </tr>
              ) : (
                filtered.map((row, i) => (
                  <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    {columns.map((c) => (
                      <td key={String(c.key)} className={cn("px-4 py-3", c.className)}>
                        {c.render ? c.render(row) : String(row[c.key as keyof T] ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>Showing {filtered.length} of {rows.length}</span>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" disabled>Previous</Button>
            <Button variant="ghost" size="sm" disabled>Next</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StatusBadge({ status, tone }: { status: string; tone?: "success" | "warning" | "destructive" | "info" | "default" }) {
  const t = tone ?? inferTone(status);
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border",
      t === "success" && "bg-success/10 text-success border-success/20",
      t === "warning" && "bg-warning/10 text-warning border-warning/20",
      t === "destructive" && "bg-destructive/10 text-destructive border-destructive/20",
      t === "info" && "bg-info/10 text-info border-info/20",
      t === "default" && "bg-muted text-muted-foreground border-border",
    )}>
      <span className={cn(
        "h-1.5 w-1.5 rounded-full",
        t === "success" && "bg-success",
        t === "warning" && "bg-warning",
        t === "destructive" && "bg-destructive",
        t === "info" && "bg-info",
        t === "default" && "bg-muted-foreground",
      )} />
      {status}
    </span>
  );
}

function inferTone(status: string): "success" | "warning" | "destructive" | "info" | "default" {
  const s = status.toLowerCase();
  if (["active","verified","approved","delivered","paid","resolved","sent","published","success","completed","online","open"].includes(s)) return "success";
  if (["pending","processing","draft","review","queued","dispatched","ready","scheduled"].includes(s)) return "info";
  if (["flagged","delayed","warning","at risk","overdue","high"].includes(s)) return "warning";
  if (["suspended","rejected","failed","closed","critical","blocked","banned"].includes(s)) return "destructive";
  return "default";
}

export const AED = (n: number) => `AED ${n.toLocaleString("en-AE", { maximumFractionDigits: 0 })}`;
