import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SlidersHorizontal, Coins, Link2 } from "lucide-react";
import { FieldLabel } from "@/components/admin/DataPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  fetchReferralSettings,
  updateReferralSettings,
  type ReferralProgramSettings,
} from "@/lib/api/resources";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/referral-settings")({
  head: () => ({ meta: [{ title: "Referral Settings — ScopsK" }] }),
  component: ReferralSettingsPage,
});

/** Only value the API currently accepts — kept as a list so new events need no UI rework. */
const QUALIFICATION_EVENTS = [
  { value: "FIRST_COMPLETED_ORDER", label: "First completed order" },
] as const;

type FormState = {
  enabled: boolean;
  qualificationEvent: string;
  currency: string;
  referrerRewardAmount: string;
  referredRewardAmount: string;
  minimumOrderAmount: string;
  maxRewardsPerReferrer: string;
  rewardExpiryDays: string;
  shareBaseUrl: string;
};

function toForm(s: ReferralProgramSettings): FormState {
  return {
    enabled: s.enabled,
    qualificationEvent: s.qualificationEvent,
    currency: s.currency,
    referrerRewardAmount: String(s.referrerRewardAmount),
    referredRewardAmount: String(s.referredRewardAmount),
    minimumOrderAmount: String(s.minimumOrderAmount),
    maxRewardsPerReferrer: s.maxRewardsPerReferrer == null ? "" : String(s.maxRewardsPerReferrer),
    rewardExpiryDays: s.rewardExpiryDays == null ? "" : String(s.rewardExpiryDays),
    shareBaseUrl: s.shareBaseUrl,
  };
}

