import { Bell, Search, Moon, Sun, Command as CommandIcon, ChevronDown, Menu } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { useRouterState, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { CommandPalette } from "./CommandPalette";
import { MobileNavDrawer } from "./Sidebar";
import { useEffect, useState } from "react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/lib/api/auth";
import { getSessionUser } from "@/lib/auth-session";

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

function useBreadcrumbs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const parts = pathname.split("/").filter(Boolean);
  return parts.map((p, i) => ({
    label: p.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    to: "/" + parts.slice(0, i + 1).join("/"),
  }));
}

export function Topbar() {
  const { theme, toggle } = useTheme();
  const crumbs = useBreadcrumbs();
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const user = getSessionUser();
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
    await logout();
    navigate({ to: "/login" });
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

            <Button
              variant="ghost"
              size="icon"
              className="relative"
              aria-label="Notifications"
              onClick={() => navigate({ to: "/notifications" })}
            >
              <Bell className="h-4 w-4" />
            </Button>

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
                <DropdownMenuItem asChild><Link to="/roles">Roles & Permissions</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/audit-logs">My Activity</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); void onSignOut(); }}>
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <MobileNavDrawer open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
    </>
  );
}
