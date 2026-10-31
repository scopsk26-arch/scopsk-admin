import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { pagedListProps, usePagedList } from "@/hooks/usePagedList";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { GenericJsonDetailView } from "@/components/admin/DetailViews";
import { UtensilsCrossed } from "lucide-react";
import { api, num, str } from "@/lib/api/client";
import { walkPages } from "@/lib/api/resources";
import { useAdminLookups } from "@/hooks/useAdminLookups";
import type { SelectOption } from "@/components/admin/SearchableSelect";

export const Route = createFileRoute("/_admin/cuisines")({
  head: () => ({ meta: [{ title: "Cuisines — ScopsK" }] }),
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
    categories:
      cats
        .map((c: any) => str(c.name ?? c, ""))
        .filter(Boolean)
        .join(", ") || "—",
    categoryIds: cats
      .map((c: any) => str(c.id ?? c))
      .filter(Boolean)
      .join(", "),
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

  const list = usePagedList({
    queryKey: ["cuisines"],
    path: "/cuisines",
    query: { all: "true" },
    map: mapCuisineRow,
  });
  const rows = list.rows;
  const isLoading = list.isLoading;
  const isError = list.isError;

  const summary = useQuery({
    queryKey: ["cuisines", "summary"],
    queryFn: async () => {
      const all = await walkPages("/cuisines", { all: "true" });
      let active = 0;
      let mapped = 0;
      let products = 0;
      for (const row of all.rows) {
        const mappedRow = mapCuisineRow(row);
        if (mappedRow.status === "active") active += 1;
        if (mappedRow.categoryIds) mapped += 1;
        products += mappedRow.products;
      }
      return { active, mapped, products, total: all.total };
    },
    staleTime: 30_000,
  });

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["cuisines"] });
  };

  return (
    <DataPage
      title="Cuisines"
      description="Cuisine types restaurants can choose at signup."
      icon={<UtensilsCrossed className="h-5 w-5 text-primary" />}
      entityName="Cuisine"
      idKey="id"
      formFields={[
        { key: "name", label: "Name", required: true, type: "text", placeholder: "e.g. Italian" },
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
          required: true,
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
        { label: "Total", value: String(summary.data?.total ?? list.total) },
        { label: "Active", value: summary.isLoading ? "…" : String(summary.data?.active ?? 0), tone: "success" },
        { label: "With categories", value: summary.isLoading ? "…" : String(summary.data?.mapped ?? 0), tone: "info" },
        { label: "Products linked", value: summary.isLoading ? "…" : String(summary.data?.products ?? 0) },
      ]}
      rows={rows}
      serverPagination={pagedListProps(list)}
      searchKeys={["name", "slug", "categories", "id"]}
      emptyHint={
        isLoading ? "Loading…" : isError ? "Failed to load cuisines." : "No cuisines found."
      }
      columns={[
        {
          key: "id",
          label: "ID",
          className: "font-mono text-xs",
          render: (r) => String(r.id).slice(0, 8),
        },
        {
          key: "name",
          label: "Cuisine",
          render: (r) => <span className="font-medium">{r.name}</span>,
        },
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
        }, { toastOnSuccess: true });
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
