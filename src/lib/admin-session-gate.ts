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
let inflight: Promise<void> | null = null;

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
    throw redirect({ to: "/login" });
  }
}

/**
 * Gate admin routes. Returns nothing — TanStack Start serializes beforeLoad
 * results across SSR/hydration, and MeResult (roles, index signatures) is not safe.
 */
export function ensurePlatformAdminSession(): void | Promise<void> {
  if (typeof window === "undefined") return;
  if (!hasAccessToken()) {
    clearAdminSessionGate();
    throw redirect({ to: "/login" });
  }

  const token = getAccessToken()!;
  const now = Date.now();
  if (cache && cache.accessToken === token && now - cache.checkedAt < GATE_TTL_MS) {
    assertPlatformAdmin(cache.result);
    return;
  }
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const session = await me();
      assertPlatformAdmin(session);
      cache = { accessToken: token, checkedAt: Date.now(), result: session };
    } catch (error) {
      clearAdminSessionGate();
      if (isRedirect(error)) throw error;
      // Auth failures → login. Network/5xx used to bubble as "This page didn't
      // load"; keep tokens and let the shell render so Try again / pages can recover.
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        clearSession();
        throw redirect({ to: "/login" });
      }
      console.warn("Admin session check failed", error);
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

function isRedirect(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "isRedirect" in error &&
      (error as { isRedirect?: boolean }).isRedirect,
  );
}
