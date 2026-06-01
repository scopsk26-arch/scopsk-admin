import { Construction, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

export function StubPage({
  title,
  description,
  features = [],
  icon,
}: {
  title: string;
  description: string;
  features?: string[];
  icon?: ReactNode;
}) {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-soft">
        <div className="absolute inset-0 mesh-bg opacity-60 pointer-events-none" />
        <div className="relative max-w-2xl">
          <div className="h-12 w-12 rounded-xl glass grid place-items-center mb-4">
            {icon ?? <Construction className="h-5 w-5 text-primary" />}
          </div>
          <h2 className="font-display text-xl font-semibold">Coming in the next build pass</h2>
          <p className="text-sm text-muted-foreground mt-2">
            This module is fully scaffolded and routed. The interactive table, detail pages, and CRUD flows
            will be implemented in upcoming turns of this multi-turn build.
          </p>

          {features.length > 0 && (
            <ul className="mt-5 grid sm:grid-cols-2 gap-2">
              {features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {f}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 flex gap-2">
            <Button asChild>
              <Link to="/dashboard">
                Back to Dashboard <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/activity">View Live Activity</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
