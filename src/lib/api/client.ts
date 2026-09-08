import {
  clearSession,
  getAccessToken,
  getOrgId,
  getRefreshToken,
  setTokens,
} from "@/lib/auth-session";

export type ApiEnvelope<T = unknown> = {
  success: boolean;
  message?: string;
  data: T;
  meta?: Record<string, unknown>;
};

export class ApiError extends Error {
  status: number;
  payload?: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "")
  || "https://res-py-apis-2aa637410d3d.herokuapp.com/api/v1";

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  auth?: boolean;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Skip auto-refresh retry (used internally). */
  _retried?: boolean;
  /** Abort after this many ms (default 25s — Heroku router limit is 30s). */
  timeoutMs?: number;
};

function buildUrl(path: string, query?: RequestOptions["query"]) {
  const url = new URL(path.startsWith("http") ? path : `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    });
  }
  return url.toString();
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && "success" in payload && "data" in (payload as object)) {
    const env = payload as ApiEnvelope<T>;
    if (env.success === false) {
      throw new ApiError(env.message || "Request failed", 400, payload);
    }
    return env.data;
  }
  return payload as T;
}

function unwrapEnvelope<T>(payload: unknown): { data: T; meta?: Record<string, unknown> } {
  if (payload && typeof payload === "object" && "success" in payload && "data" in (payload as object)) {
    const env = payload as ApiEnvelope<T>;
    if (env.success === false) {
      throw new ApiError(env.message || "Request failed", 400, payload);
    }
    return { data: env.data, meta: env.meta };
  }
  return { data: payload as T };
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(buildUrl("/auth/refresh"), {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        const payload = await parseBody(res);
        if (!res.ok) return false;
        const data = unwrap<{ accessToken?: string; refreshToken?: string }>(payload);
        if (!data?.accessToken || !data?.refreshToken) return false;
        setTokens(data.accessToken, data.refreshToken);
        return true;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

export async function apiRequest<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {}, auth = true, query, _retried, timeoutMs = 25_000 } = options;
  const reqHeaders: Record<string, string> = {
    Accept: "application/json",
    ...headers,
  };

  if (body !== undefined && !(body instanceof FormData)) {
    reqHeaders["Content-Type"] = reqHeaders["Content-Type"] || "application/json";
  }

  if (auth) {
    const token = getAccessToken();
    if (token) reqHeaders.Authorization = `Bearer ${token}`;
    // Prefer explicit org header from caller; fall back to session org
    if (!reqHeaders["X-Organization-Id"] && !reqHeaders["x-organization-id"]) {
      const orgId = getOrgId();
      if (orgId) reqHeaders["X-Organization-Id"] = orgId;
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), {
      method,
      headers: reqHeaders,
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("Request timed out — server is slow or unreachable. Try again.", 408);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  const payload = await parseBody(res);

  if (res.status === 401 && auth && !_retried) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return apiRequest<T>(path, { ...options, _retried: true });
    }
    clearSession();
  }

  if (!res.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message?: string }).message || "Request failed")
        : `Request failed (${res.status})`;
    throw new ApiError(message, res.status, payload);
  }

  return unwrap<T>(payload);
}

/** Like apiRequest but keeps pagination `meta` (page/limit/total/totalPages). */
export async function apiRequestEnvelope<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<{ data: T; meta?: Record<string, unknown> }> {
  const { method = "GET", body, headers = {}, auth = true, query, _retried, timeoutMs = 25_000 } = options;
  const reqHeaders: Record<string, string> = {
    Accept: "application/json",
    ...headers,
  };

  if (body !== undefined && !(body instanceof FormData)) {
    reqHeaders["Content-Type"] = reqHeaders["Content-Type"] || "application/json";
  }

  if (auth) {
    const token = getAccessToken();
    if (token) reqHeaders.Authorization = `Bearer ${token}`;
    if (!reqHeaders["X-Organization-Id"] && !reqHeaders["x-organization-id"]) {
      const orgId = getOrgId();
      if (orgId) reqHeaders["X-Organization-Id"] = orgId;
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), {
      method,
      headers: reqHeaders,
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("Request timed out — server is slow or unreachable. Try again.", 408);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  const payload = await parseBody(res);

  if (res.status === 401 && auth && !_retried) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return apiRequestEnvelope<T>(path, { ...options, _retried: true });
    }
    clearSession();
  }

  if (!res.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message?: string }).message || "Request failed")
        : `Request failed (${res.status})`;
    throw new ApiError(message, res.status, payload);
  }

  return unwrapEnvelope<T>(payload);
}

export const api = {
  get: <T = unknown>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "GET" }),
  getEnvelope: <T = unknown>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequestEnvelope<T>(path, { ...options, method: "GET" }),
  post: <T = unknown>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "POST", body }),
  put: <T = unknown>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "PUT", body }),
  patch: <T = unknown>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "PATCH", body }),
  delete: <T = unknown>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "DELETE" }),
};

/** Normalize list payloads (array, or nested rows/items/data). */
export function asArray<T = Record<string, unknown>>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const key of ["rows", "items", "results", "data", "records", "signals", "suppliers", "products"]) {
      if (Array.isArray(obj[key])) return obj[key] as T[];
    }
  }
  return [];
}

export function str(v: unknown, fallback = "—") {
  if (v == null || v === "") return fallback;
  return String(v);
}

export function num(v: unknown, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
