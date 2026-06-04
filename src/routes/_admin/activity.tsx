import { createFileRoute } from "@tanstack/react-router";
import { activityFeed } from "@/lib/mock-data-extra";
import { Activity, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_admin/activity")({
  head: () => ({ meta: [{ title: "Activity Feed — Prime Plate" }] }),
  component: ActivityPage,
});

function ActivityPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-xl glass grid place-items-center">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-display font-semibold tracking-tight">Activity Feed</h1>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium bg-success/15 text-success">live</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Real-time event stream across the entire marketplace.</p>
          </div>
        </div>
        <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-1.5" />Filter events</Button>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-soft p-2">
        <ul>
          {activityFeed.map((e, i) => (
            <li key={e.id} className="flex items-start gap-4 px-4 py-3.5 border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
              <div className="relative mt-1.5">
                <span className="h-2 w-2 rounded-full bg-primary block" />
                {i < activityFeed.length - 1 && <span className="absolute left-1/2 top-3 -translate-x-1/2 h-12 w-px bg-border" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm">
                  <span className="font-medium">{e.actor}</span>{" "}
                  <span className="text-muted-foreground">{e.text}</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">{e.type}</span>
                  <span>•</span>
                  <span>{e.time}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
