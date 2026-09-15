import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Sidebar } from "@/components/admin/Sidebar";
import { Topbar } from "@/components/admin/Topbar";
import { Toaster } from "@/components/ui/sonner";
import { clearSession, hasAccessToken } from "@/lib/auth-session";
import { me } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

const PLATFORM_ROLES = new Set([
  "super_admin",
  "operations_admin",
  "finance_admin",
  "auditor",
  "kyc_officer",
  "support_agent",
  "marketing",
]);

export const Route = createFileRoute("/_admin")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    if (!hasAccessToken()) {
      throw redirect({ to: "/login" });
    }
    try {
      const session = await me();
      const roles = (session?.roles || [])
        .map((r: any) => String(r.slug || r.role || r.name || "").toLowerCase())
        .filter(Boolean);
      const isPlatform = roles.some((r) => PLATFORM_ROLES.has(r));
      if (!isPlatform) {
        clearSession();
        throw redirect({ to: "/login", search: { reason: "admin_only" } });
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearSession();
        throw redirect({ to: "/login" });
      }
      throw err;
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <>
      <div className="min-h-screen flex bg-background text-foreground">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar />
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
      <Toaster position="top-right" richColors closeButton />
    </>
  );
}
