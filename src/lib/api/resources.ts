import { api, asArray, num, str } from "@/lib/api/client";

/** Stable empty list for useQuery defaults (avoids re-render loops). */
export const EMPTY_LIST: any[] = [];

function relativeTime(iso: unknown): string {
  if (!iso) return "—";
  const t = new Date(String(iso)).getTime();
  if (!Number.isFinite(t)) return str(iso);
  const diff = Date.now() - t;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return String(iso).replace("T", " ").slice(0, 16);
}

/** Try GET /organizations?type=…; fall back to /admin/users. */
export async function fetchOrganizationsByType(type: "restaurant" | "supplier") {
  try {
    const data = await api.get("/organizations", { query: { type } });
    const rows = asArray(data);
    if (rows.length || Array.isArray(data)) {
      return rows
        .filter((r: any) => !r.type || r.type === type)
        .map((r: any) => mapOrgRow(r, type));
    }
  } catch {
    // no list endpoint — fall through
  }

  try {
    const users = asArray(await api.get("/admin/users"));
    return users.map((u: any) => ({
      id: str(u.id),
      name: [u.firstName, u.lastName].filter(Boolean).join(" ") || str(u.email, "User"),
      industry: "—",
      cuisines: "—",
      cuisineIds: [] as string[],
      region: "—",
      branches: 0,
      orders: 0,
      spend: 0,
      rfqs: 0,
      status: str(u.status, "active"),
      verificationStatus: "—",
      categories: [] as string[],
      revenue: 0,
      winRate: 0,
      rating: 0,
      email: str(u.email),
      phone: "",
      legalName: "",
      type,
      poApprovalLevels: 0,
      minRfqValueAed: 0,
      ownerName: "",
      tradeLicenseNumber: "",
      vatRegistrationNumber: "",
      foodLicenseNumber: "",
      documents: [] as { id?: string; type: string; url?: string; fileName?: string }[],
      documentCount: 0,
      kycApplication: null,
    }));
  } catch {
    return [];
  }
}

