import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DataPage, StatusBadge, AED } from "@/components/admin/DataPage";
import { GenericJsonDetailView } from "@/components/admin/DetailViews";
import { Soup } from "lucide-react";
import { fetchList } from "@/lib/api/resources";
import { api, num, str } from "@/lib/api/client";

export const Route = createFileRoute("/_admin/ck-dishes")({
  head: () => ({ meta: [{ title: "CK Dishes — ResPy" }] }),
  component: CkDishesPage,
});

const DISH_STATUSES = ["active", "inactive", "draft", "archived"] as const;

type DishRow = {
  id: string;
  name: string;
  cloudKitchenId: string;
  kitchen: string;
  category: string;
  basePrice: number;
  currency: string;
  prepMinutes: number | null;
  status: string;
  description: string;
  imageUrl: string;
};

function mapDish(r: any): DishRow {
  return {
    id: str(r.id),
    name: str(r.name, "—"),
    cloudKitchenId: str(r.cloudKitchenId ?? r.cloudKitchen?.id),
    kitchen: str(r.cloudKitchen?.name, "—"),
    category: str(r.category, "—"),
    basePrice: num(r.basePrice),
    currency: str(r.currency, "AED"),
    prepMinutes: r.prepMinutes != null ? num(r.prepMinutes) : null,
    status: str(r.status, "active"),
    description: str(r.description, ""),
    imageUrl: str(r.imageUrl, ""),
  };
}

