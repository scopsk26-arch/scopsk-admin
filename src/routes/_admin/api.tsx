import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/admin/StubPage";
import { Code2 } from "lucide-react";

export const Route = createFileRoute("/_admin/api")({
  head: () => ({ meta: [{ title: "API Management — Prime Plate" }] }),
  component: () => (
    <StubPage
      title="API Management"
      description="API keys, rate limits, webhooks, logs and live monitoring for partner integrations."
      icon={<Code2 className="h-5 w-5 text-primary" />}
      features={["API keys & scopes", "Webhooks & retries", "Live logs", ]}
    />
  ),
});
