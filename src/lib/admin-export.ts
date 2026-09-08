import { num, str } from "@/lib/api/client";

/** Extract marketplace financials from a PO / invoice / order-like payload. */
export function extractFinanceBreakdown(detail: any) {
  const meta = (detail?.metadata || {}) as Record<string, unknown>;
  const commissions = (meta.commissions || {}) as Record<string, unknown>;
  const subtotal = num(detail?.subtotal ?? detail?.amount ?? detail?.gross);
  const tax = num(detail?.tax ?? detail?.vat);
  const shipping = num(detail?.shipping);
  const total = num(detail?.total, subtotal + tax + shipping);
  const commission =
    num(detail?.commissionAmount ?? detail?.commission)
    || num(commissions.totalAmount)
    || num(commissions.supplierAmount) + num(commissions.restaurantAmount);
  const vatRate =
    num(meta.vatRate)
    || num(detail?.vatRate)
    || (subtotal > 0 && tax > 0 ? Math.round((tax / subtotal) * 1000) / 10 : 0);
  const supplierCommission = num(commissions.supplierAmount);
  const restaurantCommission = num(commissions.restaurantAmount);
  const supplierRate = num(commissions.supplierRate ?? detail?.commissionRate);
  const restaurantRate = num(commissions.restaurantRate);

  return {
    subtotal,
    tax,
    shipping,
    total,
    commission,
    vatRate,
    supplierCommission,
    restaurantCommission,
    supplierRate,
    restaurantRate,
    currency: str(detail?.currency, "AED"),
  };
}

/** Deterministic AI score when API does not provide one (0–100). */
export function computeQuotationAiScore(r: any): number {
  const existing = Number(r?.aiScore ?? r?.metadata?.aiScore ?? r?.score);
  if (Number.isFinite(existing) && existing > 0) return Math.round(existing);

  let score = 72;
  const status = String(r?.status || "").toLowerCase();
  if (status === "accepted" || status === "approved") score += 12;
  else if (status === "submitted" || status === "pending_approval") score += 6;
  else if (status === "rejected") score -= 18;
  else if (status === "withdrawn" || status === "expired") score -= 10;

  if (r?.validUntil || r?.validityDate) score += 5;
  const fulfillment = String(r?.fulfillmentType || "").toLowerCase();
  if (fulfillment === "full" || fulfillment === "complete") score += 6;
  else if (fulfillment === "partial") score += 2;

  const total = Number(r?.total ?? r?.amount ?? r?.subtotal ?? 0);
  if (total > 0) score += Math.min(8, Math.floor(Math.log10(total + 1) * 2));

  const items = Array.isArray(r?.items) ? r.items.length : Number(r?.itemCount || 0);
  if (items > 0) score += Math.min(5, items);

  // Stable jitter from id so scores aren't identical across rows
  const id = String(r?.id || r?.number || "");
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i) * (i + 1)) % 7;
  score += hash;

  return Math.max(45, Math.min(98, Math.round(score)));
}

/** Build a CSV string from objects (detailed export). */
export function buildDetailedCsv(
  rows: Record<string, unknown>[],
  columns?: { key: string; label: string }[],
): string {
  if (!rows.length) return "";
  const cols =
    columns?.length
      ? columns
      : Object.keys(rows[0])
          .filter((k) => !["actions", "payload", "detail"].includes(k))
          .map((k) => ({ key: k, label: k }));

  const esc = (v: unknown) => {
    if (v == null) return "";
    let s: string;
    if (typeof v === "object") {
      try {
        s = JSON.stringify(v);
      } catch {
        s = String(v);
      }
    } else {
      s = String(v);
    }
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  return [
    cols.map((c) => esc(c.label)).join(","),
    ...rows.map((r) => cols.map((c) => esc(r[c.key])).join(",")),
  ].join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Flatten nested API objects into export-friendly primitives. */
export function flattenForExport(row: Record<string, unknown>, prefix = ""): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (k === "actions" || k === "payload") continue;
    const key = prefix ? `${prefix}.${k}` : k;
    if (v == null || typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      out[key] = v;
    } else if (Array.isArray(v)) {
      out[key] = v
        .map((item) => (typeof item === "object" && item ? JSON.stringify(item) : String(item)))
        .join(" | ");
    } else if (typeof v === "object") {
      Object.assign(out, flattenForExport(v as Record<string, unknown>, key));
    } else {
      out[key] = String(v);
    }
  }
  return out;
}
