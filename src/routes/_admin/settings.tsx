import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/admin/StubPage";
import { Settings } from "lucide-react";

export const Route = createFileRoute("/_admin/settings")({
  head: () => ({ meta: [{ title: "Settings — Prime Plate" }] }),
  component: () => (
    <StubPage
      title="Settings"
      description="General, marketplace, commission, tax, currency, notification and localization settings."
      icon={<Settings className="h-5 w-5 text-primary" />}
      features={["Tax & currency", "Email & SMS templates", "API keys & integrations", ]}
    />
  ),
});
