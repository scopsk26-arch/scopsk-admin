import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { FolderTree } from "lucide-react";
import { fetchList } from "@/lib/api/resources";
import { num, str } from "@/lib/api/client";
import { useAdminLookups } from "@/hooks/useAdminLookups";

export const Route = createFileRoute("/_admin/categories")({
  head: () => ({ meta: [{ title: "Categories — Prime Plate" }] }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const { categories: categoryOptions } = useAdminLookups();

  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["catalog", "categories"],
    queryFn: async () => {
      const list = await fetchList("/catalog/categories");
      return list.map((r: any) => ({
        id: str(r.id),
        name: str(r.name, "—"),
        parent: str(r.parent?.name ?? "", "—"),
        parentId: str(r.parentId ?? r.parent?.id, ""),
        products: num(r.productsCount ?? r.metadata?.products),
        suppliers: num(r.metadata?.suppliers),
        status: str(r.status, "active"),
      }));
    },
  });

  const top = rows.filter((r) => !r.parentId || r.parent === "—" || !r.parent).length;

  return (
    <DataPage
      title="Category Management"
      description="Nested categories with products and supplier coverage."
      icon={<FolderTree className="h-5 w-5 text-primary" />}
      entityName="Category"
      formFields={[
        { key: "name", label: "Category", type: "text", placeholder: "e.g. Fresh Produce" },
        {
          key: "parentId",
          label: "Parent category",
          type: "searchable",
          selectOptions: categoryOptions,
          placeholder: "None (top-level)",
          allowClear: true,
        },
        {
          key: "status",
          label: "Status",
          type: "select",
          options: ["active", "inactive", "draft", "archived"],
        },
      ]}
      lookups={{ parent: categoryOptions, parentId: categoryOptions }}
      kpis={[
        { label: "Top-level", value: String(top) },
        { label: "Total", value: String(rows.length) },
        { label: "Products", value: String(rows.reduce((s, r) => s + r.products, 0)) },
        { label: "Active", value: String(rows.filter((r) => r.status === "active").length), tone: "success" },
      ]}
      rows={rows}
      searchKeys={["name", "parent", "id"]}
      emptyHint={isLoading ? "Loading…" : isError ? "Failed to load categories." : "No categories found."}
      columns={[
        { key: "id", label: "ID", className: "font-mono text-xs", render: (r) => String(r.id).slice(0, 8) },
        { key: "name", label: "Category", render: (r) => <span className="font-medium">{r.name}</span> },
        {
          key: "parent",
          label: "Parent",
          render: (r) => {
            const label = categoryOptions.find((o) => o.value === r.parentId)?.label ?? r.parent;
            return label && label !== "—" ? label : "—";
          },
        },
        { key: "products", label: "Products" },
        { key: "suppliers", label: "Suppliers" },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  );
}
