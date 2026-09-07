import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { GenericJsonDetailView } from "@/components/admin/DetailViews";
import { UtensilsCrossed } from "lucide-react";
import { fetchList } from "@/lib/api/resources";
import { api, num, str } from "@/lib/api/client";
import { useAdminLookups } from "@/hooks/useAdminLookups";
import type { SelectOption } from "@/components/admin/SearchableSelect";

export const Route = createFileRoute("/_admin/cuisines")({
  head: () => ({ meta: [{ title: "Cuisines — ResPy" }] }),
  component: CuisinesPage,
});

type CuisineRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
  status: string;
  categories: string;
  categoryIds: string;
  products: number;
};

function mapCuisineRow(r: any): CuisineRow {
  const cats = Array.isArray(r.categories) ? r.categories : [];
  return {
    id: str(r.id),
    name: str(r.name, "—"),
    slug: str(r.slug, ""),
    description: str(r.description, ""),
    sortOrder: num(r.sortOrder),
    status: str(r.status, "active"),
    categories: cats.map((c: any) => str(c.name ?? c, "")).filter(Boolean).join(", ") || "—",
    categoryIds: cats.map((c: any) => str(c.id ?? c)).filter(Boolean).join(", "),
    products: Array.isArray(r.products) ? r.products.length : num(r.productsCount),
  };
}

function resolveCategoryIds(raw: unknown, options: SelectOption[]): string[] {
  if (Array.isArray(raw)) {
    return raw.map(String).filter(Boolean);
  }
  return String(raw ?? "")
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((token) => {
      const byId = options.find((o) => o.value === token);
      if (byId) return byId.value;
      const byLabel = options.find((o) => o.label.toLowerCase() === token.toLowerCase());
      return byLabel?.value ?? token;
    })
    .filter((id) => options.some((o) => o.value === id));
}

function CuisinesPage() {
  const qc = useQueryClient();
  const { categories } = useAdminLookups(["categories"]);

  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["cuisines"],
    queryFn: async () => {
      const list = await fetchList("/cuisines", { all: "true", limit: 200 });
      return list.map(mapCuisineRow);
    },
  });

  const active = rows.filter((r) => r.status === "active").length;
  const mapped = rows.filter((r) => r.categoryIds).length;

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["cuisines"] });
  };

  return (
    <DataPage
      title="Cuisines"
      description="Cuisine types with category mappings used for restaurant catalog filtering."
      icon={<UtensilsCrossed className="h-5 w-5 text-primary" />}
      entityName="Cuisine"
      idKey="id"
      formFields={[
        { key: "name", label: "Name", type: "text", placeholder: "e.g. Italian" },
        { key: "slug", label: "Slug", type: "text", placeholder: "optional" },
        { key: "description", label: "Description", type: "text" },
        { key: "sortOrder", label: "Sort order", type: "number" },
        {
          key: "categoryIds",
          label: "Categories",
          type: "multiselect",
          placeholder: "Select one or more categories…",
        },
        {
          key: "status",
          label: "Status",
          type: "select",
          options: ["active", "inactive"],
        },
      ]}
      lookups={{ categoryIds: categories, categories }}
      viewFields={[
        { key: "name", label: "Cuisine" },
        { key: "slug", label: "Slug" },
        { key: "description", label: "Description" },
        { key: "categories", label: "Categories" },
        { key: "products", label: "Products" },
        { key: "sortOrder", label: "Sort order" },
        { key: "status", label: "Status" },
      ]}
      loadDetail={async (row) => row}
      renderView={(detail) => <GenericJsonDetailView detail={detail} />}
      kpis={[
        { label: "Total", value: String(rows.length) },
        { label: "Active", value: String(active), tone: "success" },
        { label: "With categories", value: String(mapped), tone: "info" },
        { label: "Products linked", value: String(rows.reduce((s, r) => s + r.products, 0)) },
      ]}
      rows={rows}
      searchKeys={["name", "slug", "categories", "id"]}
      emptyHint={isLoading ? "Loading…" : isError ? "Failed to load cuisines." : "No cuisines found."}
      columns={[
        { key: "id", label: "ID", className: "font-mono text-xs", render: (r) => String(r.id).slice(0, 8) },
        { key: "name", label: "Cuisine", render: (r) => <span className="font-medium">{r.name}</span> },
        { key: "slug", label: "Slug", className: "font-mono text-xs" },
        { key: "categories", label: "Categories" },
        { key: "products", label: "Products" },
        { key: "sortOrder", label: "Order" },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
      onCreate={async (data) => {
        const name = String(data.name || "").trim();
        if (!name) throw new Error("Cuisine name is required");
        const categoryIds = resolveCategoryIds(data.categoryIds ?? data.categories, categories);
        const created = await api.post<any>("/cuisines", {
          name,
          slug: data.slug ? String(data.slug).trim() : undefined,
          description: data.description ? String(data.description) : undefined,
          sortOrder: data.sortOrder != null ? Number(data.sortOrder) : 0,
          status: data.status || "active",
          categoryIds,
        });
        await invalidate();
        return mapCuisineRow(created);
      }}
      onUpdate={async (id, data) => {
        const name = String(data.name || "").trim();
        if (!name) throw new Error("Cuisine name is required");
        const categoryIds = resolveCategoryIds(data.categoryIds ?? data.categories, categories);
        const updated = await api.patch<any>(`/cuisines/${id}`, {
          name,
          slug: data.slug ? String(data.slug).trim() : undefined,
          description: data.description != null ? String(data.description) : undefined,
          sortOrder: data.sortOrder != null ? Number(data.sortOrder) : undefined,
          status: data.status || "active",
          categoryIds,
        });
        await invalidate();
        return mapCuisineRow(updated);
      }}
      onDelete={async (id) => {
        await api.delete(`/cuisines/${id}`);
        await invalidate();
      }}
    />
  );
}
