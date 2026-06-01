import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/admin/StubPage";
import { BookOpen } from "lucide-react";

export const Route = createFileRoute("/_admin/cms")({
  head: () => ({ meta: [{ title: "Content Management — Prime Plate" }] }),
  component: () => (
    <StubPage
      title="Content Management"
      description="Manage landing pages, FAQs, help articles, terms and privacy policy with version history."
      icon={<BookOpen className="h-5 w-5 text-primary" />}
      features={["Full CRUD", "Version history", "Multi-locale", ]}
    />
  ),
});
