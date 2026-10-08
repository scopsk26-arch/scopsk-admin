import { api } from "@/lib/api/client";
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  setOrgId,
  setSession,
  setSessionUser,
  type SessionUser,
} from "@/lib/auth-session";

export type LoginResult = {
  user: SessionUser;
  accessToken: string;
  refreshToken: string;
  expiresIn?: string | number;
  tokenType?: string;
  otpRequired?: boolean;
  organizations?: Array<{ id: string; name?: string; type?: string }>;
};

export type MeResult = {
  user: SessionUser;
  roles?: Array<{ role?: string; organizationId?: string | null }>;
  organizations?: Array<{ id: string; name?: string; type?: string }>;
};

export async function login(email: string, password: string): Promise<LoginResult> {
  const data = await api.post<LoginResult>("/auth/login", { email, password }, { auth: false });
  if (data.otpRequired) {
    throw new Error("OTP required — complete verification before signing in");
  }
  if (!data?.accessToken || !data?.refreshToken) {
    throw new Error("Login response missing tokens");
  }

  let orgId = data.organizations?.[0]?.id ?? null;
  setSession({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: data.user,
    orgId,
  });

  try {
    const profile = await api.get<MeResult>("/auth/me");
    if (profile?.user) {
      orgId = profile.organizations?.[0]?.id ?? orgId;
      setSessionUser({ ...profile.user, roles: profile.roles });
      if (orgId) setOrgId(orgId);
    }
  } catch {
    // tokens already stored
  }

  return data;
}

export async function me(): Promise<MeResult> {
  const data = await api.get<MeResult>("/auth/me");
  if (data?.user) {
    setSessionUser({ ...data.user, roles: data.roles });
    const orgId = data.organizations?.[0]?.id;
    if (orgId) setOrgId(orgId);
  }
  return data;
}

export async function refresh(): Promise<{ accessToken: string; refreshToken: string }> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token");
  return api.post("/auth/refresh", { refreshToken }, { auth: false });
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  try {
    if (refreshToken && getAccessToken()) {
      await api.post("/auth/logout", { refreshToken });
    }
  } catch {
    // still clear local session
  } finally {
    clearSession();
  }
}
