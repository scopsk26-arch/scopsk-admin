import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/admin/StubPage";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_admin/fraud")({
  head: () => ({ meta: [{ title: "Fraud Detection — Prime Plate" }] }),
  component: () => (
    <StubPage
      title="Fraud Detection"
      description="AI-powered fraud monitoring for fake quotations, duplicate suppliers, price manipulation and suspicious bidding."
      icon={<AlertTriangle className="h-5 w-5 text-primary" />}
      features={["Flag types", "Investigate / suspend", "Risk scoring", ]}
    />
  ),
});
