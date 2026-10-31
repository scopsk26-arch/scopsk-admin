import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { pagedListProps, usePagedList } from "@/hooks/usePagedList";
import { DataPage } from "@/components/admin/DataPage";
import { Percent } from "lucide-react";
import {
  deleteCategoryCommission,
  fetchCategoryCommissions,
  upsertCategoryCommission,
} from "@/lib/api/resources";
import { useAdminLookups } from "@/hooks/useAdminLookups";
import { num, str } from "@/lib/api/client";

export const Route = createFileRoute("/_admin/category-commissions")({
  head: () => ({ meta: [{ title: "Category Commissions — ScopsK" }] }),
  component: CategoryCommissionsPage,
});

export function CategoryCommissionsPanel() {
  const qc = useQueryClient();
  const { categories } = useAdminLookups(["categories"]);

  const list = usePagedList({
    queryKey: ["admin", "category-commissions"],
    path: "/admin/category-commissions",
    load: ({ page, pageSize, search, sort }) =>
      fetchCategoryCommissions({
        page,
        limit: pageSize,
        search: search || undefined,
        sortBy: "createdAt",
        sortOrder: sort === "oldest" ? "ASC" : "DESC",
      }),
  });
  const rows = list.rows;
  const isLoading = list.isLoading;
  const isError = list.isError;

  const categoryName = (row: { categoryId?: string; category?: string }) => {
    const fromCatalog = categories.find((c) => c.value === row.categoryId)?.label;
    if (fromCatalog) return fromCatalog;
    const stored = str(row.category, "");
    if (stored && stored !== "—") return stored;
    return "Category removed from the catalog";
  };

  const avgRestaurant = useMemo(() => {
    if (!rows.length) return "—";
    return (rows.reduce((s, r) => s + r.restaurantRate, 0) / rows.length).toFixed(1);
  }, [rows]);
  const avgSupplier = useMemo(() => {
    if (!rows.length) return "—";
    return (rows.reduce((s, r) => s + r.supplierRate, 0) / rows.length).toFixed(1);
  }, [rows]);

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["admin", "category-commissions"] });
  };

  return (
    <DataPage
      title="Rates by category"
      description="Choose how much ScopsK keeps on orders in each product category. Restaurant % is charged to the buyer. Supplier % is charged to the seller. A category with no rate uses the platform default."
      icon={<Percent className="h-5 w-5 text-primary" />}
      entityName="Category rate"
      rowLabel={(row) => categoryName(row)}
      viewDescription="These percentages apply when an order includes products from this category."
      idKey="categoryId"
      formFields={[
        {
          key: "categoryId",
          label: "Product category",
          required: true,
          type: "searchable",
          selectOptions: categories,
          placeholder: "Search categories…",
          hint: "Pick the catalog category these rates apply to.",
        },
        {
          key: "restaurantRate",
          label: "Restaurant %",
          required: true,
          type: "number",
          min: 0,
          max: 100,
          placeholder: "e.g. 4.5",
          hint: "Percent of the order charged to the restaurant.",
        },
        {
          key: "supplierRate",
          label: "Supplier %",
          required: true,
          type: "number",
          min: 0,
          max: 100,
          placeholder: "e.g. 3.0",
          hint: "Percent of the order charged to the supplier.",
        },
      ]}
      lookups={{ categoryId: categories }}
      viewFields={[
        { key: "category", label: "Product category" },
        { key: "restaurantRate", label: "Restaurant %" },
        { key: "supplierRate", label: "Supplier %" },
      ]}
      kpis={[
        { label: "Categories with a rate", value: String(list.total) },
        {
          label: "Avg restaurant %",
          value: avgRestaurant === "—" ? "—" : `${avgRestaurant}%`,
          tone: "info",
        },
        {
          label: "Avg supplier %",
          value: avgSupplier === "—" ? "—" : `${avgSupplier}%`,
          tone: "success",
        },
        { label: "Catalog categories", value: String(categories.length || "—") },
      ]}
      rows={rows}
      serverPagination={pagedListProps(list)}
      searchKeys={["category", "categoryId"]}
      emptyHint={
        isLoading
          ? "Loading…"
          : isError
            ? "Failed to load category commissions."
            : "No category rates yet. Add one to charge a different percent for that product category."
      }
      columns={[
        {
          key: "category",
          label: "Category",
          render: (r) => <span className="font-medium">{categoryName(r)}</span>,
        },
        {
          key: "restaurantRate",
          label: "Restaurant %",
          className: "whitespace-nowrap",
          render: (r) => `${num(r.restaurantRate)}%`,
        },
        {
          key: "supplierRate",
          label: "Supplier %",
          className: "whitespace-nowrap",
          render: (r) => `${num(r.supplierRate)}%`,
        },
      ]}
      onCreate={async (data) => {
        const categoryId = String(data.categoryId || "").trim();
        if (!categoryId) throw new Error("Category is required");
        const restaurantRate = Number(data.restaurantRate);
        const supplierRate = Number(data.supplierRate);
        if (!(restaurantRate >= 0) || !(supplierRate >= 0)) {
          throw new Error("Rates must be numbers ≥ 0");
        }
        const saved = await upsertCategoryCommission({ categoryId, restaurantRate, supplierRate });
        await invalidate();
        return {
          id: categoryId,
          categoryId,
          category:
            categories.find((c) => c.value === categoryId)?.label ??
            str((saved as any)?.category?.name, "—"),
          restaurantRate,
          supplierRate,
        };
      }}
      onUpdate={async (id, data) => {
        const categoryId = String(data.categoryId || id || "").trim();
        if (!categoryId) throw new Error("Category is required");
        const restaurantRate = Number(data.restaurantRate);
        const supplierRate = Number(data.supplierRate);
        if (!(restaurantRate >= 0) || !(supplierRate >= 0)) {
          throw new Error("Rates must be numbers ≥ 0");
        }
        await upsertCategoryCommission({ categoryId, restaurantRate, supplierRate });
        await invalidate();
        return {
          id: categoryId,
          categoryId,
          category: categories.find((c) => c.value === categoryId)?.label ?? "—",
          restaurantRate,
          supplierRate,
        };
      }}
      onDelete={async (id) => {
        await deleteCategoryCommission(id);
        await invalidate();
      }}
    />
  );
}

function CategoryCommissionsPage() {
  return <CategoryCommissionsPanel />;
}
