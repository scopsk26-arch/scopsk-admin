const ACCESS_KEY = "respy_access_token";
const REFRESH_KEY = "respy_refresh_token";
const ORG_KEY = "respy_org_id";
const USER_KEY = "respy_user";

export type SessionUser = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  status?: string;
  [key: string]: unknown;
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

const sessionListeners = new Set<() => void>();
let sessionNotifyTimer: ReturnType<typeof setTimeout> | null = null;

/** Fires after login, refresh, or logout. Same-tab writes do not emit `storage`. */
export function subscribeSession(listener: () => void): () => void {
  sessionListeners.add(listener);
  return () => {
    sessionListeners.delete(listener);
  };
}

function notifySession() {
  if (sessionNotifyTimer != null) return;
  sessionNotifyTimer = setTimeout(() => {
    sessionNotifyTimer = null;
    for (const listener of sessionListeners) {
      try {
        listener();
      } catch {
        /* ignore subscriber errors */
      }
    }
  }, 0);
}

export function getAccessToken(): string | null {
  if (!canUseStorage()) return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (!canUseStorage()) return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function getOrgId(): string | null {
  if (!canUseStorage()) return null;
  return localStorage.getItem(ORG_KEY);
}

export function getSessionUser(): SessionUser | null {
  if (!canUseStorage()) return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function setTokens(accessToken: string, refreshToken: string) {
  if (!canUseStorage()) return;
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
  notifySession();
}

export function setOrgId(orgId: string | null) {
  if (!canUseStorage()) return;
  if (orgId) localStorage.setItem(ORG_KEY, orgId);
  else localStorage.removeItem(ORG_KEY);
  notifySession();
}

export function setSessionUser(user: SessionUser | null) {
  if (!canUseStorage()) return;
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
  notifySession();
}

export function setSession(input: {
  accessToken: string;
  refreshToken: string;
  user?: SessionUser | null;
  orgId?: string | null;
}) {
  setTokens(input.accessToken, input.refreshToken);
  if (input.user !== undefined) setSessionUser(input.user);
  if (input.orgId !== undefined) setOrgId(input.orgId);
}

export function clearSession() {
  if (!canUseStorage()) return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(ORG_KEY);
  localStorage.removeItem(USER_KEY);
  notifySession();
}

export function hasAccessToken(): boolean {
  return Boolean(getAccessToken());
}