/** Paginated org list (admin). */
export async function fetchOrganizations(query?: {
  type?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  try {
    return asArray(await api.get("/organizations", { query }));
  } catch {
    return [];
  }
}

function mapOrgCuisines(r: any) {
  type CuisineRow = { id: string; name: string };
  const cuisineRows: CuisineRow[] = Array.isArray(r.cuisines)
    ? r.cuisines.map((c: any): CuisineRow => {
        if (typeof c === "string") return { id: "", name: c };
        const nested = c?.cuisineType;
        if (nested) {
          return { id: str(nested.id, ""), name: str(nested.name, "") };
        }
        // Join row uses cuisineTypeId; CuisineType row uses id + name
        if (c?.cuisineTypeId) {
          return { id: str(c.cuisineTypeId, ""), name: str(c.name, "") };
        }
        return { id: str(c?.id, ""), name: str(c?.name, "") };
      })
    : [];
  const fromRows = cuisineRows.map((c) => c.id).filter((id) => id && id !== "—");
  const fromField = Array.isArray(r.cuisineIds)
    ? r.cuisineIds.map((id: any) => String(id || "").trim()).filter(Boolean)
    : [];
  const cuisineIds = fromRows.length ? fromRows : fromField;
  const cuisineNames = [
    ...cuisineRows.map((c) => c.name).filter((n) => n && n !== "—"),
    ...(Array.isArray(r.cuisineNames) ? r.cuisineNames.map((n: any) => String(n)).filter(Boolean) : []),
    ...(Array.isArray(r.metadata?.cuisineNames)
      ? r.metadata.cuisineNames.map((n: any) => String(n)).filter(Boolean)
      : []),
  ];
  const uniqueNames = [...new Set(cuisineNames)];
  return {
    cuisineIds,
    cuisineLabel: uniqueNames.length ? uniqueNames.join(", ") : "—",
  };
}

function mapOrgRow(r: any, type: "restaurant" | "supplier") {
  const { cuisineIds, cuisineLabel } = mapOrgCuisines(r);
  return {
    id: str(r.id),
    name: str(r.name, "Untitled"),
    industry: cuisineLabel !== "—" ? cuisineLabel : str(r.metadata?.industry, "—"),
    cuisines: cuisineLabel,
    cuisineIds,
    region: str(r.city || r.country, "—"),
    branches: num(r.metadata?.branches),
    orders: num(r.metadata?.orders ?? r.orderCount),
    spend: num(r.metadata?.spend ?? r.spend),
    rfqs: num(r.metadata?.rfqs),
    status: str(r.status || r.verificationStatus, "pending"),
    verificationStatus: str(r.verificationStatus, "—"),
    categories: Array.isArray(r.metadata?.categories) ? r.metadata.categories : [],
    revenue: num(r.metadata?.revenue ?? r.revenue),
    winRate: num(r.metadata?.winRate),
    rating: num(r.metadata?.rating),
    email: str(r.email),
    phone: str(r.phone, ""),
    legalName: str(r.legalName, ""),
    type,
    poApprovalLevels: num(r.poApprovalLevels ?? r.settings?.poApprovalLevels),
    minRfqValueAed: num(r.minRfqValueAed ?? r.settings?.minRfqValueAed),
    ownerName: str(r.ownerName ?? r.profile?.ownerName, ""),
    tradeLicenseNumber: str(r.tradeLicenseNumber ?? r.profile?.tradeLicenseNumber, ""),
    vatRegistrationNumber: str(r.vatRegistrationNumber ?? r.profile?.vatRegistrationNumber, ""),
    foodLicenseNumber: str(r.foodLicenseNumber ?? r.profile?.foodLicenseNumber, ""),
    documents: Array.isArray(r.documents)
      ? r.documents.map((d: any) => ({
          id: str(d.id),
          type: str(d.documentType ?? d.type, "document"),
          url: str(d.url, ""),
          fileName: str(d.fileName, ""),
          status: str(d.status, ""),
        }))
      : [],
    documentCount: num(r.documentCount, Array.isArray(r.documents) ? r.documents.length : 0),
    kycApplication: r.kycApplication ?? null,
  };
}

/** Enrich org row with /organizations/:id/settings + /profile (best-effort). */
export async function enrichOrganizationRow<T extends { id: string }>(
  row: T,
  type: "restaurant" | "supplier" = "restaurant",
): Promise<
  T & {
    type: "restaurant" | "supplier";
    poApprovalLevels: number;
    minRfqValueAed: number;
    ownerName: string;
    tradeLicenseNumber: string;
    vatRegistrationNumber: string;
    foodLicenseNumber: string;
  }
> {
  const [settings, profile] = await Promise.all([
    api.get<any>(`/organizations/${row.id}/settings`).catch(() => null),
    api.get<any>(`/organizations/${row.id}/profile`).catch(() => null),
  ]);
  return {
    ...row,
    type,
    poApprovalLevels: num(settings?.poApprovalLevels, num((row as any).poApprovalLevels)),
    minRfqValueAed: num(settings?.minRfqValueAed, num((row as any).minRfqValueAed)),
    ownerName: str(profile?.ownerName, str((row as any).ownerName, "")),
    tradeLicenseNumber: str(profile?.tradeLicenseNumber, str((row as any).tradeLicenseNumber, "")),
    vatRegistrationNumber: str(profile?.vatRegistrationNumber, str((row as any).vatRegistrationNumber, "")),
    foodLicenseNumber: str(profile?.foodLicenseNumber, str((row as any).foodLicenseNumber, "")),
  };
}

export async function updateOrgSettings(
  organizationId: string,
  data: { poApprovalLevels?: number | string; minRfqValueAed?: number | string },
) {
  const payload: Record<string, number> = {};
  if (data.poApprovalLevels != null && String(data.poApprovalLevels).trim() !== "") {
    payload.poApprovalLevels = Number(data.poApprovalLevels);
  }
  if (data.minRfqValueAed != null && String(data.minRfqValueAed).trim() !== "") {
    payload.minRfqValueAed = Number(data.minRfqValueAed);
  }
  if (!Object.keys(payload).length) return null;
  return api.patch(`/organizations/${organizationId}/settings`, payload);
}

export async function updateOrgProfile(
  organizationId: string,
  data: Record<string, any>,
) {
  const keys = [
    "ownerName",
    "tradeLicenseNumber",
    "vatRegistrationNumber",
    "foodLicenseNumber",
  ] as const;
  const payload: Record<string, string> = {};
  for (const key of keys) {
    if (data[key] != null && String(data[key]).trim() !== "") {
      payload[key] = String(data[key]).trim();
    }
  }
  if (!Object.keys(payload).length) return null;
  return api.patch(`/organizations/${organizationId}/profile`, payload);
}

export { mapOrgRow };

/** PATCH supplier — prefers /suppliers/:id (admin), falls back to /organizations/:id. */
export async function updateOrganization(
  id: string,
  data: Record<string, any>,
  type: "restaurant" | "supplier" = "restaurant",
) {
  const payload: Record<string, unknown> = {};
  if (data.name != null && String(data.name).trim()) payload.name = String(data.name).trim();
  if (data.email != null && String(data.email).trim()) payload.email = String(data.email).trim();
  if (data.phone != null && String(data.phone).trim()) payload.phone = String(data.phone).trim();
  if (data.legalName != null && String(data.legalName).trim()) {
    payload.legalName = String(data.legalName).trim();
  }

  let currentMeta: Record<string, unknown> = {};
  try {
    const current = (await api.get<any>(`/organizations/${id}`)) as any;
    if (current?.metadata && typeof current.metadata === "object") {
      currentMeta = current.metadata as Record<string, unknown>;
    }
  } catch {
    // best-effort merge
  }

  if (type === "restaurant") {
    if (Array.isArray(data.cuisineIds)) {
      payload.cuisineIds = data.cuisineIds.map((id: unknown) => String(id).trim()).filter(Boolean);
    }
    if (data.industry != null) {
      payload.metadata = { ...currentMeta, industry: String(data.industry) };
    }
    if (data.region != null && String(data.region).trim()) {
      payload.city = String(data.region).trim();
    }
  }

  if (type === "supplier" && data.categories != null) {
    const cats = Array.isArray(data.categories)
      ? data.categories.map((s) => String(s).trim()).filter(Boolean)
      : String(data.categories)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
    payload.metadata = {
      ...(payload.metadata as Record<string, unknown> | undefined ?? currentMeta),
      categories: cats,
    };
  }

  if (data.status != null && String(data.status).trim()) {
    const status = String(data.status).trim().toLowerCase();
    if (status === "verified") {
      payload.status = "active";
      payload.verificationStatus = "verified";
    } else if (["pending", "active", "suspended", "rejected"].includes(status)) {
      payload.status = status;
      if (status === "active") payload.verificationStatus = "verified";
      if (status === "pending") payload.verificationStatus = "pending";
    }
  }

  if (Object.keys(payload).length === 0) {
    throw new Error("No changes to save");
  }

  let updated: any;
  if (type === "supplier") {
    try {
      updated = await api.patch(`/suppliers/${id}`, payload);
    } catch {
      updated = await api.patch(`/organizations/${id}`, payload);
    }
  } else {
    updated = await api.patch(`/organizations/${id}`, payload);
  }
  return mapOrgRow(updated, type);
}

export async function fetchList(path: string, query?: Record<string, string | number | boolean | undefined | null>) {
  return asArray(await api.get(path, { query: { limit: 100, ...query } }));
}

/** Admin-only secure decoder for enterprise tracking codes. */
export async function fetchLookup(q: string) {
  return api.get("/admin/lookup", { query: { q } });
}

/** Activity feed: GET /admin/activity → fallback GET /admin/audit-logs. */
export async function fetchActivityFeed() {
  try {
    const list = asArray(await api.get("/admin/activity"));
    if (list.length) {
      return list.map((r: any) => ({
        id: str(r.id),
        type: str(r.action ?? r.type, "event"),
        actor: str(
          r.user?.email
            ?? r.actor?.email
            ?? [r.user?.firstName, r.user?.lastName].filter(Boolean).join(" ")
            ?? r.meta?.actor
            ?? r.userId
            ?? "system",
          "system",
        ),
        text: str(
          r.meta?.message
            ?? r.meta?.detail
            ?? (r.entityType ? `${r.entityType}${r.entityId ? ` ${r.entityId}` : ""}` : r.action),
          str(r.action, "—"),
        ),
        time: relativeTime(r.createdAt),
      }));
    }
  } catch {
    // fall through
  }

  const audit = await fetchList("/admin/audit-logs");
  return audit.map((r: any) => ({
    id: str(r.id),
    type: str(r.action, "audit"),
    actor: str(r.actor?.email ?? r.actorId, "system"),
    text: str(
      r.entityType
        ? `${r.action} on ${r.entityType}${r.entityId ? `:${r.entityId}` : ""}`
        : r.action,
      "—",
    ),
    time: relativeTime(r.createdAt),
  }));
}

export type CommissionRow = {
  id: string;
  po: string;
  order: string;
  party: string;
  organization: string;
  gross: number;
  rate: string;
  commission: number;
  status: string;
  currency: string;
};

/** GET /admin/commissions — returns rows + optional aggregates from envelope. */
export async function fetchCommissions(query?: { status?: string }) {
  let aggregates: { pendingTotal?: number; settledTotal?: number; accruedTotal?: number } | null = null;
  let list: any[] = [];

  try {
    const raw = await api.get<any>("/admin/commissions", { query });
    list = asArray(raw);
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const obj = raw as Record<string, unknown>;
      if (obj.aggregates && typeof obj.aggregates === "object") {
        const agg = obj.aggregates as Record<string, unknown>;
        aggregates = {
          pendingTotal: num(agg.pendingTotal),
          settledTotal: num(agg.settledTotal),
          accruedTotal: num(agg.accruedTotal ?? agg.total),
        };
      } else if (obj.pendingTotal != null || obj.settledTotal != null) {
        aggregates = {
          pendingTotal: num(obj.pendingTotal),
          settledTotal: num(obj.settledTotal),
          accruedTotal: num(obj.accruedTotal ?? obj.total),
        };
      }
    }
  } catch {
    list = [];
  }

  const rows: CommissionRow[] = list.map((r: any) => {
    const rateNum = num(r.rate);
    const amount = num(r.amount ?? r.commission);
    const gross = num(
      r.orderSubtotal ??
        r.orderTotal ??
        r.gross ??
        r.purchaseOrder?.executionOrder?.subtotal ??
        r.purchaseOrder?.subtotal ??
        r.purchaseOrder?.executionOrder?.total ??
        r.purchaseOrder?.total ??
        (rateNum > 0 ? amount / (rateNum / 100) : 0),
    );
    const party = str(r.partyLabel ?? r.party, "—");
    return {
      id: str(r.id),
      po: str(r.poNumber ?? r.purchaseOrder?.number ?? r.purchaseOrderId, "—"),
      order: str(r.orderNumber ?? r.purchaseOrder?.executionOrder?.number, "—"),
      party,
      organization: str(
        r.organizationName ?? r.supplierOrg?.name ?? r.supplier?.name ?? r.supplierOrgId,
        "—",
      ),
      gross,
      rate: `${rateNum}%`,
      commission: amount,
      status: str(r.status, "pending"),
      currency: str(r.currency ?? r.purchaseOrder?.currency, "AED"),
    };
  });

  return { rows, aggregates };
}

