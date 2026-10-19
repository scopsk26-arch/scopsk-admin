import { io, type Socket } from "socket.io-client";
import type { QueryClient } from "@tanstack/react-query";
import { getAccessToken, subscribeSession } from "@/lib/auth-session";

export type DataChangedPayload = {
  resource?: string;
  action?: string;
  id?: string;
  organizationId?: string | null;
  tags?: string[];
  at?: string;
};

export type AdminSocketStatus = "idle" | "connecting" | "connected" | "disconnected" | "error";

export type AdminSocketEventMap = {
  "data:changed": DataChangedPayload;
};

export type AdminSocketEventName = keyof AdminSocketEventMap;

function resolveSocketOrigin(): string {
  const base =
    (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ||
    "https://scopsk-apis-c2f3bfd4da40.herokuapp.com/api/v1";
  return base.replace(/\/api\/v1\/?$/, "");
}

function ignore() {
  /* ignore invalidate failures */
}

/** Map backend `data:changed` → TanStack Query invalidations (no polling). */
export function invalidateFromDataChanged(qc: QueryClient, event: DataChangedPayload | null | undefined) {
  if (!event?.resource) return;
  const resource = String(event.resource).toLowerCase();
  const tags = (event.tags || []).map((t) => String(t).toLowerCase());
  const hasTag = (...names: string[]) => names.some((n) => tags.includes(n.toLowerCase()));

  if (resource === "notifications" || hasTag("notifications")) {
    void qc.invalidateQueries({ queryKey: ["notifications"] }).catch(ignore);
  }
  if (resource === "rfqs" || hasTag("rfqs")) {
    void qc.invalidateQueries({ queryKey: ["rfqs"] }).catch(ignore);
  }
  if (resource === "quotations" || hasTag("quotations")) {
    void qc.invalidateQueries({ queryKey: ["quotations"] }).catch(ignore);
  }
  if (resource === "orders" || resource === "purchase_orders" || hasTag("orders")) {
    void qc.invalidateQueries({ queryKey: ["purchase-orders"] }).catch(ignore);
  }
  if (resource === "deliveries" || hasTag("deliveries")) {
    void qc.invalidateQueries({ queryKey: ["deliveries"] }).catch(ignore);
  }
  if (resource === "invoices" || hasTag("invoices")) {
    void qc.invalidateQueries({ queryKey: ["invoices"] }).catch(ignore);
  }
  if (resource === "payments" || hasTag("payments")) {
    void qc.invalidateQueries({ queryKey: ["payments"] }).catch(ignore);
  }
  if (resource === "wallets" || hasTag("wallet")) {
    void qc.invalidateQueries({ queryKey: ["admin", "wallets"] }).catch(ignore);
    void qc.invalidateQueries({ queryKey: ["admin", "wallet"] }).catch(ignore);
    void qc.invalidateQueries({ queryKey: ["admin", "wallet-transactions"] }).catch(ignore);
    void qc.invalidateQueries({ queryKey: ["admin", "wallet-credit-requests"] }).catch(ignore);
    void qc.invalidateQueries({ queryKey: ["admin", "wallet-withdrawals"] }).catch(ignore);
  }
  if (resource === "organizations" || resource === "suppliers" || hasTag("organizations")) {
    void qc.invalidateQueries({ queryKey: ["organizations"] }).catch(ignore);
  }
  if (resource === "support" || hasTag("support")) {
    void qc.invalidateQueries({ queryKey: ["support"] }).catch(ignore);
  }
  if (resource === "ck_orders" || hasTag("ck_orders")) {
    void qc.invalidateQueries({ queryKey: ["ck-orders"] }).catch(ignore);
  }
  if (
    ["rfqs", "quotations", "orders", "purchase_orders", "deliveries", "support", "disputes", "kyc", "organizations", "suppliers"].includes(resource) ||
    hasTag("rfqs", "quotations", "orders", "support", "disputes", "kyc", "organizations")
  ) {
    void qc.invalidateQueries({ queryKey: ["admin", "dashboard"] }).catch(ignore);
  }
}

/**
 * One Socket.IO connection for the admin app.
 * Screens subscribe through useSocket, not by calling io() again.
 */
class AdminSocketManager {
  private socket: Socket | null = null;
  private status: AdminSocketStatus = "idle";
  private lastToken: string | null = null;
  private started = false;
  private sessionUnsub: (() => void) | null = null;
  private onVisible: (() => void) | null = null;
  private statusListeners = new Set<(status: AdminSocketStatus) => void>();
  private handlers: {
    [K in AdminSocketEventName]: Set<(payload: AdminSocketEventMap[K]) => void>;
  } = {
    "data:changed": new Set(),
  };

  getStatus(): AdminSocketStatus {
    return this.status;
  }

  onStatus(handler: (status: AdminSocketStatus) => void): () => void {
    this.statusListeners.add(handler);
    handler(this.status);
    return () => {
      this.statusListeners.delete(handler);
    };
  }

  on<K extends AdminSocketEventName>(
    event: K,
    handler: (payload: AdminSocketEventMap[K]) => void,
  ): () => void {
    this.handlers[event].add(handler);
    return () => {
      this.handlers[event].delete(handler);
    };
  }

  start() {
    if (this.started || typeof window === "undefined") return;
    this.started = true;
    this.sessionUnsub = subscribeSession(() => this.sync());
    this.onVisible = () => {
      if (document.visibilityState === "visible") this.sync();
    };
    document.addEventListener("visibilitychange", this.onVisible);
    this.sync();
  }

  stop() {
    this.sessionUnsub?.();
    this.sessionUnsub = null;
    if (this.onVisible) {
      document.removeEventListener("visibilitychange", this.onVisible);
      this.onVisible = null;
    }
    this.started = false;
    this.disconnect();
  }

  reconnect() {
    const token = getAccessToken();
    if (!token) {
      this.disconnect();
      return;
    }
    this.connect(token);
  }

  private sync() {
    const token = getAccessToken();
    if (!token) {
      this.disconnect();
      return;
    }
    if (this.socket?.connected && this.lastToken === token) return;
    this.connect(token);
  }

  private connect(token: string) {
    this.disconnectSocketOnly();
    this.setStatus("connecting");
    this.lastToken = token;

    const socket = io(resolveSocketOrigin(), {
      path: "/socket.io",
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 12,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 15000,
    });

    socket.on("connect", () => this.setStatus("connected"));
    socket.on("disconnect", () => this.setStatus("disconnected"));
    socket.on("connect_error", () => this.setStatus("error"));
    socket.on("data:changed", (payload: DataChangedPayload) => {
      this.emitLocal("data:changed", payload);
    });

    this.socket = socket;
  }

  private emitLocal<K extends AdminSocketEventName>(event: K, payload: AdminSocketEventMap[K]) {
    for (const handler of this.handlers[event]) {
      try {
        handler(payload);
      } catch {
        /* ignore subscriber errors */
      }
    }
  }

  private setStatus(status: AdminSocketStatus) {
    this.status = status;
    for (const listener of this.statusListeners) {
      try {
        listener(status);
      } catch {
        /* ignore subscriber errors */
      }
    }
  }

  private disconnectSocketOnly() {
    if (!this.socket) return;
    this.socket.removeAllListeners();
    this.socket.disconnect();
    this.socket = null;
  }

  disconnect() {
    this.lastToken = null;
    this.disconnectSocketOnly();
    this.setStatus("disconnected");
  }
}

export const adminSocket = new AdminSocketManager();

/** @deprecated Screens should use useSocketConnection and useSocketEvent. */
export function connectAdminSocket(qc: QueryClient) {
  adminSocket.start();
  const unsub = adminSocket.on("data:changed", (payload) => {
    invalidateFromDataChanged(qc, payload);
  });
  return () => {
    unsub();
    adminSocket.stop();
  };
}
