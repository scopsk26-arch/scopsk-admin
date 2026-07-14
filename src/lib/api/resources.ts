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
      region: "—",
      branches: 0,
      orders: 0,
      spend: 0,
      rfqs: 0,
      status: str(u.status, "active"),
      categories: [] as string[],
      revenue: 0,
      winRate: 0,
      rating: 0,
      email: str(u.email),
      type,
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

function mapOrgRow(r: any, type: "restaurant" | "supplier") {
  return {
    id: str(r.id),
    name: str(r.name, "Untitled"),
    industry: str(r.metadata?.industry ?? r.legalName, "—"),
    region: str(r.city || r.country, "—"),
    branches: num(r.metadata?.branches),
    orders: num(r.metadata?.orders ?? r.orderCount),
    spend: num(r.metadata?.spend ?? r.spend),
    rfqs: num(r.metadata?.rfqs),
    status: str(r.status || r.verificationStatus, "pending"),
    categories: Array.isArray(r.metadata?.categories) ? r.metadata.categories : [],
    revenue: num(r.metadata?.revenue ?? r.revenue),
    winRate: num(r.metadata?.winRate),
    rating: num(r.metadata?.rating),
    email: str(r.email),
    type,
  };
}

export async function fetchList(path: string, query?: Record<string, string | number | boolean | undefined | null>) {
  try {
    return asArray(await api.get(path, { query: { limit: 100, ...query } }));
  } catch {
    return [];
  }
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
  supplier: string;
  gross: number;
  rate: string;
  commission: number;
  status: string;
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
    const gross = num(r.gross ?? r.purchaseOrder?.total ?? (rateNum > 0 ? amount / (rateNum / 100) : 0));
    return {
      id: str(r.id),
      po: str(r.purchaseOrder?.number ?? r.purchaseOrderId, "—"),
      supplier: str(r.supplierOrg?.name ?? r.supplier?.name ?? r.supplierOrgId, "—"),
      gross,
      rate: `${rateNum}%`,
      commission: amount,
      status: str(r.status, "pending"),
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