export async function settleCommission(id: string, status: "settled" | "cancelled" | "pending" = "settled") {
  return api.patch(`/admin/commissions/${id}`, { status });
}

export type ApiKeyRow = {
  id: string;
  label: string;
  scope: string;
  calls24h: number;
  lastUsed: string;
  status: string;
  keyPrefix?: string;
};

/** GET /admin/api-keys — never includes full secret. */
export async function fetchApiKeys() {
  const list = await fetchList("/admin/api-keys");
  return list.map((r: any): ApiKeyRow => ({
    id: str(r.id),
    label: str(r.name ?? r.label, "Key"),
    scope: formatScopes(r.scopes),
    calls24h: num(r.calls24h ?? r.meta?.calls24h),
    lastUsed: relativeTime(r.lastUsedAt ?? r.lastUsed),
    status: r.revokedAt ? "suspended" : str(r.status, "active"),
    keyPrefix: str(r.keyPrefix, ""),
  }));
}

function formatScopes(scopes: unknown): string {
  if (scopes == null) return "—";
  if (typeof scopes === "string") return scopes;
  if (Array.isArray(scopes)) return scopes.join(" ");
  if (typeof scopes === "object") {
    return Object.entries(scopes as Record<string, unknown>)
      .map(([k, v]) => (v === true || v === "write" || v === "read" ? `${typeof v === "string" ? v : "read"}:${k}` : k))
      .join(" ") || "—";
  }
  return String(scopes);
}

