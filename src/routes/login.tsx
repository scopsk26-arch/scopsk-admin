import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { login } from "@/lib/api/auth";
import { ApiError, num } from "@/lib/api/client";
import { BrandLogo } from "@/components/admin/BrandLogo";
import { useTheme } from "@/components/admin/ThemeProvider";

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

  // Show last-known marketplace counts (saved after admin dashboard loads).
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

  return (
    <div className="min-h-screen grid bg-[#fff6f3] text-foreground lg:grid-cols-2 dark:bg-background">
      <div className="relative hidden items-center justify-center overflow-hidden border-r border-black/5 bg-[#ffc4ab] px-16 py-12 lg:flex dark:border-border dark:bg-background">
        <div className="absolute inset-0 grid-bg" />

        <div className="relative w-full max-w-lg">
          <BrandLogo className="h-12 max-w-[210px]" />
          <h1 className="mt-10 max-w-md text-[2.5rem] font-display font-semibold leading-[1.12] tracking-[-0.03em]">
            The control surface for <span className="text-gradient">B2B foodservice</span> procurement.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
            Manage restaurants and suppliers across anonymous RFQ and quotation workflows
            with enterprise-grade admin tools.
          </p>

          <div className="mt-10 grid max-w-md grid-cols-2 gap-3">
            {[
              {
                v: restaurantCount > 0 ? restaurantCount.toLocaleString() : "—",
                l: "Restaurants",
              },
              {
                v: supplierCount > 0 ? supplierCount.toLocaleString() : "—",
                l: "Suppliers",
              },
            ].map((s) => (
              <div key={s.l} className="rounded-2xl border border-black/5 bg-white px-4 py-4 dark:border-border dark:bg-card">
                <div className="font-display text-[1.65rem] font-semibold leading-none tabular-nums">{s.v}</div>
                <div className="label-caps mt-2">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="relative flex items-center justify-center px-6 py-16">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggle}
          aria-label="Toggle theme"
          className="absolute top-5 right-5 rounded-full"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <div className="w-full max-w-[420px] rounded-3xl border border-black/5 bg-card px-8 py-9 shadow-elevated dark:border-border">
          <div className="mb-8 lg:hidden">
            <BrandLogo className="h-11 max-w-[190px]" />
          </div>

          <p className="text-xs font-semibold text-primary">ScopsK Admin</p>
          <h2 className="mt-2 text-[1.65rem] font-display font-semibold tracking-[-0.03em]">
            Sign in to your workspace
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Use your admin credentials to access the ScopsK command center.
          </p>

          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                type="email"
                placeholder="sarah@primeplate.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="login-field h-11 bg-white"
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="login-field h-11 bg-white pr-11"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((open) => !open)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute top-1/2 right-2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2.5 pt-1">
              <Checkbox id="remember" defaultChecked />
              <Label htmlFor="remember" className="cursor-pointer font-normal leading-none text-muted-foreground">
                Remember me on this device
              </Label>
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">{error}</p>
            )}

            <Button type="submit" className="mt-2 h-11 w-full rounded-xl text-sm font-semibold" disabled={loading}>
              {loading ? "Signing you in…" : "Sign in"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
