import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/admin/StubPage";
import { FolderOpen } from "lucide-react";

export const Route = createFileRoute("/_admin/files")({
  head: () => ({ meta: [{ title: "File Management — Prime Plate" }] }),
  component: () => (
    <StubPage
      title="File Management"
      description="Supplier documents, restaurant documents, invoices and contracts with previews and version control."
      icon={<FolderOpen className="h-5 w-5 text-primary" />}
      features={["Preview / download", "Version control", "Access logs", ]}
    />
  ),
});