/** POST /admin/api-keys — returns plaintext `key` once. */
export async function createApiKey(input: { name: string; scopes?: string | Record<string, unknown>; organizationId?: string }) {
  const scopes =
    typeof input.scopes === "string"
      ? Object.fromEntries(
          input.scopes
            .split(/[\s,]+/)
            .filter(Boolean)
            .map((s) => [s, true]),
        )
      : input.scopes;
  return api.post<{
    id?: string;
    key?: string;
    name?: string;
    keyPrefix?: string;
    scopes?: unknown;
    createdAt?: string;
  }>("/admin/api-keys", {
    name: input.name,
    scopes,
    organizationId: input.organizationId,
  });
}

/** DELETE /admin/api-keys/:id — revoke. */
export async function revokeApiKey(id: string) {
  return api.delete(`/admin/api-keys/${id}`);
}

/**
 * Communications: prefer chat conversations, then support tickets, then notifications.
 */
export async function fetchCommunications() {
  try {
    const list = asArray(await api.get("/chat/conversations"));
    if (list.length) {
      return {
        source: "chat" as const,
        rows: list.map((r: any) => {
          const participants = asArray(r.participants);
          const names = participants
            .map((p: any) => {
              const u = p.user ?? p;
              return [u.firstName, u.lastName].filter(Boolean).join(" ") || str(u.email, "");
            })
            .filter(Boolean);
          return {
            id: str(r.id),
            channel: "In-app",
            subject: str(r.subject ?? r.type, "Conversation"),
            from: names[0] || "—",
            to: names.slice(1).join(", ") || "—",
            time: relativeTime(r.updatedAt ?? r.createdAt),
            status: str(r.status, "active"),
          };
        }),
      };
    }
  } catch {
    // fall through
  }

  try {
    const list = asArray(await api.get("/support"));
    if (list.length) {
      return {
        source: "support" as const,
        rows: list.map((r: any) => ({
          id: str(r.number ?? r.id),
          channel: "Support",
          subject: str(r.subject ?? r.title, "—"),
          from: str(r.requester?.email ?? r.user?.email ?? r.createdBy, "—"),
          to: str(r.assignee?.email ?? r.assignedTo, "Support"),
          time: relativeTime(r.updatedAt ?? r.createdAt),
          status: str(r.status, "open"),
        })),
      };
    }
  } catch {
    // fall through
  }

  try {
    const list = asArray(await api.get("/notifications"));
    return {
      source: "notifications" as const,
      rows: list.map((r: any) => ({
        id: str(r.id),
        channel: str(r.channel ?? r.category ?? "Push", "Push"),
        subject: str(r.title ?? r.subject, "—"),
        from: "System",
        to: str(r.user?.email ?? r.userId, "Me"),
        time: relativeTime(r.createdAt),
        status: r.readAt || r.read ? "delivered" : "sent",
      })),
    };
  } catch {
    return { source: "none" as const, rows: [] };
  }
}

