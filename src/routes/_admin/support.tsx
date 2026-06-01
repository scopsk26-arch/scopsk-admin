import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/admin/StubPage";
import { LifeBuoy } from "lucide-react";

export const Route = createFileRoute("/_admin/support")({
  head: () => ({ meta: [{ title: "Support Center — Prime Plate" }] }),
  component: () => (
    <StubPage
      title="Support Center"
      description="Ticketing system for restaurant and supplier issues with SLA tracking and escalations."
      icon={<LifeBuoy className="h-5 w-5 text-primary" />}
      features={["Ticket pipeline", "SLA tracking", "Internal notes & escalations", ]}
    />
  ),
});
