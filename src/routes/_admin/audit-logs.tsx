import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/admin/StubPage";
import { ScrollText } from "lucide-react";

export const Route = createFileRoute("/_admin/audit-logs")({
  head: () => ({ meta: [{ title: "Audit Logs — Prime Plate" }] }),
  component: () => (
    <StubPage
      title="Audit Logs"
      description="Track every user, admin, AI and system action with advanced filters and full timeline view."
      icon={<ScrollText className="h-5 w-5 text-primary" />}
      features={["User / admin / AI / system actions", "Advanced filters", "Full timeline view", ]}
    />
  ),
});