export async function fetchAdminDashboard() {
  return api.get<Record<string, unknown>>("/admin/dashboard");
}

/** Helpers for Wave 1 admin mutations — pass party org via X-Organization-Id. */
function orgHeaders(organizationId?: string | null) {
  return organizationId ? { "X-Organization-Id": organizationId } : undefined;
}

export async function approveKyc(id: string, notes?: string) {
  return api.post(`/kyc/applications/${id}/approve`, { notes: notes || undefined });
}

export async function rejectKyc(id: string, notes: string) {
  return api.post(`/kyc/applications/${id}/reject`, { notes });
}

export async function approveQuotation(id: string, buyerOrgId: string) {
  return api.post(`/quotations/${id}/approve`, {}, { headers: orgHeaders(buyerOrgId) });
}

export async function rejectQuotation(id: string, buyerOrgId: string, reason?: string) {
  return api.post(`/quotations/${id}/reject`, { reason }, { headers: orgHeaders(buyerOrgId) });
}

export async function updatePurchaseOrderStatus(id: string, status: string, organizationId: string) {
  return api.patch(`/purchase-orders/${id}/status`, { status }, { headers: orgHeaders(organizationId) });
}

export async function updateDeliveryStatus(id: string, status: string, organizationId?: string) {
  return api.patch(`/deliveries/${id}/status`, { status }, { headers: orgHeaders(organizationId) });
}

