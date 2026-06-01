import { createFileRoute, Link } from "@tanstack/react-router";
import { KpiCard } from "@/components/admin/KpiCard";
import {
  Store, Truck, FileText, Quote, ClipboardList, DollarSign, TrendingUp,
  Brain, Percent, Award, ArrowRight, AlertTriangle, Clock, Star,
} from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, LineChart, Line, RadialBarChart, RadialBar, Legend,
} from "recharts";
import {
  kpis, rfqTrend, revenueTrend, supplierPerformance, rfqs as rfqsData,
  pendingApprovals, suspiciousActivity, suppliers as suppliersData,
  restaurants as restaurantsData, aiInsights, heatmap,
} from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_admin/dashboard")({
  head: () => ({ meta: [{ title: "Command Center — Prime Plate" }] }),
  component: Dashboard,
});

const fmtMoney = (n: number) => `AED ${(n / 1000).toFixed(n >= 1_000_000 ? 2 : 0)}${n >= 1_000_000 ? "M" : "K"}`;

function Dashboard() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Hero header */}
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
              Good morning, Sarah
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">
              28 events in the last hour · 4 items need your attention · AI generated 142 recommendations today
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/rfqs" className="px-3 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium grid place-items-center hover:opacity-90">
              New RFQ
            </Link>
            <Link to="/reports" className="px-3 h-9 rounded-lg border border-border bg-card text-sm font-medium grid place-items-center hover:bg-muted">
              Generate Report
            </Link>
            <Link to="/ai-center" className="px-3 h-9 rounded-lg glass text-sm font-medium grid place-items-center hover:bg-muted/40 inline-flex">
              <Brain className="h-4 w-4 mr-1.5 text-accent" /> AI Center
            </Link>
          </div>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <KpiCard label="Total Restaurants" value={kpis.totalRestaurants.toLocaleString()} delta={12.4} icon={<Store className="h-5 w-5" />} to="/restaurants" accent="primary" />
        <KpiCard label="Total Suppliers" value={kpis.totalSuppliers.toLocaleString()} delta={8.1} icon={<Truck className="h-5 w-5" />} to="/suppliers" accent="accent" />
        <KpiCard label="Active RFQs" value={kpis.activeRfqs.toString()} delta={-3.2} icon={<FileText className="h-5 w-5" />} to="/rfqs" accent="info" />
        <KpiCard label="Active Quotations" value={kpis.activeQuotations.toLocaleString()} delta={14.7} icon={<Quote className="h-5 w-5" />} to="/quotations" accent="warning" />
        <KpiCard label="Approved POs" value={kpis.approvedPOs.toString()} delta={6.3} icon={<ClipboardList className="h-5 w-5" />} to="/purchase-orders" accent="success" />
        <KpiCard label="Marketplace Revenue" value={fmtMoney(kpis.marketplaceRevenue)} delta={18.2} icon={<DollarSign className="h-5 w-5" />} to="/payments" accent="success" />
        <KpiCard label="Transaction Volume" value={fmtMoney(kpis.transactionVolume)} delta={22.5} icon={<TrendingUp className="h-5 w-5" />} to="/reports" accent="primary" />
        <KpiCard label="AI Recommendations" value={kpis.aiRecommendations.toLocaleString()} delta={31.8} icon={<Brain className="h-5 w-5" />} to="/ai-center" accent="accent" />
        <KpiCard label="Avg. Savings Generated" value={`${kpis.avgSavings}%`} delta={2.1} icon={<Percent className="h-5 w-5" />} to="/reports" accent="info" />
        <KpiCard label="Supplier Success Rate" value={`${kpis.supplierSuccessRate}%`} delta={1.4} icon={<Award className="h-5 w-5" />} to="/suppliers" accent="warning" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <ChartCard title="RFQ & Quotation Trend" subtitle="Last 9 months" to="/rfqs" className="xl:col-span-2">
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
        </ChartCard>

        <ChartCard title="Supplier Performance" subtitle="Top dimensions" to="/suppliers">
          <ResponsiveContainer width="100%" height={260}>
            <RadialBarChart innerRadius="30%" outerRadius="100%" data={supplierPerformance} startAngle={90} endAngle={-270}>
              <RadialBar dataKey="winRate" cornerRadius={8} background={{ fill: "var(--muted)" }}
                fill="var(--chart-2)" />
              <Legend iconSize={8} layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
            </RadialBarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <ChartCard title="Revenue & Commission" subtitle="Monthly, USD" to="/payments" className="xl:col-span-2">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={revenueTrend} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="revenue" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="commission" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Marketplace Growth" subtitle="Net new accounts" to="/restaurants">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={rfqTrend.map((d) => ({ month: d.month, restaurants: Math.round(d.rfqs * 1.3), suppliers: Math.round(d.quotations * 0.4) }))} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="restaurants" stroke="var(--chart-1)" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="suppliers" stroke="var(--chart-3)" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Transaction Heatmap */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <Header title="Transaction Heatmap" subtitle="By day · hour, last 7 days" to="/activity" />
        <div className="mt-4 overflow-x-auto scrollbar-thin">
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
        </div>
      </div>

      {/* Widgets row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        <WidgetCard title="Recent RFQs" to="/rfqs">
          <div className="divide-y divide-border">
            {rfqsData.slice(0, 5).map((r) => (
              <Link key={r.id} to="/rfqs" className="flex items-center gap-3 py-2.5 hover:bg-muted/40 -mx-2 px-2 rounded-md transition-colors">
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary grid place-items-center text-[11px] font-mono">
                  {r.id.split("-")[1]}
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

        <WidgetCard title="Pending Approvals" to="/quotations" badge={`${pendingApprovals.length}`}>
          <div className="space-y-2">
            {pendingApprovals.map((a) => (
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

        <WidgetCard title="Suspicious Activity" to="/fraud" badge="3" badgeTone="destructive">
          <div className="space-y-2">
            {suspiciousActivity.map((s) => (
              <div key={s.id} className="flex items-start gap-3 p-2.5 rounded-lg border border-border bg-destructive/5 hover:bg-destructive/10 transition-colors">
                <AlertTriangle className={cn("h-4 w-4 mt-0.5", s.severity === "high" ? "text-destructive" : "text-warning")} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm">{s.text}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.time}</div>
                </div>
              </div>
            ))}
          </div>
        </WidgetCard>

        <WidgetCard title="Top Suppliers" to="/suppliers">
          <div className="space-y-2.5">
            {suppliersData.slice(0, 5).map((s, i) => (
              <Link key={s.id} to="/suppliers" className="flex items-center gap-3 group">
                <div className="text-xs font-mono text-muted-foreground w-4">{i + 1}</div>
                <div className="h-8 w-8 rounded-lg gradient-accent grid place-items-center text-accent-foreground text-xs font-semibold">
                  {s.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate group-hover:text-primary transition-colors">{s.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Star className="h-3 w-3 fill-warning text-warning" /> {s.rating} · {s.winRate}% win
                  </div>
                </div>
                <div className="text-sm font-medium">{fmtMoney(s.revenue)}</div>
              </Link>
            ))}
          </div>
        </WidgetCard>

        <WidgetCard title="Top Restaurants" to="/restaurants">
          <div className="space-y-2.5">
            {[...restaurantsData].sort((a, b) => b.spend - a.spend).slice(0, 5).map((r, i) => (
              <Link key={r.id} to="/restaurants" className="flex items-center gap-3 group">
                <div className="text-xs font-mono text-muted-foreground w-4">{i + 1}</div>
                <div className="h-8 w-8 rounded-lg gradient-primary grid place-items-center text-primary-foreground text-xs font-semibold">
                  {r.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate group-hover:text-primary transition-colors">{r.name}</div>
                  <div className="text-xs text-muted-foreground">{r.region} · {r.branches} branches</div>
                </div>
                <div className="text-sm font-medium">{fmtMoney(r.spend)}</div>
              </Link>
            ))}
          </div>
        </WidgetCard>

        <WidgetCard title="AI Marketplace Insights" to="/ai-center" badgeTone="accent" badge="AI">
          <div className="space-y-2.5">
            {aiInsights.map((ai) => (
              <div key={ai.id} className="p-3 rounded-lg glass relative overflow-hidden">
                <div className="absolute -top-8 -right-8 h-20 w-20 rounded-full bg-accent/20 blur-2xl" />
                <div className="relative">
                  <div className="text-sm font-medium">{ai.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{ai.detail}</div>
                </div>
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
              badgeTone === "accent" && "bg-accent/15 text-accent",
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
