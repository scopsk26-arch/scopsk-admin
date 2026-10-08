import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { KpiCard } from "@/components/admin/KpiCard";
import {
  Store, Truck, FileText, Quote, ClipboardList, Star,
} from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { api, asArray, num, str } from "@/lib/api/client";
import { EMPTY_LIST, fetchAdminDashboard } from "@/lib/api/resources";
import { getSessionUser } from "@/lib/auth-session";

export const Route = createFileRoute("/_admin/dashboard")({
  head: () => ({ meta: [{ title: "Command Center — ScopsK" }] }),
  component: Dashboard,
});

const fmtMoney = (n: number) => {
  if (!n) return "—";
  if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `AED ${(n / 1000).toFixed(0)}K`;
  return `AED ${n.toLocaleString()}`;
};

function monthLabel(m: string) {
  if (/^\d{4}-\d{2}$/.test(m)) {
    const [y, mo] = m.split("-");
    const d = new Date(Number(y), Number(mo) - 1, 1);
    return d.toLocaleString("en", { month: "short" });
  }
  return m;
}

function Dashboard() {
  const user = getSessionUser();
  const firstName = user?.firstName || "Admin";

  const { data: dash } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: fetchAdminDashboard,
  });

  const { data: recentRfqs = EMPTY_LIST } = useQuery({
    queryKey: ["rfqs", "dashboard"],
    queryFn: async () => asArray(await api.get("/rfqs").catch(() => [])),
  });

  const d = (dash ?? {}) as Record<string, any>;
  const trends = (d.trends ?? {}) as Record<string, any>;

  const totalRestaurants = num(d.restaurants ?? d.restaurantCount);
  const totalSuppliers = num(d.suppliers ?? d.supplierCount);
  const kpis = {
    totalRestaurants,
    totalSuppliers,
    activeRfqs: num(d.rfqs),
    activeQuotations: num(d.quotations),
    approvedPOs: num(d.purchaseOrders),
  };

  useEffect(() => {
    try {
      localStorage.setItem(
        "respy.login.counts",
        JSON.stringify({
          restaurants: totalRestaurants,
          suppliers: totalSuppliers,
        }),
      );
    } catch {
      /* ignore */
    }
  }, [totalRestaurants, totalSuppliers]);

  const rfqByMonth = asArray(trends.rfqsByMonth);
  const quotByMonth = asArray(trends.quotationsByMonth);
  const rfqTrend = rfqByMonth.map((r: any) => {
    const month = str(r.month, "");
    const matchQ = quotByMonth.find((q: any) => str(q.month) === month);
    return {
      month: monthLabel(month),
      rfqs: num(r.count ?? r.rfqs),
      quotations: num(matchQ?.count ?? matchQ?.quotations ?? r.quotations),
    };
  });

  const topSuppliersRaw = asArray(d.topSuppliers);
  const suppliersData = topSuppliersRaw.map((s: any) => ({
    id: str(s.id),
    name: str(s.name, "—"),
    rating: num(s.rating),
    winRate: num(s.winRate ?? s.orderCount),
    revenue: num(s.revenue),
  }));

  const restaurantsData = asArray(d.topRestaurants).map((r: any) => ({
    id: str(r.id),
    name: str(r.name, "—"),
    region: str(r.region ?? r.city, "—"),
    branches: num(r.branches ?? r.orderCount),
    spend: num(r.spend ?? r.revenue),
  }));

  const rfqsData = (recentRfqs.length ? recentRfqs : asArray(d.recentRfqs))
    .slice(0, 5)
    .map((r: any) => ({
      id: String(r.number ?? r.id ?? "RFQ"),
      restaurant: String(r.organization?.name ?? r.title ?? "—"),
      category: String(r.visibility ?? r.category ?? "—"),
      status: String(r.status ?? "open"),
    }));

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 lg:p-8 shadow-soft">
        <div className="absolute inset-0 mesh-bg opacity-80" />
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full glass text-[11px] mb-3">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              Marketplace operating normally
            </div>
            <h1 className="text-2xl lg:text-3xl font-display font-semibold tracking-tight">
              Good morning, {firstName}
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">
              Live KPIs · {kpis.activeRfqs} RFQs · {kpis.activeQuotations} quotations · {kpis.approvedPOs} POs
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/rfqs"
              className="px-3 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium grid place-items-center hover:opacity-90"
            >
              View RFQs
            </Link>
            <Link
              to="/reports"
              className="px-3 h-9 rounded-lg border border-border bg-card text-sm font-medium grid place-items-center hover:bg-muted"
            >
              Generate Report
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <KpiCard label="Total Restaurants" value={kpis.totalRestaurants.toLocaleString()} delta={0} icon={<Store className="h-5 w-5" />} to="/restaurants" accent="primary" />
        <KpiCard label="Total Suppliers" value={kpis.totalSuppliers.toLocaleString()} delta={0} icon={<Truck className="h-5 w-5" />} to="/suppliers" accent="accent" />
        <KpiCard label="Active RFQs" value={kpis.activeRfqs.toString()} delta={0} icon={<FileText className="h-5 w-5" />} to="/rfqs" accent="info" />
        <KpiCard label="Active Quotations" value={kpis.activeQuotations.toLocaleString()} delta={0} icon={<Quote className="h-5 w-5" />} to="/quotations" accent="warning" />
        <KpiCard label="Approved POs" value={kpis.approvedPOs.toString()} delta={0} icon={<ClipboardList className="h-5 w-5" />} to="/purchase-orders" accent="success" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <ChartCard title="RFQ & Quotation Trend" subtitle="Last months" className="xl:col-span-2">
          {rfqTrend.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={rfqTrend} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="rfqs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="quots" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="quotations" stroke="var(--chart-2)" fill="url(#quots)" strokeWidth={2} />
                <Area type="monotone" dataKey="rfqs" stroke="var(--chart-1)" fill="url(#rfqs)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <WidgetCard title="Recent RFQs">
          <div className="divide-y divide-border">
            {rfqsData.length === 0 && <p className="text-sm text-muted-foreground py-4">No RFQs yet.</p>}
            {rfqsData.map((r) => (
              <div key={r.id} className="flex items-center gap-3 py-2.5">
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary grid place-items-center text-[11px] font-mono">
                  {String(r.id).slice(-4)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{r.restaurant}</div>
                  <div className="text-xs text-muted-foreground">{r.category}</div>
                </div>
                <StatusPill status={r.status} />
              </div>
            ))}
          </div>
        </WidgetCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WidgetCard title="Top Suppliers">
          <div className="space-y-2.5">
            {suppliersData.length === 0 && (
              <p className="text-sm text-muted-foreground py-4">No supplier data yet.</p>
            )}
            {suppliersData.slice(0, 5).map((s, i) => (
              <div key={s.id || i} className="flex items-center gap-3">
                <div className="text-xs font-mono text-muted-foreground w-4">{i + 1}</div>
                <div className="h-8 w-8 rounded-lg gradient-accent grid place-items-center text-accent-foreground text-xs font-semibold">
                  {s.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{s.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Star className="h-3 w-3 fill-warning text-warning" /> {s.rating || "—"} ·{" "}
                    {s.winRate || "—"} orders
                  </div>
                </div>
                <div className="text-sm font-medium">{s.revenue ? fmtMoney(s.revenue) : "—"}</div>
              </div>
            ))}
          </div>
        </WidgetCard>

        <WidgetCard title="Top Restaurants">
          <div className="space-y-2.5">
            {restaurantsData.length === 0 && (
              <p className="text-sm text-muted-foreground py-4">No restaurant data yet.</p>
            )}
            {[...restaurantsData]
              .sort((a, b) => b.spend - a.spend)
              .slice(0, 5)
              .map((r, i) => (
                <div key={r.id || i} className="flex items-center gap-3">
                  <div className="text-xs font-mono text-muted-foreground w-4">{i + 1}</div>
                  <div className="h-8 w-8 rounded-lg gradient-primary grid place-items-center text-primary-foreground text-xs font-semibold">
                    {r.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{r.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.region} · {r.branches} orders
                    </div>
                  </div>
                  <div className="text-sm font-medium">{r.spend ? fmtMoney(r.spend) : "—"}</div>
                </div>
              ))}
          </div>
        </WidgetCard>
      </div>
    </div>
  );
}

const tooltipStyle: React.CSSProperties = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  fontSize: 12,
  padding: "8px 12px",
  boxShadow: "var(--shadow-elevated)",
  color: "var(--popover-foreground)",
};

function EmptyChart({ height = "h-[240px]" }: { height?: string }) {
  return (
    <div className={cn("grid place-items-center text-sm text-muted-foreground", height)}>
      No data
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-5 shadow-soft", className)}>
      <div>
        <h3 className="font-display font-semibold">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function WidgetCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <h3 className="font-display font-semibold mb-3">{title}</h3>
      {children}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: "bg-success/15 text-success",
    closed: "bg-muted text-muted-foreground",
    draft: "bg-warning/15 text-warning",
    active: "bg-success/15 text-success",
    pending: "bg-warning/15 text-warning",
    suspended: "bg-destructive/15 text-destructive",
    verified: "bg-info/15 text-info",
    expired: "bg-muted text-muted-foreground",
    awarded: "bg-success/15 text-success",
  };
  return (
    <Badge
      variant="outline"
      className={cn("border-0 text-[10px] capitalize", map[status] ?? "bg-muted text-muted-foreground")}
    >
      {status}
    </Badge>
  );
}
