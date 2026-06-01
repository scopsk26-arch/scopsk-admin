import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/admin/StubPage";
import { Brain } from "lucide-react";

export const Route = createFileRoute("/_admin/ai-center")({
  head: () => ({ meta: [{ title: "AI Control Center — Prime Plate" }] }),
  component: () => (
    <StubPage
      title="AI Control Center"
      description="Configure recommendation models, scoring algorithms, supplier ranking and RFQ matching."
      icon={<Brain className="h-5 w-5 text-primary" />}
      features={["Model configuration", "Weight tuning", "Confidence thresholds", "Recommendation history", ]}
    />
  ),
});
