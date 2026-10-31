import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Moon,
  ShieldCheck,
  Sun,
  Truck,
  UtensilsCrossed,
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { login } from "@/lib/api/auth";
import { ApiError, num } from "@/lib/api/client";
import { useTheme } from "@/components/admin/ThemeProvider";
import { BrandLogo } from "@/components/admin/BrandLogo";
import heroKitchen from "@/assets/login-hero-kitchen.jpg";
import heroIngredients from "@/assets/login-hero-ingredients.jpg";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — ScopsK Admin" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);

  const { data: counts } = useQuery({
    queryKey: ["login", "org-counts"],
    staleTime: Infinity,
    queryFn: async () => {
      try {
        const raw = localStorage.getItem("respy.login.counts");
        if (raw) {
          const parsed = JSON.parse(raw) as { restaurants?: number; suppliers?: number };
          return {
            restaurants: num(parsed.restaurants),
            suppliers: num(parsed.suppliers),
          };
        }
      } catch {
        /* ignore */
      }
      return { restaurants: 0, suppliers: 0 };
    },
  });

  const restaurantCount = counts?.restaurants ?? 0;
  const supplierCount = counts?.suppliers ?? 0;
  const stats = [
    {
      icon: UtensilsCrossed,
      value: restaurantCount > 0 ? restaurantCount.toLocaleString() : "—",
      label: "Restaurants",
    },
    {
      icon: Truck,
      value: supplierCount > 0 ? supplierCount.toLocaleString() : "—",
      label: "Suppliers",
    },
    { icon: Activity, value: "Live", label: "Orders", live: true },
  ];

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await login(email.trim(), password);
      const name = result.user?.firstName || "there";
      toast.success(`Welcome back, ${name}`);
      navigate({ to: "/dashboard" });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Sign in failed";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-input bg-background py-2.5 pl-11 pr-11 text-sm text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/15";

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="relative hidden overflow-hidden lg:flex lg:w-[54%] xl:w-[56%]">
        <img
          src={heroKitchen}
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/60" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/30" />
        <div className="relative z-10 flex w-full flex-col justify-between p-10 py-12 xl:p-14">
          <BrandLogo variant="onDark" className="h-12 max-w-[200px]" />

          <div className="max-w-xl">
            <h1 className="font-display text-[2.6rem] font-bold leading-[1.08] tracking-tight text-white xl:text-5xl">
              The control surface for <span className="text-primary">B2B foodservice</span> procurement.
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-white/70">
              Manage restaurants, suppliers, requests, and orders — from one command center.
            </p>
            <div className="mt-9 grid grid-cols-3 gap-3.5">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/15 bg-black/30 p-4 backdrop-blur-md">
                  <div className="flex items-center justify-between">
                    <stat.icon className="size-4 text-primary" />
                    {stat.live ? (
                      <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-primary">
                        <span className="size-1.5 rounded-full bg-primary" />
                        Live
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 font-display text-3xl font-bold text-white">{stat.value}</p>
                  <p className="mt-0.5 text-xs font-medium text-white/60">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex max-w-md items-center gap-4 rounded-2xl border border-white/15 bg-black/30 p-4 backdrop-blur-md">
            <img
              src={heroIngredients}
              alt=""
              className="size-16 shrink-0 rounded-xl object-cover"
            />
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-semibold text-white">Sourcing made simple</p>
              <p className="mt-1 text-xs leading-relaxed text-white/60">
                Requests reach the right supplier in minutes.
              </p>
            </div>
            <ArrowRight className="ml-auto size-4 shrink-0 text-primary" />
          </div>
        </div>
      </aside>

      <main className="relative flex min-h-screen flex-1 items-center justify-center px-6 py-12">
        <button
          type="button"
          onClick={toggle}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="absolute right-6 top-6 z-10 flex size-10 items-center justify-center rounded-full border border-border bg-card/70 text-muted-foreground backdrop-blur hover:text-foreground"
        >
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
        <div className="pointer-events-none absolute -top-32 left-1/2 h-80 w-[36rem] max-w-full -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative z-10 w-full max-w-[26.5rem]">
          <div className="rounded-3xl border border-border bg-card p-8 shadow-2xl shadow-black/10">
            <BrandLogo className="mb-5 h-11 max-w-[180px] lg:hidden" />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <ShieldCheck className="size-3.5" />
              ScopsK Admin
            </span>
            <h2 className="mt-4 font-display text-[1.7rem] font-bold tracking-tight">Sign in to your workspace</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Use your admin credentials to access the ScopsK command center.
            </p>

            <form onSubmit={onSubmit} className="mt-7 space-y-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="sarah@primeplate.io"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((open) => !open)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setRemember((value) => !value)}
                className="flex cursor-pointer items-center gap-2.5 pt-0.5 text-left"
              >
                <span
                  className={`flex size-5 shrink-0 items-center justify-center rounded-md border ${
                    remember ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card"
                  }`}
                >
                  {remember ? (
                    <svg viewBox="0 0 16 16" fill="none" className="size-3.5">
                      <path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : null}
                </span>
                <span className="text-sm text-muted-foreground">Remember me on this device</span>
              </button>

              {error ? (
                <p className="text-sm text-destructive" role="alert">{error}</p>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-display text-[0.95rem] font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-80"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="size-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
