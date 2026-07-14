import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Sidebar } from "@/components/admin/Sidebar";
import { Topbar } from "@/components/admin/Topbar";
import { ThemeProvider } from "@/components/admin/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { clearSession, hasAccessToken } from "@/lib/auth-session";
import { me } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

export const Route = createFileRoute("/_admin")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    if (!hasAccessToken()) {
      throw redirect({ to: "/login" });
    }
    // Optional session validation
    try {
      await me();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearSession();
        throw redirect({ to: "/login" });
      }
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <ThemeProvider>
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
    </ThemeProvider>
  );
}
