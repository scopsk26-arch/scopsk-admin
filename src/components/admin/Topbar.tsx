import { Bell, Search, Moon, Sun, Command as CommandIcon, ChevronDown } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { useRouterState, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { CommandPalette } from "./CommandPalette";
import { useEffect, useState } from "react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const [paletteOpen, setPaletteOpen] = useState(false);

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

  return (
    <>
      <header className="sticky top-0 z-30 h-16 border-b border-border glass-strong">
        <div className="h-full px-4 lg:px-6 flex items-center gap-4">
          <nav className="hidden md:flex items-center gap-1.5 text-sm">
            {crumbs.length === 0 && <span className="text-muted-foreground">Home</span>}
            {crumbs.map((c, i) => (
              <span key={c.to} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-muted-foreground/40">/</span>}
                <Link
                  to={c.to}
                  className={i === crumbs.length - 1 ? "font-medium" : "text-muted-foreground hover:text-foreground"}
                >
                  {c.label}
                </Link>
              </span>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setPaletteOpen(true)}
              className="hidden sm:flex items-center gap-2 text-sm h-9 px-3 rounded-lg border border-border bg-muted/40 hover:bg-muted text-muted-foreground transition-colors w-72"
            >
              <Search className="h-4 w-4" />
              <span className="flex-1 text-left">Search anything…</span>
              <kbd className="text-[10px] font-mono bg-background border border-border px-1.5 py-0.5 rounded">⌘K</kbd>
            </button>

            <Button variant="ghost" size="icon" onClick={() => setPaletteOpen(true)} className="sm:hidden">
              <CommandIcon className="h-4 w-4" />
            </Button>

            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-destructive" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 h-9 pl-1 pr-2 rounded-lg hover:bg-muted transition-colors">
                  <div className="h-7 w-7 rounded-md gradient-primary grid place-items-center text-primary-foreground text-xs font-semibold">
                    SA
                  </div>
                  <div className="hidden md:flex flex-col items-start leading-tight">
                    <span className="text-xs font-medium">Sarah Ahmed</span>
                    <span className="text-[10px] text-muted-foreground">Super Admin</span>
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
                <DropdownMenuItem asChild><Link to="/login">Sign out</Link></DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  );
}
