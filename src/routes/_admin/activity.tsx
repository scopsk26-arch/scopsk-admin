import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/admin/StubPage";
import { Activity } from "lucide-react";

export const Route = createFileRoute("/_admin/activity")({
  head: () => ({ meta: [{ title: "Activity Feed — Prime Plate" }] }),
  component: () => (
    <StubPage
      title="Activity Feed"
      description="Real-time marketplace activity stream across RFQs, quotations, orders, deliveries and payments."
      icon={<Activity className="h-5 w-5 text-primary" />}
      features={["Live event stream", "Filter by event type", "Drill-down to source", "Pause / resume firehose", ]}
    />
  ),
});
