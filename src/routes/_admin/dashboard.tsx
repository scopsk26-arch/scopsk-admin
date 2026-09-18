import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { KpiCard } from "@/components/admin/KpiCard";
import {
  Store, Truck, FileText, Quote, ClipboardList, DollarSign, TrendingUp,
  Percent, Award, ArrowRight, AlertTriangle, Clock, Star,
} from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, LineChart, Line, RadialBarChart, RadialBar, Legend,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { api, asArray, num, str } from "@/lib/api/client";
import { EMPTY_LIST, fetchAdminDashboard } from "@/lib/api/resources";
import { getSessionUser } from "@/lib/auth-session";

export const Route = createFileRoute("/_admin/dashboard")({
  head: () => ({ meta: [{ title: "Command Center — ResPy" }] }),
  component: Dashboard,
});

const fmtMoney = (n: number) => {
  if (!n) return "AED 0";
  if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `AED ${(n / 1000).toFixed(0)}K`;
  return `AED ${n.toLocaleString()}`;
};

function monthLabel(m: string) {
  // Accept YYYY-MM or short month names
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

  const { data: fraudSignals = EMPTY_LIST } = useQuery({
    queryKey: ["ai", "fraud-signals"],
    queryFn: async () => {
      try {
        const raw = await api.get("/ai/fraud-signals");
        return asArray((raw as any)?.signals ?? raw);
      } catch {
        return [];
      }
    },
  });

  const d = (dash ?? {}) as Record<string, any>;
  const trends = (d.trends ?? {}) as Record<string, any>;
  const invoices = (d.invoices ?? {}) as Record<string, any>;

  // Prefer typed restaurant/supplier counts; never swap orgs ↔ users.
  const totalRestaurants = num(d.restaurants ?? d.restaurantCount);
  const totalSuppliers = num(d.suppliers ?? d.supplierCount);
  const kpis = {
    totalRestaurants,
    totalSuppliers,
    activeRfqs: num(d.rfqs),
    activeQuotations: num(d.quotations),
    approvedPOs: num(d.purchaseOrders),
    marketplaceRevenue: num(d.revenue ?? invoices.paidTotal),
    transactionVolume: num(d.transactionVolume) || (num(invoices.outstandingTotal) + num(invoices.paidTotal)),
    avgSavings: num(d.avgSavings),
    supplierSuccessRate: num(d.supplierSuccessRate),
    deliveries: num(d.deliveries),
    kycPending: num(d.kycPending),
  };

  const rfqByMonth = asArray(trends.rfqsByMonth);
  const quotByMonth = asArray(trends.quotationsByMonth);
  const revenueByMonth = asArray(trends.revenueByMonth);
  const ordersByMonth = asArray(trends.ordersByMonth);
  const growthByMonth = asArray(trends.growthByMonth ?? trends.accountsByMonth);

  const rfqTrend = rfqByMonth.map((r: any) => {
    const month = str(r.month, "");
    const matchQ = quotByMonth.find((q: any) => str(q.month) === month);
    return {
      month: monthLabel(month),
      rfqs: num(r.count ?? r.rfqs),
      quotations: num(matchQ?.count ?? matchQ?.quotations ?? r.quotations),
    };
  });

  const revenueTrend = revenueByMonth.map((r: any) => ({
    month: monthLabel(str(r.month, "")),
    revenue: num(r.revenue ?? r.count),
  }));

  const topSuppliersRaw = asArray(d.topSuppliers);
  const supplierPerformance = topSuppliersRaw.slice(0, 5).map((s: any) => ({
    name: str(s.name, "—").slice(0, 12),
    winRate: num(s.winRate ?? s.orderCount),
    rating: num(s.rating),
  }));

  const growthTrend = growthByMonth.map((r: any) => ({
    month: monthLabel(str(r.month, "")),
    restaurants: num(r.restaurants),
    suppliers: num(r.suppliers),
  }));

  // Heatmap only if API provides it — never invent cells
  const heatmap = asArray(d.heatmap ?? trends.heatmap).map((c: any) => ({
    day: num(c.day),
    hour: num(c.hour),
    value: num(c.value),
  }));

  const recentActivity = asArray(d.recentActivity);
  const pendingApprovals = asArray(d.pendingApprovals).map((a: any) => ({
    id: str(a.id),
    type: str(a.type, "Item"),
    subject: str(a.subject ?? a.title ?? a.action, "—"),
    priority: str(a.priority, "medium"),
    time: a.createdAt ? String(a.createdAt).replace("T", " ").slice(0, 16) : str(a.time, "—"),
  }));

  // Derive pending from KYC count if no explicit list
  const pendingFromKyc =
    pendingApprovals.length === 0 && kpis.kycPending > 0
      ? [{ id: "kyc", type: "KYC", subject: `${kpis.kycPending} applications awaiting review`, priority: "high", time: "—" }]
      : [];

  const approvalsList = pendingApprovals.length ? pendingApprovals : pendingFromKyc;

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

  const suspiciousActivity = fraudSignals.slice(0, 5).map((s: any, i: number) => ({
    id: String(s.code ?? s.id ?? i),
    text: String(s.message ?? s.reason ?? "Signal"),
    severity: String(s.severity ?? "low"),
    time: "—",
  }));

  const rfqsData = (recentRfqs.length
    ? recentRfqs
    : asArray(d.recentRfqs)
  ).slice(0, 5).map((r: any) => ({
    id: String(r.number ?? r.id ?? "RFQ"),
    restaurant: String(r.organization?.name ?? r.title ?? "—"),
    category: String(r.visibility ?? r.category ?? "—"),
    quantity: "—",
    status: String(r.status ?? "open"),
  }));

  // Activity widget from dashboard recentActivity when RFQ list empty context
  const activityPreview = recentActivity.slice(0, 5).map((a: any, i: number) => ({
    id: str(a.id, String(i)),
    text: str(a.action ?? a.message ?? a.meta?.message, "Event"),
    time: a.createdAt ? String(a.createdAt).replace("T", " ").slice(0, 16) : "—",
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
              Live KPIs from the ResPy API · {kpis.activeRfqs} RFQs · {kpis.activeQuotations} quotations · {kpis.approvedPOs} POs
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/rfqs" className="px-3 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium grid place-items-center hover:opacity-90">
              New RFQ
            </Link>
            <Link to="/reports" className="px-3 h-9 rounded-lg border border-border bg-card text-sm font-medium grid place-items-center hover:bg-muted">
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
        <KpiCard label="Marketplace Revenue" value={fmtMoney(kpis.marketplaceRevenue)} delta={0} icon={<DollarSign className="h-5 w-5" />} to="/payments" accent="success" />
        <KpiCard label="Transaction Volume" value={fmtMoney(kpis.transactionVolume)} delta={0} icon={<TrendingUp className="h-5 w-5" />} to="/reports" accent="primary" />
        <KpiCard label="Avg. Savings Generated" value={kpis.avgSavings ? `${kpis.avgSavings}%` : "—"} delta={0} icon={<Percent className="h-5 w-5" />} to="/reports" accent="info" />
        <KpiCard label="Supplier Success Rate" value={kpis.supplierSuccessRate ? `${kpis.supplierSuccessRate}%` : "—"} delta={0} icon={<Award className="h-5 w-5" />} to="/suppliers" accent="warning" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <ChartCard title="RFQ & Quotation Trend" subtitle="Last months" to="/rfqs" className="xl:col-span-2">
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

        <ChartCard title="Supplier Performance" subtitle="Top suppliers" to="/suppliers">
          {supplierPerformance.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <RadialBarChart innerRadius="30%" outerRadius="100%" data={supplierPerformance} startAngle={90} endAngle={-270}>
                <RadialBar dataKey="winRate" cornerRadius={8} background={{ fill: "var(--muted)" }}
                  fill="var(--chart-2)" />
                <Legend iconSize={8} layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
              </RadialBarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <ChartCard title="Revenue" subtitle="Monthly, AED" to="/payments" className="xl:col-span-2">
          {revenueTrend.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={revenueTrend} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="revenue" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Marketplace Growth" subtitle="Net new accounts" to="/restaurants">
          {growthTrend.length === 0 && ordersByMonth.length === 0 ? (
            <EmptyChart />
          ) : growthTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={growthTrend} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="restaurants" stroke="var(--chart-1)" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="suppliers" stroke="var(--chart-3)" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart
                data={ordersByMonth.map((r: any) => ({
                  month: monthLabel(str(r.month, "")),
                  orders: num(r.count ?? r.orders),
                }))}
                margin={{ top: 5, right: 8, left: -16, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="orders" stroke="var(--chart-1)" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <Header title="Transaction Heatmap" subtitle="By day · hour, last 7 days" to="/activity" />
        <div className="mt-4 overflow-x-auto scrollbar-thin">
          {heatmap.length === 0 ? (
            <EmptyChart height="h-24" />
          ) : (
            <>
              <div className="grid grid-rows-7 grid-flow-col gap-1 min-w-[640px]" style={{ gridTemplateColumns: "repeat(24, minmax(20px, 1fr))" }}>
                {heatmap.map((c) => (
                  <div
                    key={`${c.day}-${c.hour}`}
                    title={`Day ${c.day + 1} · ${c.hour}:00 — ${c.value} txns`}
                    className="aspect-square rounded-[3px]"
                    style={{
                      backgroundColor: `color-mix(in oklch, var(--primary) ${Math.max(5, c.value)}%, var(--muted))`,
                    }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1.5 mt-3 text-[10px] text-muted-foreground">
                <span>Less</span>
                {[10, 25, 50, 75, 100].map((v) => (
                  <div key={v} className="h-2.5 w-4 rounded-[2px]" style={{ backgroundColor: `color-mix(in oklch, var(--primary) ${v}%, var(--muted))` }} />
                ))}
                <span>More</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        <WidgetCard title="Recent RFQs" to="/rfqs">
          <div className="divide-y divide-border">
            {rfqsData.length === 0 && <p className="text-sm text-muted-foreground py-4">No RFQs yet.</p>}
            {rfqsData.map((r) => (
              <Link key={r.id} to="/rfqs" className="flex items-center gap-3 py-2.5 hover:bg-muted/40 -mx-2 px-2 rounded-md transition-colors">
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary grid place-items-center text-[11px] font-mono">
                  {String(r.id).slice(-4)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{r.restaurant}</div>
                  <div className="text-xs text-muted-foreground">{r.category} · {r.quantity}</div>
                </div>
                <StatusPill status={r.status} />
              </Link>
            ))}
          </div>
        </WidgetCard>

        <WidgetCard title="Pending Approvals" to="/approvals" badge={`${approvalsList.length}`}>
          <div className="space-y-2">
            {approvalsList.length === 0 && <p className="text-sm text-muted-foreground py-4">No pending approvals.</p>}
            {approvalsList.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 transition-colors">
                <div className={cn(
                  "h-8 w-8 rounded-lg grid place-items-center",
                  a.priority === "high" ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning"
                )}>
                  <Clock className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{a.subject}</div>
                  <div className="text-xs text-muted-foreground">{a.type} · {a.time}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        </WidgetCard>

        <WidgetCard title="Suspicious Activity" to="/fraud" badge={String(suspiciousActivity.length)} badgeTone="destructive">
          <div className="space-y-2">
            {suspiciousActivity.length === 0 && activityPreview.length === 0 && (
              <p className="text-sm text-muted-foreground py-4">No alerts.</p>
            )}
            {suspiciousActivity.map((s) => (
              <div key={s.id} className="flex items-start gap-3 p-2.5 rounded-lg border border-border bg-destructive/5 hover:bg-destructive/10 transition-colors">
                <AlertTriangle className={cn("h-4 w-4 mt-0.5", s.severity === "high" ? "text-destructive" : "text-warning")} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm">{s.text}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.time}</div>
                </div>
              </div>
            ))}
            {suspiciousActivity.length === 0 && activityPreview.map((a) => (
              <div key={a.id} className="flex items-start gap-3 p-2.5 rounded-lg border border-border bg-muted/30">
                <div className="flex-1 min-w-0">
                  <div className="text-sm">{a.text}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </WidgetCard>

        <WidgetCard title="Top Suppliers" to="/suppliers">
          <div className="space-y-2.5">
            {suppliersData.length === 0 && <p className="text-sm text-muted-foreground py-4">No supplier data.</p>}
            {suppliersData.slice(0, 5).map((s, i) => (
              <Link key={s.id} to="/suppliers" className="flex items-center gap-3 group">
                <div className="text-xs font-mono text-muted-foreground w-4">{i + 1}</div>
                <div className="h-8 w-8 rounded-lg gradient-accent grid place-items-center text-accent-foreground text-xs font-semibold">
                  {s.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate group-hover:text-primary transition-colors">{s.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Star className="h-3 w-3 fill-warning text-warning" /> {s.rating || "—"} · {s.winRate || "—"} orders
                  </div>
                </div>
                <div className="text-sm font-medium">{s.revenue ? fmtMoney(s.revenue) : "—"}</div>
              </Link>
            ))}
          </div>
        </WidgetCard>

        <WidgetCard title="Top Restaurants" to="/restaurants">
          <div className="space-y-2.5">
            {restaurantsData.length === 0 && <p className="text-sm text-muted-foreground py-4">No restaurant data.</p>}
            {[...restaurantsData].sort((a, b) => b.spend - a.spend).slice(0, 5).map((r, i) => (
              <Link key={r.id} to="/restaurants" className="flex items-center gap-3 group">
                <div className="text-xs font-mono text-muted-foreground w-4">{i + 1}</div>
                <div className="h-8 w-8 rounded-lg gradient-primary grid place-items-center text-primary-foreground text-xs font-semibold">
                  {r.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate group-hover:text-primary transition-colors">{r.name}</div>
                  <div className="text-xs text-muted-foreground">{r.region} · {r.branches} orders</div>
                </div>
                <div className="text-sm font-medium">{r.spend ? fmtMoney(r.spend) : "—"}</div>
              </Link>
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

function Header({ title, subtitle, to }: { title: string; subtitle?: string; to?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <h3 className="font-display font-semibold">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {to && (
        <Link to={to} className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1">
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

function ChartCard({ title, subtitle, to, children, className }: { title: string; subtitle?: string; to?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-5 shadow-soft", className)}>
      <Header title={title} subtitle={subtitle} to={to} />
      <div className="mt-3">{children}</div>
    </div>
  );
}

function WidgetCard({
  title, to, children, badge, badgeTone = "primary",
}: {
  title: string; to: string; children: React.ReactNode; badge?: string; badgeTone?: "primary" | "destructive" | "accent";
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-display font-semibold">{title}</h3>
          {badge && (
            <span className={cn(
              "text-[10px] font-medium px-1.5 py-0.5 rounded-md",
              badgeTone === "primary" && "bg-primary/15 text-primary",
              badgeTone === "destructive" && "bg-destructive/15 text-destructive",
              badgeTone === "accent" && "bg-accent/25 text-foreground",
            )}>{badge}</span>
          )}
        </div>
        <Link to={to} className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1">
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
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
  };
  return (
    <Badge variant="outline" className={cn("border-0 text-[10px] capitalize", map[status] ?? "bg-muted text-muted-foreground")}>
      {status}
    </Badge>
  );
}
