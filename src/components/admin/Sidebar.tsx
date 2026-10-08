import { Link, useRouterState } from "@tanstack/react-router";
import { groupedNav } from "./nav-config";
import { cn } from "@/lib/utils";
import { BrandLogo } from "./BrandLogo";
import { X } from "lucide-react";

function NavBody({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-5">
      {Object.entries(groupedNav).map(([group, items]) => (
        <div key={group}>
          <div className="px-2.5 mb-1.5 label-caps">{group}</div>
          <ul className="space-y-0.5">
            {items.map((item) => {
              const active = pathname === item.to || pathname.startsWith(item.to + "/");
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={onNavigate}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors relative",
                      active
                        ? "bg-primary/12 text-foreground font-medium shadow-soft"
                        : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-primary" />
                    )}
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                      )}
                    />
                    <span className="flex-1 truncate">{item.title}</span>
                    {item.badge && (
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
  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
        <BrandLogo className="h-11 max-w-[168px]" />
        <span className="label-caps shrink-0 text-muted-foreground">Admin</span>
      </div>
      <NavBody />
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
