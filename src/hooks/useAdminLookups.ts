import { useQuery } from "@tanstack/react-query";
import { EMPTY_LIST, fetchList, fetchOrganizationsByType } from "@/lib/api/resources";
import { str } from "@/lib/api/client";
import type { SelectOption } from "@/components/admin/SearchableSelect";

function mapOptions(list: any[], labelKey = "name"): SelectOption[] {
  return list
    .map((r) => {
      const value = str(r.id ?? r.value, "");
      const label = str(r[labelKey] ?? r.label ?? r.number ?? r.title, "");
      // Never show raw UUIDs as the visible label
      if (!value || !label || label === value) return null;
      return { value, label };
    })
    .filter((o): o is SelectOption => Boolean(o?.value && o.label && o.label !== "—"))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export type AdminLookupKey =
  | "categories"
  | "cuisines"
  | "restaurants"
  | "suppliers"
  | "rfqs"
  | "purchaseOrders";

/**
 * Shared admin dropdown data — only fetches the keys you ask for.
 * Previously this always hit 5 heavy Heroku endpoints on every page.
 */
export function useAdminLookups(needed: AdminLookupKey[] = []) {
  const want = new Set(needed);

  const categories = useQuery({
    queryKey: ["lookups", "categories"],
    queryFn: async () => mapOptions(await fetchList("/catalog/categories", { limit: 100 })),
    staleTime: 5 * 60_000,
    enabled: want.has("categories"),
  });

  const cuisines = useQuery({
    queryKey: ["lookups", "cuisines"],
    queryFn: async () => mapOptions(await fetchList("/cuisines", { all: "true", limit: 200 })),
    staleTime: 5 * 60_000,
    enabled: want.has("cuisines"),
  });

  // Reuse the same cache key as Restaurants / Suppliers list pages.
  const restaurants = useQuery({
    queryKey: ["organizations", "restaurant"],
    queryFn: async () => fetchOrganizationsByType("restaurant"),
    select: (rows) => mapOptions(rows),
    staleTime: 5 * 60_000,
    enabled: want.has("restaurants"),
  });

  const suppliers = useQuery({
    queryKey: ["organizations", "supplier"],
    queryFn: async () => fetchOrganizationsByType("supplier"),
    select: (rows) => mapOptions(rows),
    staleTime: 5 * 60_000,
    enabled: want.has("suppliers"),
  });

  const rfqs = useQuery({
    queryKey: ["lookups", "rfqs"],
    queryFn: async () => {
      const list = await fetchList("/rfqs", { limit: 100 });
      return list
        .map((r: any) => ({
          value: str(r.id),
          label: str(r.number ?? r.title ?? r.id),
        }))
        .filter((o) => o.value);
    },
    staleTime: 5 * 60_000,
    enabled: want.has("rfqs"),
  });

  const purchaseOrders = useQuery({
    queryKey: ["lookups", "purchase-orders"],
    queryFn: async () => {
      const list = await fetchList("/purchase-orders", { limit: 100 });
      return list
        .map((r: any) => ({
          value: str(r.id),
          label: str(r.number ?? r.id),
        }))
        .filter((o) => o.value);
    },
    staleTime: 5 * 60_000,
    enabled: want.has("purchaseOrders"),
  });

  return {
    categories: categories.data ?? EMPTY_LIST,
    cuisines: cuisines.data ?? EMPTY_LIST,
    restaurants: restaurants.data ?? EMPTY_LIST,
    suppliers: suppliers.data ?? EMPTY_LIST,
    rfqs: rfqs.data ?? EMPTY_LIST,
    purchaseOrders: purchaseOrders.data ?? EMPTY_LIST,
  };
}
