import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/admin/StubPage";
import { Megaphone } from "lucide-react";

export const Route = createFileRoute("/_admin/marketing")({
  head: () => ({ meta: [{ title: "Marketing — Prime Plate" }] }),
  component: () => (
    <StubPage
      title="Marketing"
      description="Campaign management across email, push and SMS with open / click / conversion analytics."
      icon={<Megaphone className="h-5 w-5 text-primary" />}
      features={["Campaign builder", "Channel mix", "Conversion analytics", ]}
    />
  ),
});
