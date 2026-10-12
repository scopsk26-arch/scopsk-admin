import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateFromDataChanged, type DataChangedPayload } from "@/lib/admin-socket";
import { useSocketConnection, useSocketEvent } from "@/hooks/useSocket";

/**
 * Owns the one admin socket and refreshes open lists from `data:changed`.
 * Mount once in the admin layout.
 */
export function AdminRealtime() {
  useSocketConnection();
  useLiveAdminQueries();
  return null;
}

function useLiveAdminQueries() {
  const qc = useQueryClient();
  const pending = useRef<DataChangedPayload[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  useSocketEvent("data:changed", (payload) => {
    pending.current.push(payload);
    if (timer.current) return;
    timer.current = setTimeout(() => {
      const batch = pending.current.splice(0);
      timer.current = null;
      const seen = new Set<string>();
      for (const event of batch) {
        const key = [event.resource || "", event.id || "", event.action || ""].join("|");
        if (seen.has(key)) continue;
        seen.add(key);
        invalidateFromDataChanged(qc, event);
      }
    }, 400);
  });
}
