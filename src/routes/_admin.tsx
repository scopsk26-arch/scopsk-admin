import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Sidebar } from "@/components/admin/Sidebar";
import { Topbar } from "@/components/admin/Topbar";
import { ThemeProvider } from "@/components/admin/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/_admin")({
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
