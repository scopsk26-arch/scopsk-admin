import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Settings as SettingsIcon, Globe, CreditCard, Bell, Shield, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { api, asArray, str } from "@/lib/api/client";

export const Route = createFileRoute("/_admin/settings")({
  head: () => ({ meta: [{ title: "Settings — Prime Plate" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data: settings = [] } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: async () => {
      try {
        return asArray(await api.get("/admin/settings", { query: { scope: "platform" } }));
      } catch {
        return [];
      }
    },
  });

  const { data: flags = [] } = useQuery({
    queryKey: ["admin", "feature-flags"],
    queryFn: async () => {
      try {
        return asArray(await api.get("/admin/feature-flags"));
      } catch {
        return [];
      }
    },
  });

  const settingMap = Object.fromEntries(
    settings.map((s: any) => [str(s.key), s.value]),
  );

  const getSetting = (key: string, fallback: string) => {
    const v = settingMap[key];
    if (v == null) return fallback;
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  };

  const sections = [
    {
      icon: <Globe className="h-5 w-5 text-primary" />,
      title: "General",
      description: "Brand, locale and timezone for the marketplace.",
      fields: [
        { label: "Marketplace name", value: getSetting("marketplace_name", "Prime Plate Procurement") },
        { label: "Default currency", value: getSetting("default_currency", "AED — UAE Dirham") },
        { label: "Default timezone", value: getSetting("default_timezone", "Asia/Dubai (GMT+4)") },
        { label: "Default locale", value: getSetting("default_locale", "English (en-AE)") },
      ],
    },
    {
      icon: <CreditCard className="h-5 w-5 text-primary" />,
      title: "Commission & Tax",
      description: "Default commission tiers and VAT configuration.",
      fields: [
        { label: "Default commission", value: getSetting("default_commission", "4.5%") },
        { label: "VAT rate", value: getSetting("vat_rate", "5.0%") },
        { label: "Payout schedule", value: getSetting("payout_schedule", "Weekly (Mondays)") },
        { label: "Min. payout amount", value: getSetting("min_payout", "AED 500") },
      ],
    },
    {
      icon: <Mail className="h-5 w-5 text-primary" />,
      title: "Email & SMS",
      description: "Templates and provider configuration.",
      fields: [
        { label: "Sender email", value: getSetting("sender_email", "no-reply@primeplate.ae") },
        { label: "SMS sender", value: getSetting("sms_sender", "PrimePlate") },
        { label: "Email provider", value: getSetting("email_provider", "Postmark") },
        { label: "SMS provider", value: getSetting("sms_provider", "Unifonic") },
      ],
    },
  ];

  const toggles = flags.length
    ? flags.map((f: any) => ({
        label: str(f.key),
        desc: str(f.description, "Feature flag"),
        on: Boolean(f.enabled),
      }))
    : [
        { label: "AI auto-flag suspicious quotations", desc: "Automatically flag quotations scoring below 70.", on: true },
        { label: "Enforce supplier KYC before publishing", desc: "Block supplier listings without verified KYC.", on: true },
        { label: "Two-factor authentication required", desc: "Require 2FA for all admin team members.", on: true },
        { label: "Public catalog browsing", desc: "Allow unauthenticated visitors to view the catalog.", on: false },
        { label: "Auto-approve recurring orders", desc: "Skip manual review for repeat POs within tolerance.", on: false },
      ];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-xl glass grid place-items-center">
          <SettingsIcon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure marketplace, finance, communications and security.
            {settings.length ? ` · ${settings.length} platform settings loaded` : ""}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {sections.map((s) => (
          <div key={s.title} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <div className="flex items-center gap-2.5 mb-1">{s.icon}<h2 className="font-display font-semibold">{s.title}</h2></div>
            <p className="text-sm text-muted-foreground mb-4">{s.description}</p>
            <div className="space-y-3">
              {s.fields.map((f) => (
                <div key={f.label}>
                  <Label className="text-xs text-muted-foreground">{f.label}</Label>
                  <Input defaultValue={f.value} className="mt-1" />
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft lg:col-span-2">
          <div className="flex items-center gap-2.5 mb-1"><Shield className="h-5 w-5 text-primary" /><h2 className="font-display font-semibold">Platform toggles</h2></div>
          <p className="text-sm text-muted-foreground mb-4">Feature flags and security defaults.</p>
          <div className="space-y-4">
            {toggles.map((t) => (
              <div key={t.label} className="flex items-start justify-between gap-4 py-2 border-b border-border last:border-0">
                <div>
                  <div className="text-sm font-medium">{t.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t.desc}</div>
                </div>
                <Switch defaultChecked={t.on} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline">Reset</Button>
        <Button><Bell className="h-4 w-4 mr-1.5" />Save changes</Button>
      </div>
    </div>
  );
}
