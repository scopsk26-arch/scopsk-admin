import { createFileRoute } from "@tanstack/react-router";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { categories } from "@/lib/mock-data-extra";
import { FolderTree } from "lucide-react";

export const Route = createFileRoute("/_admin/categories")({
  head: () => ({ meta: [{ title: "Categories — Prime Plate" }] }),
  component: () => (
    <DataPage
      title="Category Management"
      description="Nested categories with products and supplier coverage."
      icon={<FolderTree className="h-5 w-5 text-primary" />}
      kpis={[
        { label: "Top-level", value: "8" },
        { label: "Sub-categories", value: "42" },
        { label: "Products", value: "4,820" },
        { label: "Active suppliers", value: "264", tone: "success" },
      ]}
      rows={categories}
      searchKeys={["name", "parent", "id"]}
      columns={[
        { key: "id", label: "ID", className: "font-mono text-xs" },
        { key: "name", label: "Category", render: (r) => <span className="font-medium">{r.name}</span> },
        { key: "parent", label: "Parent" },
        { key: "products", label: "Products" },
        { key: "suppliers", label: "Suppliers" },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  ),
});
