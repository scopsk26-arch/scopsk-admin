import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/admin/StubPage";
import { BadgeCheck } from "lucide-react";

export const Route = createFileRoute("/_admin/subscriptions")({
  head: () => ({ meta: [{ title: "Subscriptions — Prime Plate" }] }),
  component: () => (
    <StubPage
      title="Subscriptions"
      description="Manage restaurant and supplier subscription plans with billing analytics."
      icon={<BadgeCheck className="h-5 w-5 text-primary" />}
      features={["Monthly / annual / trial", "Billing analytics", "Plan upgrades", ]}
    />
  ),
});
