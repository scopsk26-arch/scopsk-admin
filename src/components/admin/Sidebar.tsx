import { Link, useRouterState } from "@tanstack/react-router";
import { groupedNav } from "./nav-config";
import { cn } from "@/lib/utils";
import respyMark from "@/assets/respy-mark.png";

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-sidebar-border">
        <img
          src={respyMark}
          alt="ResPy"
          className="h-9 w-9 rounded-xl object-cover shadow-soft"
        />
        <div className="flex flex-col leading-tight">
          <span className="font-display font-semibold text-sm">ResPy</span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Admin</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-5">
        {Object.entries(groupedNav).map(([group, items]) => (
          <div key={group}>
            <div className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
              {group}
            </div>
            <ul className="space-y-0.5">
              {items.map((item) => {
                const active = pathname === item.to || pathname.startsWith(item.to + "/");
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className={cn(
                        "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors relative",
                        active
                          ? "bg-primary/10 text-foreground font-medium"
                          : "text-sidebar-foreground/75 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
                      )}
                    >
                      {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full bg-primary" />}
                      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                      <span className="flex-1 truncate">{item.title}</span>
                      {item.badge && (
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded-md font-medium",
                          item.badge === "live"
                            ? "bg-success/15 text-success"
                            : "bg-primary/15 text-primary"
                        )}>
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

      {/* AI Copilot sidebar card — hidden for now
      <div className="m-3 rounded-xl p-3 border border-border bg-card shadow-soft relative overflow-hidden">
        <div className="absolute inset-0 mesh-bg opacity-40" />
        <div className="relative flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-primary mt-0.5" />
          <div className="text-xs">
            <div className="font-semibold">AI Copilot</div>
            <div className="text-muted-foreground mt-0.5">Insights powered by ResPy intelligence</div>
          </div>
        </div>
      </div>
      */}
    </aside>
  );
}
