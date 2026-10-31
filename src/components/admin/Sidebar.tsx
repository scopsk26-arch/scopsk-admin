import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { groupedNav } from "./nav-config";
import { cn } from "@/lib/utils";
import { BrandLogo } from "./BrandLogo";
import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";

const COLLAPSED_KEY = "scopsk-admin-sidebar-collapsed";

function NavBody({
  onNavigate,
  collapsed = false,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className={cn("flex-1 overflow-y-auto scrollbar-thin py-4 space-y-5", collapsed ? "px-2" : "px-3")}>
      {Object.entries(groupedNav).map(([group, items]) => (
        <div key={group}>
          {collapsed ? null : <div className="px-2.5 mb-1.5 label-caps">{group}</div>}
          <ul className="space-y-0.5">
            {items.map((item) => {
              const active = pathname === item.to || pathname.startsWith(item.to + "/");
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={onNavigate}
                    title={item.title}
                    aria-label={item.title}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-lg py-2 text-sm transition-colors relative",
                      collapsed ? "justify-center px-2" : "px-2.5",
                      active
                        ? "bg-primary/12 text-foreground font-semibold shadow-soft"
                        : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    {active && !collapsed && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-primary" />
                    )}
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                      )}
                    />
                    {collapsed ? null : <span className="flex-1 truncate">{item.title}</span>}
                    {!collapsed && item.badge && (
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded-md font-semibold",
                          item.badge === "live"
                            ? "bg-success/15 text-success"
                            : "bg-primary/15 text-primary",
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSED_KEY) === "1");
  }, []);

  const toggle = () => {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
      return next;
    });
  };

  return (
    <aside
      className={cn(
        "hidden lg:flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width]",
        collapsed ? "w-[4.5rem]" : "w-64",
      )}
    >
      <div className={cn("flex items-center h-16 border-b border-sidebar-border", collapsed ? "justify-center px-2" : "gap-3 px-4")}>
        {collapsed ? (
          <BrandLogo className="h-9 w-11 max-w-none object-contain object-center" />
        ) : (
          <>
            <BrandLogo className="h-11 max-w-[140px]" />
            <span className="label-caps shrink-0 text-muted-foreground">Admin</span>
            <button
              type="button"
              onClick={toggle}
              className="ml-auto h-8 w-8 grid place-items-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              aria-label="Show icons only"
              title="Show icons only"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
      {collapsed ? (
        <button
          type="button"
          onClick={toggle}
          className="mx-auto mt-3 h-8 w-8 grid place-items-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
          aria-label="Show menu labels"
          title="Show menu labels"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      ) : null}
      <NavBody collapsed={collapsed} />
    </aside>
  );
}

/** Mobile / tablet drawer used from Topbar hamburger. */
export function MobileNavDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="lg:hidden fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close navigation"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <aside className="absolute left-0 top-0 bottom-0 w-[min(18rem,88vw)] flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xl">
        <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
          <BrandLogo className="h-11 max-w-[140px]" />
          <span className="label-caps shrink-0 text-muted-foreground">Admin</span>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto h-8 w-8 grid place-items-center rounded-lg hover:bg-sidebar-accent"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <NavBody onNavigate={onClose} />
      </aside>
    </div>
  );
}
