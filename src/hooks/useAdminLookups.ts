import { useQuery } from "@tanstack/react-query";
import { fetchList, fetchOrganizationsByType } from "@/lib/api/resources";
import { str } from "@/lib/api/client";
import type { SelectOption } from "@/components/admin/SearchableSelect";

function mapOptions(list: any[], labelKey = "name"): SelectOption[] {
  return list
    .map((r) => ({
      value: str(r.id ?? r.value ?? r[labelKey]),
      label: str(r[labelKey] ?? r.label ?? r.number ?? r.id, "—"),
    }))
    .filter((o) => o.value && o.label !== "—")
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** Shared admin dropdown data: categories, restaurants, suppliers. */
export function useAdminLookups() {
  const categories = useQuery({
    queryKey: ["lookups", "categories"],
    queryFn: async () => mapOptions(await fetchList("/catalog/categories")),
    staleTime: 60_000,
  });

  const restaurants = useQuery({
    queryKey: ["lookups", "restaurants"],
    queryFn: async () => {
      const rows = await fetchOrganizationsByType("restaurant");
      return mapOptions(rows);
    },
    staleTime: 60_000,
  });

  const suppliers = useQuery({
    queryKey: ["lookups", "suppliers"],
    queryFn: async () => {
      const rows = await fetchOrganizationsByType("supplier");
      return mapOptions(rows);
    },
    staleTime: 60_000,
  });

  const rfqs = useQuery({
    queryKey: ["lookups", "rfqs"],
    queryFn: async () => {
      const list = await fetchList("/rfqs");
      return list.map((r: any) => ({
        value: str(r.id),
        label: str(r.number ?? r.title ?? r.id),
      })).filter((o) => o.value);
    },
    staleTime: 60_000,
  });

  const purchaseOrders = useQuery({
    queryKey: ["lookups", "purchase-orders"],
    queryFn: async () => {
      const list = await fetchList("/purchase-orders");
      return list.map((r: any) => ({
        value: str(r.id),
        label: str(r.number ?? r.id),
      })).filter((o) => o.value);
    },
    staleTime: 60_000,
  });

  return {
    categories: categories.data ?? [],
    restaurants: restaurants.data ?? [],
    suppliers: suppliers.data ?? [],
    rfqs: rfqs.data ?? [],
    purchaseOrders: purchaseOrders.data ?? [],
  };
}