export function ReferralSettingsPanel({
  embedded = false,
  onBack,
}: {
  embedded?: boolean;
  onBack?: () => void;
}) {
  const qc = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "referral-settings"],
    queryFn: fetchReferralSettings,
  });

  const [form, setForm] = useState<FormState | null>(null);

  useEffect(() => {
    if (data) setForm(toForm(data));
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form) throw new Error("Settings have not loaded yet");
      if (!form.qualificationEvent.trim()) throw new Error("Qualification event is required");
      if (!form.currency.trim()) throw new Error("Currency is required");
      if (form.referrerRewardAmount.trim() === "") throw new Error("Referrer reward is required");
      if (form.referredRewardAmount.trim() === "") throw new Error("Referred reward is required");
      if (form.minimumOrderAmount.trim() === "") throw new Error("Minimum qualifying order is required");
      if (!form.shareBaseUrl.trim()) throw new Error("Share base URL is required");
      return updateReferralSettings({
        ...form,
        maxRewardsPerReferrer: form.maxRewardsPerReferrer.trim() === "" ? null : form.maxRewardsPerReferrer,
        rewardExpiryDays: form.rewardExpiryDays.trim() === "" ? null : form.rewardExpiryDays,
      });
    },
    onSuccess: async (saved) => {
      toast.success("Referral program saved");
      qc.setQueryData(["admin", "referral-settings"], saved);
      await qc.invalidateQueries({ queryKey: ["admin", "referral-settings"] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to save referral settings"),
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  return (
    <div className={embedded ? "space-y-6" : "p-6 lg:p-8 space-y-6"}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-xl border border-border bg-card shadow-soft grid place-items-center shrink-0">
            <SlidersHorizontal className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-semibold tracking-tight">Referral Settings</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Platform-wide referral program — reward amounts, qualification rules and share link base URL.
            </p>
          </div>
        </div>
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            Back to referrals
          </Button>
        )}
      </div>

      {isLoading || !form ? (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft text-sm text-muted-foreground">
          {isError
            ? `Failed to load referral settings${error instanceof Error ? ` — ${error.message}` : ""}.`
            : "Loading referral settings…"}
        </div>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-4">
              <div className="flex items-center gap-2.5">
                <SlidersHorizontal className="h-5 w-5 text-primary" />
                <h2 className="font-display font-semibold">Program</h2>
              </div>
              <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
                <div>
                  <div className="text-sm font-medium">Referral program enabled</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    When off, referral codes stop earning rewards for new qualifying orders.
                  </div>
                </div>
                <Switch checked={form.enabled} onCheckedChange={(on) => set("enabled", on)} />
              </div>
              <div>
                <FieldLabel required className="text-muted-foreground">Qualification event</FieldLabel>
                <Select
                  value={form.qualificationEvent}
                  onValueChange={(v) => set("qualificationEvent", v)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUALIFICATION_EVENTS.map((e) => (
                      <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  The moment a pending referral becomes eligible for a reward.
                </p>
              </div>
              <div>
                <FieldLabel required className="text-muted-foreground">Currency</FieldLabel>
                <Input
                  value={form.currency}
                  onChange={(e) => set("currency", e.target.value.toUpperCase().slice(0, 3))}
                  className="mt-1 font-mono"
                  placeholder="AED"
                  maxLength={3}
                />
                <p className="text-xs text-muted-foreground mt-1">Three-letter ISO code.</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-4">
              <div className="flex items-center gap-2.5">
                <Coins className="h-5 w-5 text-primary" />
                <h2 className="font-display font-semibold">Reward amounts</h2>
              </div>
              <div>
                <FieldLabel required className="text-muted-foreground">
                  Referrer reward ({form.currency || "AED"})
                </FieldLabel>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.referrerRewardAmount}
                  onChange={(e) => set("referrerRewardAmount", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <FieldLabel required className="text-muted-foreground">
                  Referred reward ({form.currency || "AED"})
                </FieldLabel>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.referredRewardAmount}
                  onChange={(e) => set("referredRewardAmount", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <FieldLabel required className="text-muted-foreground">
                  Minimum qualifying order ({form.currency || "AED"})
                </FieldLabel>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.minimumOrderAmount}
                  onChange={(e) => set("minimumOrderAmount", e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Orders below this value do not qualify a referral.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-4">
              <div className="flex items-center gap-2.5">
                <Coins className="h-5 w-5 text-primary" />
                <h2 className="font-display font-semibold">Limits</h2>
              </div>
              <div>
                <FieldLabel className="text-muted-foreground">Max rewards per referrer</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  step="1"
                  value={form.maxRewardsPerReferrer}
                  onChange={(e) => set("maxRewardsPerReferrer", e.target.value)}
                  className="mt-1"
                  placeholder="Unlimited"
                />
                <p className="text-xs text-muted-foreground mt-1">Leave blank for unlimited.</p>
              </div>
              <div>
                <FieldLabel className="text-muted-foreground">Reward expiry (days)</FieldLabel>
                <Input
                  type="number"
                  min={1}
                  step="1"
                  value={form.rewardExpiryDays}
                  onChange={(e) => set("rewardExpiryDays", e.target.value)}
                  className="mt-1"
                  placeholder="Never expires"
                />
                <p className="text-xs text-muted-foreground mt-1">Leave blank so rewards never expire.</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-4">
              <div className="flex items-center gap-2.5">
                <Link2 className="h-5 w-5 text-primary" />
                <h2 className="font-display font-semibold">Share link</h2>
              </div>
              <div>
                <FieldLabel required className="text-muted-foreground">Share base URL</FieldLabel>
                <Input
                  value={form.shareBaseUrl}
                  onChange={(e) => set("shareBaseUrl", e.target.value)}
                  className="mt-1"
                  placeholder="https://scopsk.ae/ref"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Referral links are built as base URL + referral code.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">Example link</div>
                <div className="mt-0.5 font-mono text-xs break-all">
                  {`${String(form.shareBaseUrl || "").replace(/\/+$/, "")}/RSP-ABC234`}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              disabled={save.isPending}
              onClick={() => data && setForm(toForm(data))}
            >
              Reset
            </Button>
            <Button disabled={save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function ReferralSettingsPage() {
  return <ReferralSettingsPanel />;
}
