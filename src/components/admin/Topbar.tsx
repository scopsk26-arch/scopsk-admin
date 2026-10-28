import { Bell, Search, Moon, Sun, Command as CommandIcon, ChevronDown, Menu } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { useRouterState, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CommandPalette } from "./CommandPalette";
import { MobileNavDrawer } from "./Sidebar";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/lib/api/auth";
import { getSessionUser, subscribeSession } from "@/lib/auth-session";
import { navItems } from "./nav-config";
import { api, str } from "@/lib/api/client";
import { notificationNavTarget, notificationPayload } from "@/lib/notification-nav";
import { cn } from "@/lib/utils";

const PLATFORM_ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  operations_admin: "Operations Admin",
  finance_admin: "Finance Admin",
  auditor: "Auditor",
  kyc_officer: "KYC Officer",
  support_agent: "Support Agent",
  marketing: "Marketing",
};

function platformRoleLabel(user: ReturnType<typeof getSessionUser>): string {
  const roles = Array.isArray(user?.roles) ? (user!.roles as Array<Record<string, unknown>>) : [];
  const slugs = roles
    .map((r) => String(r.slug || r.role || r.name || "").toLowerCase())
    .filter(Boolean);
  const hit = slugs.find((s) => s in PLATFORM_ROLE_LABELS);
  if (hit) return PLATFORM_ROLE_LABELS[hit];
  const extra = user?.roleSlugs;
  if (Array.isArray(extra)) {
    const fromUser = extra.map((s) => String(s).toLowerCase()).find((s) => s in PLATFORM_ROLE_LABELS);
    if (fromUser) return PLATFORM_ROLE_LABELS[fromUser];
  }
  return "Platform Admin";
}

function crumbLabel(path: string, slug: string) {
  const fromNav = navItems.find((item) => item.to === path);
  if (fromNav) return fromNav.title;
  if (path === "/kyc") return "KYC Documents";
  if (path === "/restaurant-approvals") return "Account review";
  if (path === "/notifications") return "Notifications";
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function useBreadcrumbs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const parts = pathname.split("/").filter(Boolean);
  return parts.map((p, i) => {
    const to = "/" + parts.slice(0, i + 1).join("/");
    return { label: crumbLabel(to, p), to };
  });
}

export function Topbar() {
  const { theme, toggle } = useTheme();
  const crumbs = useBreadcrumbs();
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const user = useSyncExternalStore(subscribeSession, getSessionUser, () => null);
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "User";
  const initials = displayName.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "SA";
  const roleLabel = platformRoleLabel(user);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onSignOut = async () => {
    setSigningOut(true);
    try {
      await logout();
      navigate({ to: "/login" });
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 h-16 border-b border-border bg-card/95 backdrop-blur-md supports-[backdrop-filter]:bg-card/85">
        <div className="h-full px-4 lg:px-6 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden shrink-0"
            aria-label="Open navigation"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <nav className="hidden md:flex items-center gap-1.5 text-sm font-sans min-w-0">
            {crumbs.length === 0 && <span className="text-muted-foreground">Home</span>}
            {crumbs.map((c, i) => (
              <span key={c.to} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-muted-foreground/40">/</span>}
                <Link
                  to={c.to}
                  className={i === crumbs.length - 1 ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}
                >
                  {c.label}
                </Link>
              </span>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setPaletteOpen(true)}
              className="hidden sm:flex items-center gap-2 text-sm h-9 px-3 rounded-lg border border-border bg-muted/50 hover:bg-muted text-muted-foreground transition-colors w-72 shadow-soft"
            >
              <Search className="h-4 w-4" />
              <span className="flex-1 text-left">Search anything…</span>
              <kbd className="text-[10px] font-mono bg-card border border-border px-1.5 py-0.5 rounded-md">⌘K</kbd>
            </button>

            <Button variant="ghost" size="icon" onClick={() => setPaletteOpen(true)} className="sm:hidden">
              <CommandIcon className="h-4 w-4" />
            </Button>

            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <NotificationBell />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 h-9 pl-1 pr-2 rounded-lg hover:bg-muted transition-colors">
                  <div className="h-7 w-7 rounded-lg bg-primary grid place-items-center text-primary-foreground text-xs font-semibold shadow-soft">
                    {initials}
                  </div>
                  <div className="hidden md:flex flex-col items-start leading-tight">
                    <span className="text-xs font-medium">{displayName}</span>
                    <span className="text-[10px] text-muted-foreground">{roleLabel}</span>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link to="/settings">Profile & Settings</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/audit-logs">My Activity</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setSignOutOpen(true)}>
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <MobileNavDrawer open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <AlertDialog open={signOutOpen} onOpenChange={(open) => { if (!signingOut) setSignOutOpen(open); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={signingOut}>No</AlertDialogCancel>
            <AlertDialogAction disabled={signingOut} onClick={(e) => { e.preventDefault(); void onSignOut(); }}>
              {signingOut ? "Signing out…" : "Yes"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function NotificationBell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const list = useQuery({
    queryKey: ["notifications", "topbar"],
    queryFn: async () => {
      const { data } = await api.getEnvelope<any[]>("/notifications", {
        query: { page: 1, limit: 8 },
      });
      const rows = Array.isArray(data) ? data : [];
      return {
        rows: rows.map((r) => {
          const payload = notificationPayload(r.data);
          const read = Boolean(r.readAt ?? r.read ?? r.isRead) || r.status === "read";
          return {
            id: str(r.id),
            title: str(r.title, "Notification"),
            body: str(r.body ?? r.message, ""),
            read,
            data: payload,
          };
        }),
        unread: rows.filter((r) => !(r.readAt ?? r.read ?? r.isRead) && r.status !== "read").length,
      };
    },
    refetchInterval: 60_000,
  });
  const unread = list.data?.unread ?? 0;
  const items = list.data?.rows ?? [];

  const openItem = (item: (typeof items)[number]) => {
    if (!item.read) {
      void api
        .post(`/notifications/${item.id}/read`)
        .finally(() => {
          void queryClient.invalidateQueries({ queryKey: ["notifications"] });
        });
    }
    const target = notificationNavTarget(item);
    if (target) {
      void navigate({ to: target.to, search: target.search ?? {} });
      return;
    }
    void navigate({ to: "/notifications" });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unread > 0 ? (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="flex items-center justify-between px-3 py-2">
          <span>Notifications</span>
          {unread > 0 ? (
            <span className="text-[10px] font-medium text-muted-foreground">{unread} unread</span>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0" />
        {items.length === 0 ? (
          <div className="px-3 py-6 text-sm text-muted-foreground">No notifications yet.</div>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn(
                "w-full text-left px-3 py-2.5 hover:bg-muted/70 border-b border-border last:border-0",
                !item.read && "bg-muted/40",
              )}
              onClick={() => openItem(item)}
            >
              <div className={cn("text-sm", item.read ? "text-muted-foreground" : "font-medium")}>
                {item.title}
              </div>
              {item.body ? (
                <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{item.body}</div>
              ) : null}
            </button>
          ))
        )}
        <DropdownMenuSeparator className="m-0" />
        <DropdownMenuItem
          className="justify-center text-xs"
          onSelect={() => navigate({ to: "/notifications" })}
        >
          View all
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
