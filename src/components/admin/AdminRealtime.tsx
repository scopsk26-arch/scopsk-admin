import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { connectAdminSocket } from "@/lib/admin-socket";

/** Invisible: keeps admin queries fresh via Socket.IO `data:changed` (no polling). */
export function AdminRealtime() {
  const qc = useQueryClient();
  useEffect(() => connectAdminSocket(qc), [qc]);
  return null;
}
