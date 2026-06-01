import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ChefHat, ShieldCheck, KeyRound, Fingerprint, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Prime Plate Command Center" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      toast.success("Welcome back, Sarah");
      navigate({ to: "/dashboard" });
    }, 700);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background text-foreground">
      {/* Left brand panel */}
      <div className="relative hidden lg:flex flex-col p-12 overflow-hidden border-r border-border">
        <div className="absolute inset-0 mesh-bg opacity-90" />
        <div className="absolute inset-0 grid-bg opacity-40" />

        <div className="relative flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-xl gradient-primary grid place-items-center shadow-glow">
            <ChefHat className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <div className="font-display font-semibold">Prime Plate</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Command Center</div>
          </div>
        </div>

        <div className="relative mt-auto max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs mb-5">
            <Sparkles className="h-3 w-3 text-accent" />
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
              { v: "$28.4M", l: "Volume" },
            ].map((s) => (
              <div key={s.l} className="glass rounded-xl p-3">
                <div className="font-display text-xl font-semibold">{s.v}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="h-10 w-10 rounded-xl gradient-primary grid place-items-center">
              <ChefHat className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold">Prime Plate</span>
          </div>

          <h2 className="text-2xl font-display font-semibold tracking-tight">Sign in to your workspace</h2>
          <p className="text-sm text-muted-foreground mt-1.5">
            Use your enterprise credentials to access the command center.
          </p>

          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Work email</Label>
              <Input id="email" type="email" placeholder="sarah@primeplate.io" defaultValue="sarah@primeplate.io" required />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button type="button" className="text-xs text-primary hover:underline" onClick={() => toast.info("Reset link sent")}>
                  Forgot?
                </button>
              </div>
              <Input id="password" type="password" placeholder="••••••••" defaultValue="demo-password" required />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="remember" defaultChecked />
              <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground">Remember me on this device</Label>
            </div>

            <Button type="submit" className="w-full h-10" disabled={loading}>
              {loading ? "Signing you in…" : "Sign in"}
            </Button>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-success" /> MFA verified · SOC 2 Type II
            </div>
          </form>

          <div className="my-6 flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">or continue with</span>
            <Separator className="flex-1" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => { setLoading(true); setTimeout(() => navigate({ to: "/dashboard" }), 500); }}>
              <KeyRound className="h-4 w-4 mr-2" /> SSO
            </Button>
            <Button variant="outline" onClick={() => toast.info("Passkey prompt opened")}>
              <Fingerprint className="h-4 w-4 mr-2" /> Passkey
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-8">
            Need access? <Link to="/dashboard" className="text-primary hover:underline">Contact your admin</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