export async function markInvoicePaid(id: string, organizationId: string) {
  return api.post(`/invoices/${id}/mark-paid`, { method: "admin" }, { headers: orgHeaders(organizationId) });
}

export async function approveApprovalRequest(id: string, notes?: string) {
  return api.post(`/approvals/${id}/approve`, { notes: notes || undefined });
}

export async function rejectApprovalRequest(id: string, reason?: string) {
  return api.post(`/approvals/${id}/reject`, { reason: reason || undefined, notes: reason || undefined });
}

export async function markNotificationRead(id: string) {
  return api.post(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead() {
  return api.post(`/notifications/read-all`);
}

/** Restaurant inventory for a specific org (admin passes X-Organization-Id). */
export async function fetchRestaurantInventory(organizationId: string) {
  return asArray(
    await api.get("/restaurant-inventory", {
      headers: orgHeaders(organizationId),
      query: { limit: 200 },
    }),
  );
}

// ─── Detail (GET by id) helpers for admin View dialogs ───────────────────────

export async function fetchOrganizationDetail(id: string) {
  return api.get<any>(`/organizations/${id}`);
}

export async function fetchRfqDetail(id: string) {
  return api.get<any>(`/rfqs/${id}`);
}

export async function fetchQuotationDetail(id: string) {
  return api.get<any>(`/quotations/${id}`);
}

export async function fetchPurchaseOrderDetail(id: string) {
  return api.get<any>(`/purchase-orders/${id}`);
}

export async function fetchDeliveryDetail(id: string) {
  return api.get<any>(`/deliveries/${id}`);
}

export async function fetchInvoiceDetail(id: string) {
  return api.get<any>(`/invoices/${id}`);
}

export async function fetchApprovalDetail(id: string) {
  return api.get<any>(`/approvals/${id}`);
}

export async function fetchKycDetail(id: string) {
  return api.get<any>(`/kyc/applications/${id}`);
}

export async function fetchProductDetail(id: string) {
  return api.get<any>(`/catalog/products/${id}`);
}

export async function fetchCategoryDetail(id: string) {
  return api.get<any>(`/catalog/categories/${id}`);
}

export async function fetchSupportTicketDetail(id: string) {
  return api.get<any>(`/support/${id}`);
}

export async function fetchNotificationDetail(id: string) {
  return api.get<any>(`/notifications/${id}`);
}

export async function fetchFileDetail(id: string) {
  return api.get<any>(`/files/${id}`);
}

export async function fetchCommissionDetail(id: string) {
  return api.get<any>(`/admin/commissions/${id}`);
}

export async function fetchAuditLogDetail(id: string) {
  return api.get<any>(`/admin/audit-logs/${id}`);
}

export async function fetchSubscriptionDetail(id: string) {
  return api.get<any>(`/subscriptions/${id}`);
}

export async function fetchRoleDetail(id: string) {
  return api.get<any>(`/admin/roles/${id}`);
}

