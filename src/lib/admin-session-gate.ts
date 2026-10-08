import { redirect } from "@tanstack/react-router";
import { me, type MeResult } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { clearSession, getAccessToken, hasAccessToken } from "@/lib/auth-session";

const PLATFORM_ROLES = new Set([
  "super_admin",
  "operations_admin",
  "finance_admin",
  "auditor",
  "kyc_officer",
  "support_agent",
  "marketing",
]);
const GATE_TTL_MS = 5 * 60_000;

let cache: { accessToken: string; checkedAt: number; result: MeResult } | null = null;
let inflight: Promise<MeResult> | null = null;

export function clearAdminSessionGate() {
  cache = null;
  inflight = null;
}

function assertPlatformAdmin(session: MeResult) {
  const roles = (session.roles || [])
    .map((role: any) => String(role.slug || role.role || role.name || "").toLowerCase())
    .filter(Boolean);
  if (!roles.some((role) => PLATFORM_ROLES.has(role))) {
    clearAdminSessionGate();
    clearSession();
    throw redirect({ to: "/login", search: { reason: "admin_only" } });
  }
}

export function ensurePlatformAdminSession(): MeResult | Promise<MeResult> {
  if (typeof window === "undefined") return { user: { id: "", email: "" } };
  if (!hasAccessToken()) {
    clearAdminSessionGate();
    throw redirect({ to: "/login" });
  }

  const token = getAccessToken()!;
  const now = Date.now();
  if (cache && cache.accessToken === token && now - cache.checkedAt < GATE_TTL_MS) {
    assertPlatformAdmin(cache.result);
    return cache.result;
  }
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const session = await me();
      assertPlatformAdmin(session);
      cache = { accessToken: token, checkedAt: Date.now(), result: session };
      return session;
    } catch (error) {
      clearAdminSessionGate();
      if (error instanceof ApiError && error.status === 401) {
        clearSession();
        throw redirect({ to: "/login" });
      }
      throw error;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}
