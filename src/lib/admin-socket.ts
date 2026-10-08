import { io, type Socket } from "socket.io-client";
import type { QueryClient } from "@tanstack/react-query";
import { getAccessToken } from "@/lib/auth-session";

export type DataChangedPayload = {
  resource?: string;
  action?: string;
  id?: string;
  organizationId?: string | null;
  tags?: string[];
  at?: string;
};

function resolveSocketOrigin(): string {
  const base =
    (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ||
    "https://api.scopsk.ae/api/v1";
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
  if (resource === "wallets" || hasTag("wallet")) {
    void qc.invalidateQueries({ queryKey: ["admin", "wallets"] }).catch(ignore);
    void qc.invalidateQueries({ queryKey: ["admin", "wallet"] }).catch(ignore);
    void qc.invalidateQueries({ queryKey: ["admin", "wallet-transactions"] }).catch(ignore);
    void qc.invalidateQueries({ queryKey: ["admin", "wallet-credit-requests"] }).catch(ignore);
    void qc.invalidateQueries({ queryKey: ["admin", "wallet-withdrawals"] }).catch(ignore);
  }
  if (resource === "organizations" || hasTag("organizations")) {
    void qc.invalidateQueries({ queryKey: ["organizations"] }).catch(ignore);
  }
  if (resource === "support" || hasTag("support")) {
    void qc.invalidateQueries({ queryKey: ["support"] }).catch(ignore);
  }
}

let socket: Socket | null = null;

export function connectAdminSocket(qc: QueryClient) {
  if (typeof window === "undefined") return () => {};
  const token = getAccessToken();
  if (!token) return () => {};

  if (socket?.connected) {
    socket.off("data:changed");
    socket.on("data:changed", (payload: DataChangedPayload) => {
      invalidateFromDataChanged(qc, payload);
    });
    return () => {
      socket?.off("data:changed");
    };
  }

  socket?.disconnect();
  socket = io(resolveSocketOrigin(), {
    path: "/socket.io",
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 15000,
  });

  socket.on("data:changed", (payload: DataChangedPayload) => {
    invalidateFromDataChanged(qc, payload);
  });

  return () => {
    socket?.off("data:changed");
    socket?.disconnect();
    socket = null;
  };
}
