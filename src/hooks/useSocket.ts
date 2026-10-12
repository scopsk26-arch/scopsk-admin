import { useCallback, useEffect, useRef, useState } from "react";
import {
  adminSocket,
  type AdminSocketEventMap,
  type AdminSocketEventName,
  type AdminSocketStatus,
} from "@/lib/admin-socket";

export type { AdminSocketEventMap, AdminSocketEventName, AdminSocketStatus };

/**
 * Shared Socket.IO connection for the whole admin app.
 * One connection lives in adminSocket. Pages subscribe through these hooks.
 */
export function useSocket() {
  const [status, setStatus] = useState<AdminSocketStatus>(adminSocket.getStatus());

  useEffect(() => adminSocket.onStatus(setStatus), []);

  const reconnect = useCallback(() => {
    adminSocket.reconnect();
  }, []);

  return {
    status,
    connected: status === "connected",
    reconnect,
  };
}

/** Start the shared connection once, from the admin layout. */
export function useSocketConnection() {
  useEffect(() => {
    adminSocket.start();
    return () => {
      adminSocket.stop();
    };
  }, []);
}

/**
 * Subscribe to one socket event. The handler always sees the latest closure
 * and is removed when the page unmounts.
 */
export function useSocketEvent<K extends AdminSocketEventName>(
  event: K,
  handler: (payload: AdminSocketEventMap[K]) => void,
  enabled = true,
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return undefined;
    return adminSocket.on(event, (payload) => {
      handlerRef.current(payload);
    });
  }, [event, enabled]);
}
