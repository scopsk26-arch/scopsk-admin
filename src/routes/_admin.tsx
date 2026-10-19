import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Sidebar } from "@/components/admin/Sidebar";
import { Topbar } from "@/components/admin/Topbar";
import { AdminRealtime } from "@/components/admin/AdminRealtime";
import { Toaster } from "@/components/ui/sonner";
import { ensurePlatformAdminSession } from "@/lib/admin-session-gate";

export const Route = createFileRoute("/_admin")({
  beforeLoad: async () => {
    await ensurePlatformAdminSession();
  },
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <>
      <AdminRealtime />
      <div className="min-h-screen flex bg-background text-foreground">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar />
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
          <footer className="shrink-0 border-t border-border px-6 py-4 lg:px-8">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} ScopsK. All rights reserved.
            </p>
          </footer>
        </div>
      </div>
      <Toaster position="top-right" richColors closeButton />
    </>
  );
}
