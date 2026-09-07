import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

export function KpiCard({
  label, value, delta, icon, to, accent = "primary",
}: {
  label: string;
  value: string;
  delta?: number;
  icon: ReactNode;
  to: string;
  accent?: "primary" | "accent" | "success" | "warning" | "info" | "destructive";
}) {
  const positive = (delta ?? 0) >= 0;
  return (
    <Link
      to={to}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-soft hover:shadow-elevated transition-all hover:-translate-y-0.5"
    >
      <div className={cn(
        "absolute -top-12 -right-12 h-32 w-32 rounded-full blur-2xl opacity-60 group-hover:opacity-90 transition-opacity",
        accent === "primary" && "bg-primary/20",
        accent === "accent" && "bg-accent/25",
        accent === "success" && "bg-success/20",
        accent === "warning" && "bg-warning/25",
        accent === "info" && "bg-info/20",
        accent === "destructive" && "bg-destructive/20",
      )} />
      <div className="relative flex items-center justify-between">
        <div className={cn(
          "h-10 w-10 rounded-xl grid place-items-center",
          accent === "primary" && "bg-primary/12 text-primary",
          accent === "accent" && "bg-accent/20 text-foreground",
          accent === "success" && "bg-success/15 text-success",
          accent === "warning" && "bg-warning/20 text-warning",
          accent === "info" && "bg-info/15 text-info",
          accent === "destructive" && "bg-destructive/15 text-destructive",
        )}>
          {icon}
        </div>
        {delta !== undefined && (
          <div className={cn(
            "flex items-center gap-0.5 text-xs font-medium rounded-md px-1.5 py-0.5",
            positive ? "bg-success/12 text-success" : "bg-destructive/12 text-destructive"
          )}>
            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta)}%
          </div>
        )}
      </div>
      <div className="relative mt-4">
        <div className="text-2xl font-display font-semibold tracking-tight">{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
      </div>
    </Link>
  );
}
