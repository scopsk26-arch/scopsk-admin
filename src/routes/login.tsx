import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

import { Sparkles, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { login } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { BrandLogo } from "@/components/admin/BrandLogo";
import { useTheme } from "@/components/admin/ThemeProvider";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — ResPy Admin" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
    <div className="min-h-screen grid lg:grid-cols-2 bg-background text-foreground">
      {/* Left brand panel */}
      <div className="relative hidden lg:flex flex-col p-12 overflow-hidden border-r border-border">
        <div className="absolute inset-0 mesh-bg opacity-90" />
        <div className="absolute inset-0 grid-bg opacity-40" />

        <div className="relative">
          <BrandLogo className="h-14 max-w-[260px]" />
        </div>

        <div className="relative mt-auto max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card/80 text-xs mb-5">
            <Sparkles className="h-3 w-3 text-primary" />
            AI-powered procurement intelligence
          </div>
          <h1 className="text-4xl font-display font-semibold tracking-tight leading-tight">
            The control surface for <span className="text-gradient">B2B foodservice</span> procurement.
          </h1>
          <p className="text-sm text-muted-foreground mt-4">
            Manage thousands of restaurants and suppliers across anonymous RFQ and quotation workflows
            with enterprise-grade tools and AI copilots.
          </p>

          <div className="mt-8 grid grid-cols-3 gap-3">
            {[
              { v: "2,847", l: "Restaurants" },
              { v: "1,293", l: "Suppliers" },
              { v: "AED 28.4M", l: "Volume" },
            ].map((s) => (
            <div key={s.l} className="rounded-xl border border-border bg-card/90 p-3 shadow-soft">
                <div className="font-display text-xl font-semibold tabular-nums">{s.v}</div>
                <div className="label-caps mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="relative flex items-center justify-center p-6 lg:p-12">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggle}
          aria-label="Toggle theme"
          className="absolute top-4 right-4"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <BrandLogo className="h-12 max-w-[200px]" />
          </div>

          <h2 className="text-2xl font-display font-semibold tracking-tight">Sign in to your workspace</h2>
          <p className="text-sm text-muted-foreground mt-1.5">
            Use your enterprise credentials to access the ResPy command center.
          </p>

          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                type="email"
                placeholder="sarah@primeplate.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button type="button" className="text-xs text-primary hover:underline" onClick={() => toast.info("Reset link sent")}>
                  Forgot?
                </button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="remember" defaultChecked />
              <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground">Remember me on this device</Label>
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">{error}</p>
            )}

            <Button type="submit" className="w-full h-10" disabled={loading}>
              {loading ? "Signing you in…" : "Sign in"}
            </Button>

          </form>


          <p className="text-xs text-muted-foreground text-center mt-8">
            Need access? <Link to="/dashboard" className="text-primary hover:underline">Contact your admin</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
