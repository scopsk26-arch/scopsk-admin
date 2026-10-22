import { api, asArray, num, str } from "@/lib/api/client";

/** Stable empty list for useQuery defaults (avoids re-render loops). */
export const EMPTY_LIST: any[] = [];

/**
 * Fetch every page from a paginated admin list endpoint (API default limit is 20).
 * Stops when a short page arrives or meta.totalPages is exhausted.
 */
export async function fetchAllPages(
  path: string,
  query?: Record<string, string | number | boolean | undefined | null>,
  pageLimit = 100,
): Promise<any[]> {
  const limit = Math.min(100, Math.max(1, pageLimit));
  const out: any[] = [];
  let page = 1;
  let totalPages = 1;

  for (;;) {
    const { data, meta } = await api.getEnvelope(path, {
      query: { ...query, page, limit },
    });
    const chunk = asArray(data);
    out.push(...chunk);

    const metaTotalPages = Number(meta?.totalPages);
    const metaTotal = Number(meta?.total);
    if (Number.isFinite(metaTotalPages) && metaTotalPages > 0) {
      totalPages = metaTotalPages;
    } else if (Number.isFinite(metaTotal) && metaTotal >= 0) {
      totalPages = Math.max(1, Math.ceil(metaTotal / limit));
    } else if (chunk.length < limit) {
      totalPages = page;
    } else {
      totalPages = page + 1;
    }

    if (!chunk.length || page >= totalPages || chunk.length < limit) break;
    page += 1;
    if (page > 50) break;
  }

  return out;
}

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
    const rows = await fetchAllPages("/organizations", { type });
    return rows
      .filter((r: any) => !r.type || r.type === type)
      .map((r: any) => mapOrgRow(r, type));
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
      deliveryFeeMode: "none",
      deliveryFeeValue: 0,
      creditLimit: 0,
      paymentTermsDays: 0,
      discountMode: "none",
      discountValue: 0,
      rfqIntakeMode: "manual",
      ownerName: "",
      tradeLicenseNumber: "",
      vatRegistrationNumber: "",
      foodLicenseNumber: "",
      documents: [] as { id?: string; type: string; url?: string; fileName?: string }[],
      documentCount: 0,
      kycApplication: null,
      rejectReason: "",
      submitted: "—",
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
  pendingApproval?: boolean | string;
  page?: number;
  limit?: number;
}) {
  try {
    if (query?.page != null) {
      return asArray(await api.get("/organizations", { query }));
    }
    return await fetchAllPages("/organizations", query as Record<string, string | number | boolean | undefined | null>);
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

function mapOrgCommercial(r: any) {
  const s = r.settings ?? r.orgSettings ?? {};
  return {
    deliveryFeeMode: str(s.deliveryFeeMode ?? r.deliveryFeeMode, "none"),
    deliveryFeeValue: num(s.deliveryFeeValue ?? r.deliveryFeeValue),
    creditLimit: num(s.creditLimit ?? r.creditLimit),
    creditPeriod:
      s.metadata?.creditPeriod === "week" || s.creditPeriod === "week" || r.creditPeriod === "week"
        ? "week"
        : "month",
    paymentTermsDays: num(s.paymentTermsDays ?? r.paymentTermsDays),
    discountMode: str(s.discountMode ?? r.discountMode, "none"),
    discountValue: num(s.discountValue ?? r.discountValue),
    rfqIntakeMode: str(s.rfqIntakeMode ?? r.rfqIntakeMode, "manual"),
  };
}

export function mapOrgRow(r: any, type: "restaurant" | "supplier") {
  const { cuisineIds, cuisineLabel } = mapOrgCuisines(r);
  const commercial = mapOrgCommercial(r);
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
    rating: num(r.rating ?? r.metadata?.rating),
    email: str(r.email),
    phone: str(r.phone, ""),
    legalName: str(r.legalName, ""),
    type,
    poApprovalLevels: num(r.poApprovalLevels ?? r.settings?.poApprovalLevels),
    minRfqValueAed: num(r.minRfqValueAed ?? r.settings?.minRfqValueAed),
    ...commercial,
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
    rejectReason: str(r.metadata?.rejectReason ?? r.rejectReason, ""),
    submitted: r.createdAt
      ? String(r.createdAt).slice(0, 10)
      : r.submittedAt
        ? String(r.submittedAt).slice(0, 10)
        : "—",
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

export type OrgSettingsPatch = {
  poApprovalLevels?: number | string;
  minRfqValueAed?: number | string;
  deliveryFeeMode?: string;
  deliveryFeeValue?: number | string;
  creditLimit?: number | string;
  creditPeriod?: string;
  paymentTermsDays?: number | string;
  discountMode?: string;
  discountValue?: number | string;
  rfqIntakeMode?: string;
};

export async function updateOrgSettings(organizationId: string, data: OrgSettingsPatch) {
  const payload: Record<string, string | number> = {};
  const numKeys = [
    "poApprovalLevels",
    "minRfqValueAed",
    "deliveryFeeValue",
    "creditLimit",
    "paymentTermsDays",
    "discountValue",
  ] as const;
  for (const key of numKeys) {
    if (data[key] != null && String(data[key]).trim() !== "") {
      payload[key] = Number(data[key]);
    }
  }
  if (data.deliveryFeeMode != null && String(data.deliveryFeeMode).trim() !== "") {
    payload.deliveryFeeMode = String(data.deliveryFeeMode).trim();
  }
  if (data.discountMode != null && String(data.discountMode).trim() !== "") {
    payload.discountMode = String(data.discountMode).trim();
  }
  if (data.creditPeriod === "week" || data.creditPeriod === "month") {
    payload.creditPeriod = data.creditPeriod;
  }
  if (data.rfqIntakeMode != null && String(data.rfqIntakeMode).trim() !== "") {
    payload.rfqIntakeMode = String(data.rfqIntakeMode).trim();
  }
  if (payload.deliveryFeeMode === "none") payload.deliveryFeeValue = 0;
  if (payload.discountMode === "none") payload.discountValue = 0;
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

  if (Array.isArray(data.cuisineIds)) {
    payload.cuisineIds = data.cuisineIds.map((id: unknown) => String(id).trim()).filter(Boolean);
  }

  if (type === "restaurant") {
    const nextMeta: Record<string, unknown> = { ...currentMeta };
    let metaChanged = false;
    if (data.industry != null) {
      nextMeta.industry = String(data.industry);
      metaChanged = true;
    }
    if (data.rating != null && String(data.rating).trim() !== "") {
      const n = Number(data.rating);
      if (Number.isFinite(n)) {
        nextMeta.rating = Math.min(5, Math.max(0, n));
        metaChanged = true;
      }
    }
    if (metaChanged) payload.metadata = nextMeta;
    if (data.region != null && String(data.region).trim()) {
      payload.city = String(data.region).trim();
    }
  }

  if (type === "supplier") {
    const nextMeta: Record<string, unknown> = {
      ...((payload.metadata as Record<string, unknown> | undefined) ?? currentMeta),
    };
    let metaChanged = false;
    if (data.industry != null) {
      nextMeta.industry = String(data.industry);
      metaChanged = true;
    }
    if (data.categories != null) {
      const cats = Array.isArray(data.categories)
        ? data.categories.map((s) => String(s).trim()).filter(Boolean)
        : String(data.categories)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
      nextMeta.categories = cats;
      metaChanged = true;
    }
    if (metaChanged) payload.metadata = nextMeta;
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

export type PagedRows = {
  rows: any[];
  total: number;
  page: number;
  pageSize: number;
};

/** One page from a list endpoint. Sends page, limit, and search. */
export async function fetchPage(
  path: string,
  query?: Record<string, string | number | boolean | undefined | null>,
  headers?: Record<string, string>,
): Promise<PagedRows> {
  const pageSize = Math.min(100, Math.max(1, Number(query?.limit) || 20));
  const page = Math.max(1, Number(query?.page) || 1);
  const { data, meta } = await api.getEnvelope(path, {
    query: { ...query, page, limit: pageSize },
    headers,
  });
  const rows = asArray(data);
  const metaTotal = Number(meta?.total);
  const metaPages = Number(meta?.totalPages);
  let total: number;
  if (Number.isFinite(metaTotal) && metaTotal >= 0) {
    total = metaTotal;
  } else if (Number.isFinite(metaPages) && metaPages > 0) {
    total = metaPages * pageSize;
  } else if (rows.length < pageSize) {
    total = (page - 1) * pageSize + rows.length;
  } else {
    total = page * pageSize + 1;
  }
  return { rows, total, page, pageSize };
}

export async function fetchList(path: string, query?: Record<string, string | number | boolean | undefined | null>) {
  try {
    return await fetchAllPages(path, query);
  } catch {
    return asArray(await api.get(path, { query: { limit: 100, ...query } }));
  }
}

export async function fetchAdminOutstanding(query?: Record<string, string | number | boolean | undefined | null>) {
  return fetchAllPages("/admin/outstanding", query);
}

export async function updateRating(id: string, body: { status?: string; score?: number; comment?: string | null }) {
  return api.patch(`/ratings/${id}`, body);
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
export async function fetchCommissions(query?: {
  status?: string;
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}) {
  let aggregates: { pendingTotal?: number; settledTotal?: number; accruedTotal?: number } | null = null;
  let list: any[] = [];
  let total = 0;

  try {
    const { data, meta } = await api.getEnvelope<any>("/admin/commissions", { query });
    const raw = data;
    list = asArray(raw);
    const metaTotal = Number(meta?.total);
    total = Number.isFinite(metaTotal) && metaTotal >= 0 ? metaTotal : list.length;
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

  return { rows, aggregates, total };
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
  return api.post(`/kyc/applications/${id}/approve`, { notes: notes || undefined }, { toastOnSuccess: true });
}

export async function rejectKyc(id: string, notes: string) {
  return api.post(`/kyc/applications/${id}/reject`, { notes }, { toastOnSuccess: true });
}

export async function reviewKycDocument(
  id: string,
  status: "approved" | "rejected",
  notes?: string,
) {
  return api.post(`/kyc/documents/${id}/review`, { status, notes: notes || undefined }, { toastOnSuccess: true });
}

export async function approveQuotation(id: string, buyerOrgId: string) {
  return api.post(`/quotations/${id}/approve`, {}, { headers: orgHeaders(buyerOrgId), toastOnSuccess: true });
}

export async function rejectQuotation(id: string, buyerOrgId: string, reason?: string) {
  return api.post(`/quotations/${id}/reject`, { reason }, { headers: orgHeaders(buyerOrgId), toastOnSuccess: true });
}

export async function updatePurchaseOrderStatus(id: string, status: string, organizationId: string) {
  return api.patch(`/purchase-orders/${id}/status`, { status }, { headers: orgHeaders(organizationId) });
}

export async function updateDeliveryStatus(id: string, status: string, organizationId?: string) {
  return api.patch(`/deliveries/${id}/status`, { status }, { headers: orgHeaders(organizationId) });
}

export async function markInvoicePaid(id: string, organizationId: string) {
  return api.post(`/invoices/${id}/mark-paid`, { method: "admin" }, { headers: orgHeaders(organizationId), toastOnSuccess: true });
}

export async function approveApprovalRequest(id: string, notes?: string) {
  return api.post(`/approvals/${id}/approve`, { notes: notes || undefined }, { toastOnSuccess: true });
}

export async function rejectApprovalRequest(id: string, reason?: string) {
  return api.post(`/approvals/${id}/reject`, { reason: reason || undefined, notes: reason || undefined }, { toastOnSuccess: true });
}

export async function markNotificationRead(id: string) {
  return api.post(`/notifications/${id}/read`, undefined, { toastOnSuccess: true });
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

/** Pending org approval queue: GET /organizations?type=&pendingApproval=true */
export async function fetchPendingOrganizations(type: "restaurant" | "supplier") {
  const list = await fetchOrganizations({ type, pendingApproval: true });
  return list
    .filter((r: any) => !r.type || r.type === type)
    .map((r: any) => mapOrgRow(r, type));
}

export async function approveOrganization(id: string, reason?: string) {
  return api.post(`/organizations/${id}/approve`, { reason: reason || undefined }, { toastOnSuccess: true });
}

export async function rejectOrganization(id: string, reason: string) {
  return api.post(`/organizations/${id}/reject`, { reason }, { toastOnSuccess: true });
}

export async function activateOrganization(id: string, reason?: string) {
  return api.post(`/organizations/${id}/activate`, { reason: reason || undefined }, { toastOnSuccess: true });
}

export async function deactivateOrganization(id: string, reason?: string) {
  return api.post(`/organizations/${id}/deactivate`, { reason: reason || undefined }, { toastOnSuccess: true });
}

export async function deleteOrganization(id: string) {
  return api.delete(`/organizations/${id}`);
}

export type CategoryCommissionRow = {
  id: string;
  categoryId: string;
  category: string;
  restaurantRate: number;
  supplierRate: number;
};

export async function fetchCategoryCommissions(query?: {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}) {
  const page = await fetchPage("/admin/category-commissions", query);
  return {
    total: page.total,
    rows: page.rows.map((r: any): CategoryCommissionRow => ({
      id: str(r.categoryId ?? r.id),
      categoryId: str(r.categoryId ?? r.category?.id),
      category: str(r.category?.name ?? r.categoryName, "—"),
      restaurantRate: num(r.restaurantRate),
      supplierRate: num(r.supplierRate),
    })),
  };
}

export async function upsertCategoryCommission(data: {
  categoryId: string;
  restaurantRate: number;
  supplierRate: number;
}) {
  return api.put("/admin/category-commissions", {
    categoryId: data.categoryId,
    restaurantRate: Number(data.restaurantRate),
    supplierRate: Number(data.supplierRate),
  });
}

export async function deleteCategoryCommission(categoryId: string) {
  return api.delete(`/admin/category-commissions/${categoryId}`);
}

export async function fetchOrgWallet(orgId: string) {
  return api.get<any>(`/admin/wallets/${orgId}`);
}

export type AdminWalletRow = {
  id: string;
  organizationId: string;
  organization: string;
  orgType: string;
  orgStatus: string;
  publicCode: string;
  referralCode: string;
  availableBalance: number;
  heldBalance: number;
  pendingBalance: number;
  currency: string;
  status: string;
  updated: string;
};

/** GET /admin/wallets — API filters to restaurants unless type is given, so default to all. */
export async function fetchAdminWallets(query?: {
  type?: string;
  status?: string;
  walletStatus?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const page = await fetchPage("/admin/wallets", { type: "all", ...query });
  return {
    total: page.total,
    rows: page.rows.map((r: any): AdminWalletRow => {
    const org = r.organization ?? {};
    return {
      id: str(r.id),
      organizationId: str(r.organizationId ?? org.id, ""),
      organization: str(org.name, "—"),
      orgType: str(org.type, "—"),
      orgStatus: str(org.status, "—"),
      publicCode: str(org.publicCode, "—"),
      referralCode: str(org.referralCode, "—"),
      availableBalance: num(r.availableBalance),
      heldBalance: num(r.heldBalance),
      pendingBalance: num(r.pendingBalance ?? r.heldBalance),
      currency: str(r.currency, "AED"),
      status: str(r.status, "active"),
      updated: r.updatedAt ? String(r.updatedAt).replace("T", " ").slice(0, 16) : "—",
    };
  }),
  };
}

export type WalletTransactionRow = {
  id: string;
  type: string;
  amount: number;
  balanceBefore: number | null;
  balanceAfter: number;
  reference: string;
  description: string;
  status: string;
  createdAt: string;
  orderNumber?: string | null;
  purchaseOrderId?: string | null;
  orderId?: string | null;
};

/** GET /admin/wallets/:orgId/transactions → `{ wallet, transactions }` in the envelope data. */
export async function fetchOrgWalletTransactions(orgId: string, limit = 50) {
  const payload = await api.get<any>(`/admin/wallets/${orgId}/transactions`, {
    query: { limit: Math.min(100, Math.max(1, limit)) },
  });
  const list = Array.isArray(payload?.transactions) ? payload.transactions : asArray(payload);
  return {
    wallet: (payload?.wallet ?? null) as Record<string, any> | null,
    transactions: list.map((t: any): WalletTransactionRow => ({
      id: str(t.id),
      type: str(t.type, "—"),
      amount: num(t.amount),
      balanceBefore: t.balanceBefore == null ? null : num(t.balanceBefore),
      balanceAfter: num(t.balanceAfter),
      reference: t.referenceType
        ? `${str(t.referenceType, "")}${t.referenceId ? `:${str(t.referenceId, "")}` : ""}`
        : "—",
      description: str(t.description, "—"),
      status: str(t.status, "posted"),
      createdAt: t.createdAt ? String(t.createdAt).replace("T", " ").slice(0, 16) : "—",
      orderNumber: t.orderNumber ? str(t.orderNumber) : null,
      purchaseOrderId: t.purchaseOrderId ? str(t.purchaseOrderId) : null,
      orderId: t.orderId ? str(t.orderId) : null,
    })),
  };
}

export type ReferralRow = {
  id: string;
  referralCode: string;
  referrer: string;
  referrerCode: string;
  referrerOrganizationId: string;
  referred: string;
  referredCode: string;
  referredOrganizationId: string;
  referredOrgStatus: string;
  status: string;
  qualificationEvent: string;
  qualifyingAmount: number;
  rewardedAt: string;
  created: string;
};

function mapReferralRow(r: any): ReferralRow {
  const referrer = r.referrerOrganization ?? {};
  const referred = r.referredOrganization ?? {};
  return {
    id: str(r.id),
    referralCode: str(r.referralCode, "—"),
    referrer: str(referrer.name, "—"),
    referrerCode: str(referrer.publicCode, "—"),
    referrerOrganizationId: str(r.referrerOrganizationId ?? referrer.id, ""),
    referred: str(referred.name, "—"),
    referredCode: str(referred.publicCode, "—"),
    referredOrganizationId: str(r.referredOrganizationId ?? referred.id, ""),
    referredOrgStatus: str(referred.status, "—"),
    status: str(r.status, "pending"),
    qualificationEvent: str(r.qualificationEvent, "—"),
    qualifyingAmount: num(r.qualifyingAmount),
    rewardedAt: r.rewardedAt ? String(r.rewardedAt).replace("T", " ").slice(0, 16) : "—",
    created: r.createdAt ? String(r.createdAt).slice(0, 10) : "—",
  };
}

/** GET /admin/referrals — optional status / org filters are applied server-side. */
export async function fetchAdminReferrals(query?: {
  status?: string;
  referrerOrganizationId?: string;
  referredOrganizationId?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}) {
  const page = await fetchPage("/admin/referrals", query);
  return { rows: page.rows.map(mapReferralRow), total: page.total };
}

/** GET /admin/referrals/:id — includes both reward records. */
export async function fetchAdminReferral(id: string) {
  const detail = await api.get<any>(`/admin/referrals/${id}`);
  return {
    ...mapReferralRow(detail),
    qualifyingPurchaseOrderId: str(detail?.qualifyingPurchaseOrderId, "—"),
    referrerReward: detail?.referrerReward ?? null,
    referredReward: detail?.referredReward ?? null,
    metadata: detail?.metadata ?? null,
  };
}

export type RewardRow = {
  id: string;
  organization: string;
  organizationId: string;
  orgCode: string;
  type: string;
  source: string;
  amount: number;
  currency: string;
  status: string;
  reference: string;
  description: string;
  expiresAt: string;
  created: string;
};

/** GET /admin/rewards — read-only reward ledger across all organizations. */
export async function fetchAdminRewards(query?: {
  status?: string;
  type?: string;
  organizationId?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}) {
  const page = await fetchPage("/admin/rewards", query);
  return {
    total: page.total,
    rows: page.rows.map((r: any): RewardRow => {
    const org = r.organization ?? {};
    return {
      id: str(r.id),
      organization: str(org.name, "—"),
      organizationId: str(r.organizationId ?? org.id, ""),
      orgCode: str(org.publicCode, "—"),
      type: str(r.type, "—"),
      source: str(r.source, "—"),
      amount: num(r.amount),
      currency: str(r.currency, "AED"),
      status: str(r.status, "pending"),
      reference: r.referenceType
        ? `${str(r.referenceType, "")}${r.referenceId ? `:${str(r.referenceId, "")}` : ""}`
        : "—",
      description: str(r.description, "—"),
      expiresAt: r.expiresAt ? String(r.expiresAt).slice(0, 10) : "—",
      created: r.createdAt ? String(r.createdAt).slice(0, 10) : "—",
    };
  }),
  };
}

export type ReferralProgramSettings = {
  enabled: boolean;
  qualificationEvent: string;
  currency: string;
  referrerRewardAmount: number;
  referredRewardAmount: number;
  minimumOrderAmount: number;
  maxRewardsPerReferrer: number | null;
  rewardExpiryDays: number | null;
  shareBaseUrl: string;
};

export const REFERRAL_SETTINGS_FALLBACK: ReferralProgramSettings = {
  enabled: false,
  qualificationEvent: "FIRST_COMPLETED_ORDER",
  currency: "AED",
  referrerRewardAmount: 0,
  referredRewardAmount: 0,
  minimumOrderAmount: 0,
  maxRewardsPerReferrer: null,
  rewardExpiryDays: null,
  shareBaseUrl: "",
};

export async function fetchReferralSettings(): Promise<ReferralProgramSettings> {
  const raw = await api.get<any>("/admin/referral-settings");
  return {
    enabled: Boolean(raw?.enabled),
    qualificationEvent: str(raw?.qualificationEvent, "FIRST_COMPLETED_ORDER"),
    currency: str(raw?.currency, "AED"),
    referrerRewardAmount: num(raw?.referrerRewardAmount),
    referredRewardAmount: num(raw?.referredRewardAmount),
    minimumOrderAmount: num(raw?.minimumOrderAmount),
    maxRewardsPerReferrer: raw?.maxRewardsPerReferrer == null ? null : num(raw.maxRewardsPerReferrer),
    rewardExpiryDays: raw?.rewardExpiryDays == null ? null : num(raw.rewardExpiryDays),
    shareBaseUrl: str(raw?.shareBaseUrl, ""),
  };
}

/** PUT /admin/referral-settings — blank optional numbers clear the cap (null), not zero. */
export async function updateReferralSettings(input: {
  enabled: boolean;
  qualificationEvent: string;
  currency: string;
  referrerRewardAmount: number | string;
  referredRewardAmount: number | string;
  minimumOrderAmount: number | string;
  maxRewardsPerReferrer: number | string | null;
  rewardExpiryDays: number | string | null;
  shareBaseUrl: string;
}) {
  const currency = String(input.currency || "").trim().toUpperCase();
  if (currency.length !== 3) throw new Error("Currency must be a 3-letter code (e.g. AED)");

  const shareBaseUrl = String(input.shareBaseUrl || "").trim();
  if (!/^https?:\/\/.+/i.test(shareBaseUrl)) {
    throw new Error("Share base URL must be a full URL starting with http:// or https://");
  }

  const amount = (v: number | string, label: string) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) throw new Error(`${label} must be 0 or more`);
    return n;
  };

  const optionalInt = (v: number | string | null, label: string, min: number) => {
    if (v == null || String(v).trim() === "") return null;
    const n = Number(v);
    if (!Number.isInteger(n) || n < min) throw new Error(`${label} must be a whole number ≥ ${min}`);
    return n;
  };

  return api.put<ReferralProgramSettings>("/admin/referral-settings", {
    enabled: Boolean(input.enabled),
    qualificationEvent: str(input.qualificationEvent, "FIRST_COMPLETED_ORDER"),
    currency,
    referrerRewardAmount: amount(input.referrerRewardAmount, "Referrer reward"),
    referredRewardAmount: amount(input.referredRewardAmount, "Referred reward"),
    minimumOrderAmount: amount(input.minimumOrderAmount, "Minimum order amount"),
    maxRewardsPerReferrer: optionalInt(input.maxRewardsPerReferrer, "Max rewards per referrer", 0),
    rewardExpiryDays: optionalInt(input.rewardExpiryDays, "Reward expiry days", 1),
    shareBaseUrl,
  });
}

export async function creditOrgWallet(
  orgId: string,
  body: { amount: number; description?: string; idempotencyKey?: string },
) {
  return api.post(`/admin/wallets/${orgId}/credit`, body);
}

export async function debitOrgWallet(
  orgId: string,
  body: { amount: number; description?: string; idempotencyKey?: string },
) {
  return api.post(`/admin/wallets/${orgId}/debit`, body);
}

export async function refundWalletPayment(body: { paymentId: string; reason?: string }) {
  return api.post("/admin/wallets/refund", body);
}

export type WalletWithdrawalRow = {
  id: string;
  /** Hold referenceId — use for accept/reject APIs */
  requestId: string;
  organizationId: string;
  organization: string;
  orgType: string;
  publicCode: string;
  amount: number;
  currency: string;
  /** pending | accepted | rejected */
  requestStatus: string;
  status: string;
  description: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankIban: string;
  createdAt: string;
  actor: string;
};

export async function fetchAdminWalletWithdrawals(query?: {
  search?: string;
  status?: string;
  requestStatus?: string;
  orgType?: string;
  page?: number;
  limit?: number;
}) {
  const page = await fetchPage("/admin/wallets/withdrawals", {
    search: query?.search,
    orgType: query?.orgType,
    requestStatus: query?.requestStatus,
    page: query?.page,
    limit: query?.limit,
  });
  // Prefer hold rows (requests). Debit rows are payout ledger after accept.
  const mapped = page.rows
    .filter((r: any) => r.referenceType === "wallet_withdraw_request" && r.type === "hold")
    .map((r: any): WalletWithdrawalRow => {
      const wallet = r.wallet ?? {};
      const org = wallet.organization ?? {};
      const user = r.createdByUser ?? {};
      const meta = (r.metadata || {}) as Record<string, unknown>;
      return {
        id: str(r.id),
        requestId: str(r.referenceId, str(r.id)),
        organizationId: str(wallet.organizationId ?? org.id, ""),
        organization: str(org.name, "—"),
        orgType: str(org.type, "—"),
        publicCode: str(org.publicCode, "—"),
        amount: num(r.amount),
        currency: str(wallet.currency, "AED"),
        requestStatus: str(meta.requestStatus, "pending"),
        status: str(r.status, "posted"),
        description: str(r.description, "—"),
        bankName: str(meta.bankName, "—"),
        bankAccountName: str(meta.bankAccountName, "—"),
        bankAccountNumber: str(meta.bankAccountNumber, "—"),
        bankIban: str(meta.bankIban, "—"),
        createdAt: r.createdAt ? String(r.createdAt).replace("T", " ").slice(0, 16) : "—",
        actor: [user.firstName, user.lastName].filter(Boolean).join(" ") || str(user.email, "—"),
      };
    });
  const rows = query?.requestStatus
    ? mapped.filter((r) => r.requestStatus === query.requestStatus)
    : mapped;
  return { rows, total: page.total };
}

export async function acceptWalletWithdrawRequest(requestId: string) {
  return api.post(`/admin/wallets/withdrawals/${requestId}/accept`, {});
}

export async function rejectWalletWithdrawRequest(requestId: string, reason?: string) {
  return api.post(`/admin/wallets/withdrawals/${requestId}/reject`, {
    reason: reason?.trim() || undefined,
  });
}

export type WalletCreditRequestRow = {
  id: string;
  number: string;
  organizationId: string;
  organization: string;
  orgType: string;
  publicCode: string;
  subject: string;
  relatedCode: string;
  kind: "wallet_topup" | "credit_limit";
  amount: number;
  currency: string;
  period: "week" | "month" | null;
  status: string;
  priority: string;
  createdAt: string;
  requester: string;
};

function parseTopUpFromTicket(relatedCode: string, subject: string): {
  amount: number;
  currency: string;
  period: "week" | "month" | null;
  kind: "wallet_topup" | "credit_limit";
} {
  const credit = relatedCode.match(/^CREDIT_LIMIT:([A-Z]{3}):(\d+(?:\.\d+)?)(?::(week|month))?$/i);
  if (credit) {
    return {
      currency: credit[1].toUpperCase(),
      amount: num(credit[2]),
      period: credit[3] === "week" || credit[3] === "month" ? (credit[3].toLowerCase() as "week" | "month") : null,
      kind: "credit_limit",
    };
  }
  const m = relatedCode.match(/^TOPUP:([A-Z]{3}):(\d+(?:\.\d+)?)$/i);
  if (m) return { currency: m[1].toUpperCase(), amount: num(m[2]), period: null, kind: "wallet_topup" };
  const sm = subject.match(/([A-Z]{3})\s+(\d+(?:\.\d+)?)/i);
  if (sm) {
    const kind = /credit/i.test(subject) ? "credit_limit" : "wallet_topup";
    return { currency: sm[1].toUpperCase(), amount: num(sm[2]), period: null, kind };
  }
  return { currency: "AED", amount: 0, period: null, kind: "wallet_topup" };
}

export async function fetchAdminWalletCreditRequests(query?: {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const page = await fetchPage("/admin/wallets/credit-requests", query);
  return {
    total: page.total,
    rows: page.rows.map((r: any): WalletCreditRequestRow => {
    const org = r.organization ?? {};
    const user = r.creator ?? {};
    const relatedCode = str(r.relatedCode, "");
    const subject = str(r.subject, "—");
    const parsed = parseTopUpFromTicket(relatedCode, subject);
    const category = str(r.category, parsed.kind);
    return {
      id: str(r.id),
      number: str(r.number, "—"),
      organizationId: str(r.organizationId ?? org.id, ""),
      organization: str(org.name, "—"),
      orgType: str(org.type, "—"),
      publicCode: str(org.publicCode, "—"),
      subject,
      relatedCode: relatedCode || "—",
      kind: category === "credit_limit" ? "credit_limit" : "wallet_topup",
      amount: parsed.amount,
      currency: parsed.currency,
      period: parsed.period,
      status: str(r.status, "open"),
      priority: str(r.priority, "medium"),
      createdAt: r.createdAt ? String(r.createdAt).replace("T", " ").slice(0, 16) : "—",
      requester: [user.firstName, user.lastName].filter(Boolean).join(" ") || str(user.email, "—"),
    };
  }),
  };
}

export async function acceptWalletCreditRequest(ticketId: string) {
  return api.post(`/admin/wallets/credit-requests/${ticketId}/accept`, {});
}

export async function rejectWalletCreditRequest(ticketId: string, reason?: string) {
  return api.post(`/admin/wallets/credit-requests/${ticketId}/reject`, {
    reason: reason?.trim() || undefined,
  });
}

export type CreditFacilityRow = {
  organizationId: string;
  organization: string;
  publicCode: string;
  currency: string;
  facility: number;
  invoiced: number;
  paid: number;
  remaining: number;
  openCount: number;
  overdueCount: number;
  invoiceCount: number;
  owingStatus: "clear" | "owing" | "overdue" | "none";
};

export type CreditFacilityLoanRow = {
  id: string;
  number: string;
  total: number;
  paid: number;
  remaining: number;
  currency: string;
  status: string;
  dueDate: string | null;
  paidAt: string | null;
  ticketNumber: string | null;
  createdAt: string;
};

export async function fetchAdminCreditFacilities(query?: {
  search?: string;
  filter?: string;
  page?: number;
  limit?: number;
}) {
  const page = await fetchPage("/admin/wallets/credit-facilities", {
    search: query?.search,
    filter: query?.filter,
    page: query?.page,
    limit: query?.limit,
  });
  return {
    total: page.total,
    rows: page.rows.map((r: any): CreditFacilityRow => ({
      organizationId: str(r.organizationId),
      organization: str(r.organization, "—"),
      publicCode: str(r.publicCode, ""),
      currency: str(r.currency, "AED"),
      facility: num(r.facility),
      invoiced: num(r.invoiced),
      paid: num(r.paid),
      remaining: num(r.remaining),
      openCount: num(r.openCount),
      overdueCount: num(r.overdueCount),
      invoiceCount: num(r.invoiceCount),
      owingStatus:
        r.owingStatus === "overdue" ||
        r.owingStatus === "owing" ||
        r.owingStatus === "clear" ||
        r.owingStatus === "none"
          ? r.owingStatus
          : "none",
    })),
  };
}

export async function fetchAdminCreditFacility(orgId: string) {
  const data = await api.get<any>(`/admin/wallets/credit-facilities/${orgId}`);
  const org = data?.organization ?? {};
  return {
    organization: {
      id: str(org.id ?? orgId),
      name: str(org.name, "—"),
      publicCode: str(org.publicCode, ""),
    },
    facility: num(data?.facility),
    invoiced: num(data?.invoiced),
    paid: num(data?.paid),
    remaining: num(data?.remaining),
    loans: (Array.isArray(data?.loans) ? data.loans : []).map(
      (l: any): CreditFacilityLoanRow => ({
        id: str(l.id),
        number: str(l.number, "—"),
        total: num(l.total),
        paid: num(l.paid),
        remaining: num(l.remaining),
        currency: str(l.currency, "AED"),
        status: str(l.status, "issued"),
        dueDate: l.dueDate ? String(l.dueDate).slice(0, 10) : null,
        paidAt: l.paidAt ? String(l.paidAt).replace("T", " ").slice(0, 16) : null,
        ticketNumber: l.ticketNumber ? String(l.ticketNumber) : null,
        createdAt: l.createdAt
          ? String(l.createdAt).replace("T", " ").slice(0, 16)
          : "—",
      }),
    ),
  };
}

export async function importCloudKitchenDishes(file: File, cloudKitchenId?: string) {
  const form = new FormData();
  form.append("file", file);
  if (cloudKitchenId) form.append("cloudKitchenId", cloudKitchenId);
  return api.post<{
    imported?: number;
    created?: number;
    updated?: number;
    failed?: number;
    errors?: Array<{ row: number; error: string }>;
    dishes?: any[];
  }>("/admin/cloud-kitchen/dishes/import", form);
}

export async function updateCloudKitchen(
  kitchenId: string,
  body: Record<string, unknown>,
) {
  return api.patch(`/admin/cloud-kitchen/kitchens/${kitchenId}`, body);
}

export async function fetchCloudKitchenProduction(query?: {
  date?: string;
  cloudKitchenId?: string;
}) {
  return api.get<{
    date?: string;
    totals?: { produced?: number; sold?: number; remaining?: number };
    rows?: any[];
  }>("/admin/cloud-kitchen/production", { query });
}

export async function fetchCloudKitchenOrders(query?: {
  limit?: number;
  page?: number;
  status?: string;
  cloudKitchenId?: string;
}) {
  return api.get<any>("/admin/cloud-kitchen/orders", { query });
}

export async function updateCloudKitchenOrderStatus(
  orderId: string,
  status: string,
  deliverySlot?: string | null,
) {
  return api.patch<any>(`/admin/cloud-kitchen/orders/${orderId}/status`, {
    status,
    deliverySlot,
  });
}

/** PATCH /admin/banners/reorder — persist banner sort order. */
export async function reorderBanners(items: { id: string; sortOrder: number }[]) {
  if (!items.length) return [];
  return api.patch("/admin/banners/reorder", { items });
}

