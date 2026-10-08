import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

  const {
    data: rows = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin", "category-commissions"],
    queryFn: fetchCategoryCommissions,
    staleTime: 60_000,
  });

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
      title="Category Commissions"
      description="Per-category restaurant and supplier commission rates (platform-only ledger settings)."
      icon={<Percent className="h-5 w-5 text-primary" />}
      entityName="Category commission"
      idKey="categoryId"
      formFields={[
        {
          key: "categoryId",
          label: "Category",
          required: true,
          type: "searchable",
          selectOptions: categories,
          placeholder: "Search categories…",
        },
        {
          key: "restaurantRate",
          label: "Restaurant rate %",
          required: true,
          type: "number",
          placeholder: "e.g. 4.5",
        },
        {
          key: "supplierRate",
          label: "Supplier rate %",
          required: true,
          type: "number",
          placeholder: "e.g. 3.0",
        },
      ]}
      lookups={{ categoryId: categories }}
      viewFields={[
        { key: "category", label: "Category" },
        { key: "categoryId", label: "Category ID" },
        { key: "restaurantRate", label: "Restaurant %" },
        { key: "supplierRate", label: "Supplier %" },
      ]}
      kpis={[
        { label: "Configured", value: String(rows.length) },
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
      searchKeys={["category", "categoryId"]}
      emptyHint={
        isLoading
          ? "Loading…"
          : isError
            ? "Failed to load category commissions."
            : "No category commissions yet — add rates per category."
      }
      columns={[
        {
          key: "category",
          label: "Category",
          render: (r) => (
            <span className="font-medium">
              {categories.find((c) => c.value === r.categoryId)?.label ?? r.category}
            </span>
          ),
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
