import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { KpiCard } from "@/components/admin/KpiCard";
import {
  Store, Truck, FileText, ClipboardList,
  ShieldCheck, Building2, PackagePlus, Wallet, LifeBuoy, Scale, ChevronRight,
} from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { StatusBadge } from "@/components/admin/DataPage";
import { cn } from "@/lib/utils";
import { asArray, num, str } from "@/lib/api/client";
import {
  fetchAccountReviewQueue,
  fetchAdminDashboard,
  fetchAdminWalletCreditRequests,
  fetchKycWaitingCounts,
} from "@/lib/api/resources";
import { getSessionUser, subscribeSession } from "@/lib/auth-session";

export const Route = createFileRoute("/_admin/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — ScopsK" }] }),
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

function greetingFor(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

async function waitingRequestCount(category: "credit_limit" | "wallet_topup") {
  const statuses = ["open", "waiting", "in_progress"];
  const pages = await Promise.all(
    statuses.map((status) =>
      fetchAdminWalletCreditRequests({ category, status, page: 1, limit: 1 }),
    ),
  );
  return pages.reduce((sum, page) => sum + page.total, 0);
}

function Dashboard() {
  const now = useClock();
  const user = useSyncExternalStore(subscribeSession, getSessionUser, () => null);
  const firstName = user?.firstName?.trim() || user?.email?.split("@")[0] || "there";

  const { data: dash, isError, isLoading } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: fetchAdminDashboard,
    refetchOnWindowFocus: true,
  });
  const kycCounts = useQuery({
    queryKey: ["kyc", "counts"],
    queryFn: fetchKycWaitingCounts,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
  const creditWaiting = useQuery({
    queryKey: ["admin", "wallet-waiting", "credit_limit"],
    queryFn: () => waitingRequestCount("credit_limit"),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
  const walletWaiting = useQuery({
    queryKey: ["admin", "wallet-waiting", "wallet_topup"],
    queryFn: () => waitingRequestCount("wallet_topup"),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
  const walletTab =
    (walletWaiting.data ?? 0) > (creditWaiting.data ?? 0) ? "wallet-requests" : "credit-requests";
  const accountReview = useQuery({
    queryKey: ["organizations", "both", "pendingApproval"],
    queryFn: () => fetchAccountReviewQueue("both"),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const d = (dash ?? {}) as Record<string, any>;
  const trends = (d.trends ?? {}) as Record<string, any>;

  const totalRestaurants = num(d.restaurants ?? d.restaurantCount);
  const totalSuppliers = num(d.suppliers ?? d.supplierCount);
  const hasLive = d.activeRfqs !== undefined || d.openPurchaseOrders !== undefined;
  const kpis = {
    totalRestaurants,
    totalSuppliers,
    activeRfqs: num(hasLive ? d.activeRfqs : d.rfqs),
    approvedPOs: num(hasLive ? d.openPurchaseOrders : d.purchaseOrders),
  };
  const pending = (d.pendingActions ?? {}) as Record<string, unknown>;
  const pendingRows = [
    {
      key: "kyc",
      label: "Documents to review",
      count: kycCounts.isSuccess
        ? kycCounts.data.waitingDocuments
        : num(pending.kyc ?? d.kycPending),
      to: "/kyc" as const,
      icon: ShieldCheck,
    },
    {
      key: "orgs",
      label: "Account review",
      count: accountReview.isSuccess
        ? accountReview.data.length
        : num(pending.orgApprovals ?? d.orgsPendingApproval),
      to: "/restaurant-approvals" as const,
      icon: Building2,
    },
    {
      key: "products",
      label: "Product requests",
      count: num(pending.productRequests ?? d.productRequestsPending),
      to: "/product-requests" as const,
      icon: PackagePlus,
    },
    {
      key: "wallet",
      label: "Wallet and credit requests",
      count: num(pending.walletCredit ?? d.walletCreditPending),
      to: "/wallets" as const,
      icon: Wallet,
    },
    {
      key: "support",
      label: "Support tickets",
      count: num(pending.support ?? d.openSupportTickets),
      to: "/support" as const,
      icon: LifeBuoy,
    },
    {
      key: "disputes",
      label: "Disputes",
      count: num(pending.disputes ?? d.openDisputes),
      to: "/disputes" as const,
      icon: Scale,
    },
  ];
  const attentionRows = pendingRows.filter((row) => row.count > 0);
  const waiting = attentionRows.reduce((sum, row) => sum + row.count, 0);
  const statusLabel = isLoading
    ? "Checking marketplace"
    : isError
      ? "Live status unavailable"
      : waiting > 0
        ? `Needs attention · ${waiting} waiting`
        : "Marketplace operating normally";

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
  const rfqTrend = rfqByMonth.map((r: any) => {
    const month = str(r.month, "");
    return {
      month: monthLabel(month),
      monthKey: month,
      rfqs: num(r.count ?? r.rfqs),
    };
  });
  const trendHasActivity = rfqTrend.some((r) => r.rfqs > 0);

  const suppliersData = asArray(d.topSuppliers).map((s: any) => ({
    id: str(s.id),
    name: str(s.name, "—"),
    logoUrl: str(s.logoUrl ?? s.logo_url, ""),
    city: str(s.city ?? s.region, ""),
    orderCount: num(s.orderCount ?? s.winRate),
    revenue: num(s.revenue),
  }));

  const restaurantsData = asArray(d.topRestaurants).map((r: any) => ({
    id: str(r.id),
    name: str(r.name, "—"),
    logoUrl: str(r.logoUrl ?? r.logo_url, ""),
    city: str(r.city ?? r.region, ""),
    orderCount: num(r.orderCount ?? r.branches),
    spend: num(r.spend ?? r.revenue),
  }));

  const rfqsData = asArray(d.recentRfqs)
    .slice(0, 6)
    .map((r: any) => ({
      id: str(r.id ?? r.number),
      number: str(r.number ?? r.id, "RFQ"),
      title: str(r.title, "Request"),
      restaurant: str(r.organization?.name ?? r.restaurant, "—"),
      logoUrl: str(r.organization?.logoUrl ?? r.organization?.logo_url ?? r.logoUrl, ""),
      status: str(r.status, "published"),
    }));

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 lg:p-8 shadow-soft">
        <div className="absolute inset-0 mesh-bg opacity-80" />
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full glass text-[11px] mb-3">
              <span className={cn(
                "h-1.5 w-1.5 rounded-full",
                isError ? "bg-destructive" : waiting > 0 ? "bg-warning" : "bg-success animate-pulse",
              )} />
              {statusLabel}
            </div>
            <h1 className="text-2xl lg:text-3xl font-display font-semibold tracking-tight">
              {greetingFor(now)}, {firstName}
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">
              {hasLive
                ? `Live · ${kpis.activeRfqs} open requests · ${kpis.approvedPOs} open orders`
                : `Live · ${kpis.activeRfqs} requests · ${kpis.approvedPOs} orders`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/rfqs"
              className="px-3 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium grid place-items-center hover:opacity-90"
            >
              Quote requests
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

      {attentionRows.length > 0 ? (
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="font-display font-semibold text-lg">Needs attention</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Documents, account reviews, wallet and credit requests, tickets, and disputes waiting on you.
            </p>
          </div>
          <div className="text-sm font-medium tabular-nums text-muted-foreground">
            {waiting} open
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
          {attentionRows.map((row) => {
            const Icon = row.icon;
            return row.key === "wallet" ? (
              <Link
                key={row.key}
                to="/wallets"
                search={{ tab: walletTab }}
                className="flex items-center gap-3 rounded-xl border border-border bg-background/60 px-3 py-3 hover:bg-muted/60 transition-colors"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium leading-snug">{row.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {row.count} waiting
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {row.count}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ) : (
              <Link
                key={row.key}
                to={row.to}
                className="flex items-center gap-3 rounded-xl border border-border bg-background/60 px-3 py-3 hover:bg-muted/60 transition-colors"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium leading-snug">{row.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {row.count} waiting
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {row.count}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Restaurants" value={kpis.totalRestaurants.toLocaleString()} icon={<Store className="h-5 w-5" />} to="/restaurants" accent="primary" />
        <KpiCard label="Total Suppliers" value={kpis.totalSuppliers.toLocaleString()} icon={<Truck className="h-5 w-5" />} to="/suppliers" accent="accent" />
        <KpiCard label="Open requests" value={kpis.activeRfqs.toString()} icon={<FileText className="h-5 w-5" />} to="/rfqs" accent="info" />
        <KpiCard label="Open orders" value={kpis.approvedPOs.toString()} icon={<ClipboardList className="h-5 w-5" />} to="/purchase-orders" accent="success" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <ChartCard
          title="Quote requests"
          subtitle="Last 12 months"
          className="xl:col-span-2"
        >
          {!trendHasActivity ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={rfqTrend} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="dash-rfqs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis
                  allowDecimals={false}
                  width={32}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => [value, "Quote requests"]}
                />
                <Area type="monotone" dataKey="rfqs" name="rfqs" stroke="var(--chart-1)" fill="url(#dash-rfqs)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <WidgetCard title="Recent quote requests" href="/rfqs">
          <div className="divide-y divide-border -mx-1">
            {rfqsData.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 px-1">No quote requests yet.</p>
            )}
            {rfqsData.map((r) => (
              <Link
                key={r.id}
                to="/rfqs"
                className="flex items-center gap-3 py-2.5 px-1 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <OrgAvatar name={r.restaurant} src={r.logoUrl} tone="primary" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{r.restaurant}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {r.number} · {r.title}
                  </div>
                </div>
                <StatusPill status={r.status} />
              </Link>
            ))}
          </div>
        </WidgetCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WidgetCard title="Top Suppliers" href="/suppliers">
          <div className="space-y-1">
            {suppliersData.length === 0 && (
              <p className="text-sm text-muted-foreground py-4">No supplier activity yet.</p>
            )}
            {suppliersData.slice(0, 6).map((s, i) => (
              <Link
                key={s.id || i}
                to="/suppliers"
                className="flex items-center gap-3 rounded-lg px-1 py-2 hover:bg-muted/50 transition-colors"
              >
                <div className="text-xs font-mono text-muted-foreground w-4 tabular-nums">{i + 1}</div>
                <OrgAvatar name={s.name} src={s.logoUrl} tone="accent" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{s.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {[s.city, s.orderCount ? `${s.orderCount} invites / orders` : null]
                      .filter(Boolean)
                      .join(" · ") || "Supplier"}
                  </div>
                </div>
                <div className="text-sm font-medium tabular-nums">
                  {s.revenue ? fmtMoney(s.revenue) : "—"}
                </div>
              </Link>
            ))}
          </div>
        </WidgetCard>

        <WidgetCard title="Top Restaurants" href="/restaurants">
          <div className="space-y-1">
            {restaurantsData.length === 0 && (
              <p className="text-sm text-muted-foreground py-4">No restaurant activity yet.</p>
            )}
            {restaurantsData.slice(0, 6).map((r, i) => (
              <Link
                key={r.id || i}
                to="/restaurants"
                className="flex items-center gap-3 rounded-lg px-1 py-2 hover:bg-muted/50 transition-colors"
              >
                <div className="text-xs font-mono text-muted-foreground w-4 tabular-nums">{i + 1}</div>
                <OrgAvatar name={r.name} src={r.logoUrl} tone="primary" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{r.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {[r.city, r.orderCount ? `${r.orderCount} requests` : null]
                      .filter(Boolean)
                      .join(" · ") || "Restaurant"}
                  </div>
                </div>
                <div className="text-sm font-medium tabular-nums">
                  {r.spend ? fmtMoney(r.spend) : "—"}
                </div>
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

function WidgetCard({
  title,
  href,
  children,
}: {
  title: string;
  href?: "/rfqs" | "/suppliers" | "/restaurants";
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="font-display font-semibold">{title}</h3>
        {href ? (
          <Link to={href} className="text-xs font-medium text-primary hover:underline">
            View all
          </Link>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function OrgAvatar({
  name,
  src,
  tone = "primary",
}: {
  name: string;
  src?: string | null;
  tone?: "primary" | "accent";
}) {
  const [failed, setFailed] = useState(!src);
  const letter = (name || "?").replace(/[^A-Za-z0-9]/g, "").charAt(0).toUpperCase() || "?";
  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        className="h-9 w-9 rounded-lg object-cover border border-border shrink-0 bg-muted"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div
      className={cn(
        "h-9 w-9 rounded-lg grid place-items-center text-xs font-semibold shrink-0",
        tone === "accent"
          ? "bg-accent text-accent-foreground"
          : "bg-primary/10 text-primary",
      )}
    >
      {letter}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  return <StatusBadge status={status} />;
}
