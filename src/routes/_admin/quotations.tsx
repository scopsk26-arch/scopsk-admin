import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/admin/StubPage";
import { Quote } from "lucide-react";

export const Route = createFileRoute("/_admin/quotations")({
  head: () => ({ meta: [{ title: "Quotations — Prime Plate" }] }),
  component: () => (
    <StubPage
      title="Quotations"
      description="Quotation monitoring center with AI scoring, approval workflows and flagging."
      icon={<Quote className="h-5 w-5 text-primary" />}
      features={["AI score column", "Approve / reject / flag", "Configurable AI weights", "Risk thresholds", ]}
    />
  ),
});
