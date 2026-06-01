import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/admin/StubPage";
import { Percent } from "lucide-react";

export const Route = createFileRoute("/_admin/commissions")({
  head: () => ({ meta: [{ title: "Commissions — Prime Plate" }] }),
  component: () => (
    <StubPage
      title="Commissions"
      description="Configure fixed, percentage and category-based commissions with a rules engine and simulations."
      icon={<Percent className="h-5 w-5 text-primary" />}
      features={["Rules engine", "Commission simulator", "Per-category overrides", "Analytics", ]}
    />
  ),
});
