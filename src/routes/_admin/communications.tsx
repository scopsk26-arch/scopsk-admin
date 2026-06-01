import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/admin/StubPage";
import { MessageSquare } from "lucide-react";

export const Route = createFileRoute("/_admin/communications")({
  head: () => ({ meta: [{ title: "Communications — Prime Plate" }] }),
  component: () => (
    <StubPage
      title="Communications"
      description="Manage chats, notifications, announcements and broadcast messages across channels."
      icon={<MessageSquare className="h-5 w-5 text-primary" />}
      features={["Push / Email / SMS", "Broadcast composer", "Conversation triage", ]}
    />
  ),
});
