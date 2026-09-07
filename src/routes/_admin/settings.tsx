import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Settings as SettingsIcon, Globe, CreditCard, Bell, Shield, Mail, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { api, asArray, str } from "@/lib/api/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/settings")({
  head: () => ({ meta: [{ title: "Settings — ResPy" }] }),
  component: SettingsPage,
});

const SETTING_KEYS = [
  "marketplace_name",
  "default_currency",
  "default_timezone",
  "default_locale",
  "restaurant_commission",
  "supplier_commission",
  "vat_rate",
  "payout_schedule",
  "min_payout",
  "sender_email",
  "sms_sender",
  "email_provider",
  "sms_provider",
  "min_rfq_value_aed",
  "matching_min_stock_pct",
  "default_po_approval_levels",
  "delivery_options",
  "anonymous_marketplace_default",
] as const;

function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: settings = [] } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: async () => asArray(await api.get("/admin/settings", { query: { scope: "platform" } })),
  });

  const { data: flags = [] } = useQuery({
    queryKey: ["admin", "feature-flags"],
    queryFn: async () => asArray(await api.get("/admin/feature-flags")),
  });

  const settingMap = useMemo(
    () => Object.fromEntries(settings.map((s: any) => [str(s.key), s.value])),
    [settings],
  );

  const getSetting = (key: string, fallback: string) => {
    const v = settingMap[key];
    if (v == null) return fallback;
    if (typeof v === "object" && v !== null && "value" in (v as object)) {
      return String((v as { value?: unknown }).value ?? fallback);
    }
    if (Array.isArray(v)) return v.join(", ");
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  };

  const [form, setForm] = useState<Record<string, string>>({});
  const [flagState, setFlagState] = useState<Record<string, boolean>>({});
  const [anonymousDefault, setAnonymousDefault] = useState(true);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const key of SETTING_KEYS) {
      next[key] = getSetting(key, "");
    }
    next.marketplace_name = next.marketplace_name || "Prime Plate Procurement";
    next.default_currency = next.default_currency || "AED";
    next.default_timezone = next.default_timezone || "Asia/Dubai";
    next.default_locale = next.default_locale || "en-AE";
    const legacyCommission = getSetting("default_commission", "4.5") || "4.5";
    next.restaurant_commission = next.restaurant_commission || legacyCommission;
    next.supplier_commission = next.supplier_commission || legacyCommission;
    next.vat_rate = next.vat_rate || "5.0";
    next.payout_schedule = next.payout_schedule || "Weekly";
    next.min_payout = next.min_payout || "500";
    next.sender_email = next.sender_email || "no-reply@primeplate.ae";
    next.sms_sender = next.sms_sender || "PrimePlate";
    next.email_provider = next.email_provider || "Postmark";
    next.sms_provider = next.sms_provider || "Unifonic";
    next.min_rfq_value_aed = next.min_rfq_value_aed || "500";
    next.matching_min_stock_pct = next.matching_min_stock_pct || "20";
    next.default_po_approval_levels = next.default_po_approval_levels || "0";
    next.delivery_options = next.delivery_options
      || "one_to_two_days, two_to_three_days, custom_date";
    const anonRaw = (next.anonymous_marketplace_default || "true").toLowerCase();
    setAnonymousDefault(anonRaw === "true" || anonRaw === "1" || anonRaw === "yes");
    next.anonymous_marketplace_default = anonRaw === "false" ? "false" : "true";
    setForm(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const f of flags as any[]) {
      next[str(f.key)] = Boolean(f.enabled);
    }
    setFlagState(next);
  }, [flags]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, string> = {
        ...form,
        anonymous_marketplace_default: anonymousDefault ? "true" : "false",
      };
      for (const key of SETTING_KEYS) {
        let value: unknown = payload[key] ?? "";
        if (key === "delivery_options") {
          const parts = String(value)
            .split(/[,;]/)
            .map((s) => s.trim())
            .filter(Boolean);
          value = parts;
        }
        if (key === "anonymous_marketplace_default") {
          value = anonymousDefault;
        }
        await api.put("/admin/settings", {
          key,
          scope: "platform",
          value: { value },
        });
      }
      for (const [key, enabled] of Object.entries(flagState)) {
        await api.post("/admin/feature-flags", { key, enabled });
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "feature-flags"] });
      toast.success("Settings saved");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    },
  });

  const sections = [
    {
      icon: <Globe className="h-5 w-5 text-primary" />,
      title: "General",
      description: "Brand, locale and timezone for the marketplace.",
      fields: [
        { key: "marketplace_name", label: "Marketplace name" },
        { key: "default_currency", label: "Default currency" },
        { key: "default_timezone", label: "Default timezone" },
        { key: "default_locale", label: "Default locale" },
      ],
    },
    {
      icon: <CreditCard className="h-5 w-5 text-primary" />,
      title: "Commission & Tax",
      description: "Restaurant and supplier commission rates (platform-only; never shown on invoices).",
      fields: [
        { key: "restaurant_commission", label: "Restaurant commission %" },
        { key: "supplier_commission", label: "Supplier commission %" },
        { key: "vat_rate", label: "VAT rate %" },
        { key: "payout_schedule", label: "Payout schedule" },
        { key: "min_payout", label: "Min. payout amount" },
      ],
    },
    {
      icon: <SlidersHorizontal className="h-5 w-5 text-primary" />,
      title: "Matching & Marketplace",
      description: "RFQ thresholds, supplier matching rules, PO approvals and delivery options.",
      fields: [
        { key: "min_rfq_value_aed", label: "Min RFQ value (AED)" },
        { key: "matching_min_stock_pct", label: "Matching min stock %" },
        { key: "default_po_approval_levels", label: "Default PO approval levels" },
        { key: "delivery_options", label: "Delivery options (comma-separated)" },
      ],
    },
    {
      icon: <Mail className="h-5 w-5 text-primary" />,
      title: "Email & SMS",
      description: "Templates and provider configuration.",
      fields: [
        { key: "sender_email", label: "Sender email" },
        { key: "sms_sender", label: "SMS sender" },
        { key: "email_provider", label: "Email provider" },
        { key: "sms_provider", label: "SMS provider" },
      ],
    },
  ];

  const toggles = (flags as any[]).length
    ? (flags as any[]).map((f) => ({
        key: str(f.key),
        label: str(f.key),
        desc: str(f.description, "Feature flag"),
      }))
    : [
        { key: "ai_auto_flag", label: "AI auto-flag suspicious quotations", desc: "Rule-based heuristic flagging." },
        { key: "enforce_kyc", label: "Enforce supplier KYC before publishing", desc: "Block unverified suppliers." },
        { key: "require_2fa", label: "Two-factor authentication required", desc: "Admin 2FA policy." },
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
            Configure marketplace, matching rules, finance, communications and security.
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
                <div key={f.key}>
                  <Label className="text-xs text-muted-foreground">{f.label}</Label>
                  <Input
                    value={form[f.key] ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              ))}
              {s.title === "Matching & Marketplace" && (
                <div className="flex items-start justify-between gap-4 py-2 border-t border-border mt-2 pt-4">
                  <div>
                    <div className="text-sm font-medium">Anonymous marketplace default</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Default anonymity for new RFQs when org does not override.
                    </div>
                  </div>
                  <Switch checked={anonymousDefault} onCheckedChange={setAnonymousDefault} />
                </div>
              )}
            </div>
          </div>
        ))}

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft lg:col-span-2">
          <div className="flex items-center gap-2.5 mb-1"><Shield className="h-5 w-5 text-primary" /><h2 className="font-display font-semibold">Platform toggles</h2></div>
          <p className="text-sm text-muted-foreground mb-4">Feature flags persist via POST /admin/feature-flags.</p>
          <div className="space-y-4">
            {toggles.map((t) => (
              <div key={t.key} className="flex items-start justify-between gap-4 py-2 border-b border-border last:border-0">
                <div>
                  <div className="text-sm font-medium">{t.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t.desc}</div>
                </div>
                <Switch
                  checked={Boolean(flagState[t.key])}
                  onCheckedChange={(on) => setFlagState((p) => ({ ...p, [t.key]: on }))}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
            queryClient.invalidateQueries({ queryKey: ["admin", "feature-flags"] });
          }}
        >
          Reset
        </Button>
        <Button disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
          <Bell className="h-4 w-4 mr-1.5" />
          {saveMutation.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