function CkDishesPage() {
  const qc = useQueryClient();

  const { data: kitchens = [] } = useQuery({
    queryKey: ["cloud-kitchen", "kitchens"],
    queryFn: async () => {
      try {
        const list = await fetchList("/cloud-kitchen/kitchens");
        return list
          .map((k: any) => ({
            value: str(k.id),
            label: str(k.name, k.id),
          }))
          .filter((o: { value: string }) => o.value);
      } catch {
        return [];
      }
    },
    staleTime: 60_000,
  });

  const kitchenLookup = useMemo(
    () => kitchens.map((k: { value: string; label: string }) => ({ value: k.value, label: k.label })),
    [kitchens],
  );

  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["admin", "ck-dishes"],
    queryFn: async () => {
      const list = await fetchList("/admin/cloud-kitchen/dishes", { limit: 100 });
      return list.map(mapDish);
    },
  });

  const active = rows.filter((r) => r.status === "active").length;

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["admin", "ck-dishes"] });
    await qc.invalidateQueries({ queryKey: ["cloud-kitchen"] });
  };

  const resolveKitchenId = (raw: unknown) => {
    const token = String(raw || "").trim();
    if (!token) return "";
    const byId = kitchenLookup.find((o) => o.value === token);
    if (byId) return byId.value;
    const byLabel = kitchenLookup.find(
      (o) => o.label.toLowerCase() === token.toLowerCase(),
    );
    return byLabel?.value ?? token;
  };

  return (
    <DataPage
      title="Cloud Kitchen Dishes"
      description="Add dishes one by one for a kitchen. Use CK Bulk Import for CSV uploads."
      icon={<Soup className="h-5 w-5 text-primary" />}
      entityName="Dish"
      idKey="id"
      lookups={{
        cloudKitchenId: kitchenLookup,
        kitchen: kitchenLookup,
      }}
      formFields={[
        {
          key: "cloudKitchenId",
          label: "Cloud kitchen",
          type: "searchable",
          placeholder: "Select kitchen…",
        },
        { key: "name", label: "Dish name", type: "text", placeholder: "e.g. Butter Chicken" },
        { key: "basePrice", label: "Base price (AED)", type: "number", placeholder: "0" },
        { key: "category", label: "Category", type: "text", placeholder: "e.g. Mains" },
        { key: "description", label: "Description", type: "text" },
        { key: "prepMinutes", label: "Prep minutes", type: "number", placeholder: "optional" },
        { key: "currency", label: "Currency", type: "text", placeholder: "AED" },
        { key: "imageUrl", label: "Image URL", type: "text", placeholder: "https://…" },
        {
          key: "status",
          label: "Status",
          type: "select",
          options: [...DISH_STATUSES],
        },
      ]}
      viewFields={[
        { key: "name", label: "Dish" },
        { key: "kitchen", label: "Kitchen" },
        { key: "category", label: "Category" },
        { key: "basePrice", label: "Base price" },
        { key: "currency", label: "Currency" },
        { key: "prepMinutes", label: "Prep minutes" },
        { key: "status", label: "Status" },
        { key: "description", label: "Description" },
        { key: "imageUrl", label: "Image URL" },
        { key: "id", label: "ID" },
      ]}
      loadDetail={async (row) => row}
      renderView={(detail) => <GenericJsonDetailView detail={detail} />}
      kpis={[
        { label: "Total dishes", value: String(rows.length) },
        { label: "Active", value: String(active), tone: "success" },
        { label: "Kitchens", value: String(kitchenLookup.length), tone: "info" },
        {
          label: "Draft / inactive",
          value: String(rows.length - active),
        },
      ]}
      rows={rows}
      searchKeys={["name", "kitchen", "category", "status", "id"]}
      emptyHint={
        isLoading
          ? "Loading…"
          : isError
            ? "Failed to load dishes."
            : kitchenLookup.length === 0
              ? "Create a cloud kitchen first, then add dishes here."
              : "No dishes yet. Click Add Dish to create one."
      }
      columns={[
        {
          key: "name",
          label: "Dish",
          render: (r) => <span className="font-medium">{r.name}</span>,
        },
        { key: "kitchen", label: "Kitchen" },
        { key: "category", label: "Category", className: "whitespace-nowrap w-[1%]" },
        {
          key: "basePrice",
          label: "Price",
          className: "whitespace-nowrap w-[1%]",
          render: (r) =>
            r.currency === "AED" || !r.currency ? (
              <AED amount={r.basePrice} />
            ) : (
              <span>
                {r.currency} {r.basePrice.toLocaleString()}
              </span>
            ),
        },
        {
          key: "prepMinutes",
          label: "Prep",
          className: "whitespace-nowrap w-[1%]",
          render: (r) => (r.prepMinutes != null ? `${r.prepMinutes}m` : "—"),
        },
        {
          key: "status",
          label: "Status",
          className: "whitespace-nowrap w-[1%]",
          render: (r) => <StatusBadge status={r.status} />,
        },
      ]}
      onCreate={async (data) => {
        const cloudKitchenId = resolveKitchenId(data.cloudKitchenId ?? data.kitchen);
        if (!cloudKitchenId) throw new Error("Select a cloud kitchen");
        const name = String(data.name || "").trim();
        if (!name) throw new Error("Dish name is required");
        const basePrice = Number(data.basePrice);
        if (!Number.isFinite(basePrice) || basePrice < 0) {
          throw new Error("Base price must be 0 or more");
        }
        const created = await api.post<any>("/admin/cloud-kitchen/dishes", {
          cloudKitchenId,
          name,
          basePrice,
          description: data.description ? String(data.description) : undefined,
          category: data.category ? String(data.category).trim() : undefined,
          currency: data.currency ? String(data.currency).trim().toUpperCase() : "AED",
          imageUrl: data.imageUrl ? String(data.imageUrl).trim() : undefined,
          status: data.status || "active",
          prepMinutes:
            data.prepMinutes !== "" && data.prepMinutes != null
              ? Number(data.prepMinutes)
              : undefined,
        });
        await invalidate();
        return mapDish({
          ...created,
          cloudKitchen: {
            id: cloudKitchenId,
            name: kitchenLookup.find((k) => k.value === cloudKitchenId)?.label,
          },
        });
      }}
      onUpdate={async (id, data) => {
        const cloudKitchenId = resolveKitchenId(data.cloudKitchenId ?? data.kitchen);
        const name = String(data.name || "").trim();
        if (!name) throw new Error("Dish name is required");
        const basePrice = Number(data.basePrice);
        if (!Number.isFinite(basePrice) || basePrice < 0) {
          throw new Error("Base price must be 0 or more");
        }
        const updated = await api.patch<any>(`/admin/cloud-kitchen/dishes/${id}`, {
          ...(cloudKitchenId ? { cloudKitchenId } : {}),
          name,
          basePrice,
          description: data.description != null ? String(data.description) : undefined,
          category: data.category != null ? String(data.category).trim() : undefined,
          currency: data.currency
            ? String(data.currency).trim().toUpperCase()
            : undefined,
          imageUrl: data.imageUrl != null ? String(data.imageUrl).trim() || null : undefined,
          status: data.status || undefined,
          prepMinutes:
            data.prepMinutes !== "" && data.prepMinutes != null
              ? Number(data.prepMinutes)
              : undefined,
        });
        await invalidate();
        const kid = str(updated.cloudKitchenId ?? cloudKitchenId);
        return mapDish({
          ...updated,
          cloudKitchen: {
            id: kid,
            name: kitchenLookup.find((k) => k.value === kid)?.label,
          },
        });
      }}
      onDelete={async (id) => {
        await api.delete(`/admin/cloud-kitchen/dishes/${id}`);
        await invalidate();
      }}
    />
  );
}
