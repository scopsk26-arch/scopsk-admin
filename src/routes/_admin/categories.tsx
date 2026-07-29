import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { GenericJsonDetailView } from "@/components/admin/DetailViews";
import { FolderTree } from "lucide-react";
import { fetchCategoryDetail, fetchList } from "@/lib/api/resources";
import { api, num, str } from "@/lib/api/client";
import type { SelectOption } from "@/components/admin/SearchableSelect";

export const Route = createFileRoute("/_admin/categories")({
  head: () => ({ meta: [{ title: "Categories — Prime Plate" }] }),
  component: CategoriesPage,
});

type CategoryRow = {
  id: string;
  name: string;
  parent: string;
  parentId: string;
  path: string;
  depth: number;
  products: number;
  suppliers: number;
  status: string;
};

function mapCategoryRow(r: any, byId?: Map<string, any>): CategoryRow {
  const parentId = str(r.parentId ?? r.parent?.id, "");
  const parentName = str(
    r.parent?.name ?? (parentId && byId?.get(parentId)?.name) ?? "",
    "—",
  );
  let path = str(r.name, "—");
  let depth = 0;
  if (byId && parentId) {
    const parts: string[] = [str(r.name, "—")];
    let cursor = parentId;
    const seen = new Set<string>();
    while (cursor && !seen.has(cursor)) {
      seen.add(cursor);
      const p = byId.get(cursor);
      if (!p) break;
      parts.unshift(str(p.name, "—"));
      depth += 1;
      cursor = str(p.parentId ?? p.parent?.id, "");
    }
    path = parts.join(" › ");
  } else if (parentName && parentName !== "—") {
    path = `${parentName} › ${str(r.name, "—")}`;
    depth = 1;
  }
  return {
    id: str(r.id),
    name: str(r.name, "—"),
    parent: parentName,
    parentId,
    path,
    depth,
    products: num(r.productsCount ?? r.metadata?.products),
    suppliers: num(r.metadata?.suppliers),
    status: str(r.status, "active"),
  };
}

function toCategoryPayload(data: Record<string, any>) {
  const parentId = data.parentId && String(data.parentId).trim() ? String(data.parentId) : null;
  return {
    name: String(data.name || "").trim(),
    parentId,
    status: data.status || "active",
  };
}

function CategoriesPage() {
  const qc = useQueryClient();

  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["catalog", "categories"],
    staleTime: 60_000,
    queryFn: async () => {
      const list = await fetchList("/catalog/categories");
      const byId = new Map(list.map((r: any) => [str(r.id), r]));
      return list
        .map((r) => mapCategoryRow(r, byId))
        .sort((a, b) => a.path.localeCompare(b.path) || a.name.localeCompare(b.name));
    },
  });

  // Parent dropdown: show category names (path), values stay UUIDs for the API.
  const parentOptions: SelectOption[] = useMemo(
    () =>
      rows
        .filter((r) => r.id && r.name && r.name !== "—")
        .map((r) => ({
          value: r.id,
          label: r.path && r.path !== r.name ? r.path : r.name,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [rows],
  );

  const top = rows.filter((r) => !r.parentId || r.parent === "—" || !r.parent).length;
  const nested = rows.filter((r) => r.depth > 0).length;

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["catalog", "categories"] });
    await qc.invalidateQueries({ queryKey: ["lookups", "categories"] });
  };

  return (
    <DataPage
      title="Category Management"
      description="Hierarchy-friendly categories with parent path, products and supplier coverage."
      icon={<FolderTree className="h-5 w-5 text-primary" />}
      entityName="Category"
      idKey="id"
      formFields={[
        { key: "name", label: "Category", type: "text", placeholder: "e.g. Fresh Produce" },
        {
          key: "parentId",
          label: "Parent category",
          type: "searchable",
          selectOptions: parentOptions,
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
      lookups={{ parent: parentOptions, parentId: parentOptions }}
      viewFields={[
        { key: "name", label: "Category" },
        { key: "path", label: "Path" },
        { key: "parent", label: "Parent" },
        { key: "depth", label: "Depth" },
        { key: "products", label: "Products" },
        { key: "suppliers", label: "Suppliers" },
        { key: "status", label: "Status" },
      ]}
      loadDetail={async (row) => {
        try {
          return await fetchCategoryDetail(row.id);
        } catch {
          return row;
        }
      }}
      renderView={(detail) => <GenericJsonDetailView detail={detail} />}
      kpis={[
        { label: "Top-level", value: String(top) },
        { label: "Nested", value: String(nested), tone: "info" },
        { label: "Total", value: String(rows.length) },
        { label: "Active", value: String(rows.filter((r) => r.status === "active").length), tone: "success" },
      ]}
      rows={rows}
      searchKeys={["name", "parent", "path", "id"]}
      emptyHint={isLoading ? "Loading…" : isError ? "Failed to load categories." : "No categories found."}
      columns={[
        { key: "id", label: "ID", className: "font-mono text-xs", render: (r) => String(r.id).slice(0, 8) },
        {
          key: "name",
          label: "Category",
          render: (r) => (
            <span className="font-medium" style={{ paddingLeft: `${Math.min(r.depth, 4) * 12}px` }}>
              {r.depth > 0 ? "↳ " : ""}{r.name}
            </span>
          ),
        },
        { key: "path", label: "Path", className: "text-muted-foreground text-xs" },
        {
          key: "parent",
          label: "Parent",
          render: (r) => {
            const label = parentOptions.find((o) => o.value === r.parentId)?.label ?? r.parent;
            return label && label !== "—" ? label : "—";
          },
        },
        { key: "products", label: "Products" },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
      onCreate={async (data) => {
        const payload = toCategoryPayload(data);
        if (!payload.name) throw new Error("Category name is required");
        const created = await api.post<any>("/catalog/categories", payload);
        await invalidate();
        return mapCategoryRow(created);
      }}
      onUpdate={async (id, data) => {
        const payload = toCategoryPayload(data);
        if (!payload.name) throw new Error("Category name is required");
        const updated = await api.patch<any>(`/catalog/categories/${id}`, payload);
        await invalidate();
        return mapCategoryRow(updated);
      }}
      onDelete={async (id) => {
        await api.delete(`/catalog/categories/${id}`);
        await invalidate();
      }}
    />
  );
}
