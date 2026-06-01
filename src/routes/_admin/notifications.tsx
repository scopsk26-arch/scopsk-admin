import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/admin/StubPage";
import { Bell } from "lucide-react";

export const Route = createFileRoute("/_admin/notifications")({
  head: () => ({ meta: [{ title: "Notification Center — Prime Plate" }] }),
  component: () => (
    <StubPage
      title="Notification Center"
      description="Centralized hub for push, email, SMS and in-app notifications with templates and automation."
      icon={<Bell className="h-5 w-5 text-primary" />}
      features={["Templates & triggers", "Channel routing", "Automation rules", ]}
    />
  ),
});
