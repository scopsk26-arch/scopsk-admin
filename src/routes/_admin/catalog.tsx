import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/admin/StubPage";
import { Boxes } from "lucide-react";

export const Route = createFileRoute("/_admin/catalog")({
  head: () => ({ meta: [{ title: "Product Catalog — Prime Plate" }] }),
  component: () => (
    <StubPage
      title="Product Catalog"
      description="Manage categories, subcategories, product templates, units and specifications."
      icon={<Boxes className="h-5 w-5 text-primary" />}
      features={["CRUD on templates", "Import / export", "Specifications & units", ]}
    />
  ),
});
