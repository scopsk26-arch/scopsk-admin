import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/admin/StubPage";
import { FolderTree } from "lucide-react";

export const Route = createFileRoute("/_admin/categories")({
  head: () => ({ meta: [{ title: "Category Management — Prime Plate" }] }),
  component: () => (
    <StubPage
      title="Category Management"
      description="Nested categories with tree view, drag-and-drop reordering and bulk operations."
      icon={<FolderTree className="h-5 w-5 text-primary" />}
      features={["Tree view", "Drag & drop reorder", "Bulk operations", ]}
    />
  ),
});
