import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DataPage, StatusBadge, AED } from "@/components/admin/DataPage";
import { GenericJsonDetailView } from "@/components/admin/DetailViews";
import { SearchableSelect } from "@/components/admin/SearchableSelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, Plus, Soup, X } from "lucide-react";
import { fetchList, updateCloudKitchen } from "@/lib/api/resources";
import { api, num, str } from "@/lib/api/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DEFAULT_SLOT_PRESETS = [
  "11:00–12:00",
  "12:00–13:00",
  "13:00–14:00",
  "18:00–19:00",
  "19:00–20:00",
  "20:00–21:00",
];

function normalizeSlotLabel(raw: string) {
  return String(raw || "")
    .trim()
    .replace(/\s*[-–—]\s*/g, "–");
}

export const Route = createFileRoute("/_admin/ck-dishes")({
  head: () => ({ meta: [{ title: "CK Dishes — ScopsK" }] }),
  component: CkDishesPage,
});

const DISH_STATUSES = ["active", "inactive", "draft", "archived"] as const;

const CK_CATEGORIES = [
  "Ready Meals",
  "Chef Specials",
  "Breakfast",
  "Lunch",
  "Dinner",
  "Desserts",
  "Bulk Catering",
  "Mains",
  "Bowls",
  "Grill",
  "Wraps",
  "Dessert",
] as const;

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
  ingredients: string;
  bulkPricing: string;
};

function mapDish(r: any, kitchenNameFallback = ""): DishRow {
  return {
    id: str(r.id),
    name: str(r.name, "—"),
    cloudKitchenId: str(r.cloudKitchenId ?? r.cloudKitchen?.id),
    kitchen: str(r.cloudKitchen?.name || kitchenNameFallback, "—"),
    category: str(r.category, "—"),
    basePrice: num(r.basePrice),
    currency: str(r.currency, "AED"),
    prepMinutes: r.prepMinutes != null ? num(r.prepMinutes) : null,
    status: str(r.status, "active"),
    description: str(r.description, ""),
    imageUrl: str(r.imageUrl, ""),
    ingredients: str(r.ingredients, ""),
    bulkPricing: r.bulkPricing ? JSON.stringify(r.bulkPricing) : "",
  };
}

function parseBulkPricingInput(raw: unknown) {
  const text = String(raw ?? "").trim();
  if (!text) return undefined;
  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) throw new Error("bulkPricing must be a JSON array");
    return parsed;
  } catch {
    throw new Error("bulkPricing must be valid JSON (array of tiers)");
  }
}

/** Prefer admin list; fall back to kitchen/featured endpoints when admin routes are not deployed. */
async function loadCkDishes(): Promise<DishRow[]> {
  try {
    const list = await fetchList("/admin/cloud-kitchen/dishes", { limit: 100 });
    return list.map((r) => mapDish(r));
  } catch {
    // Admin route missing / forbidden — use marketplace CK endpoints.
  }

  try {
    const featured = await fetchList("/cloud-kitchen/dishes", { limit: 100 });
    if (featured.length) return featured.map((r) => mapDish(r));
  } catch {
    // continue to per-kitchen aggregation
  }

  const kitchens = await fetchList("/cloud-kitchen/kitchens", { limit: 100 });
  const byId = new Map<string, DishRow>();

  for (const k of kitchens) {
    const kitchenId = str(k.id, "");
    const kitchenName = str(k.name, kitchenId);
    if (!kitchenId) continue;

    const nested = Array.isArray(k.dishes) ? k.dishes : [];
    for (const d of nested) {
      const row = mapDish(
        {
          ...d,
          cloudKitchenId: d.cloudKitchenId || kitchenId,
          cloudKitchen: d.cloudKitchen || { id: kitchenId, name: kitchenName },
        },
        kitchenName,
      );
      if (row.id && row.id !== "—") byId.set(row.id, row);
    }

    try {
      const dishes = await fetchList(`/cloud-kitchen/kitchens/${kitchenId}/dishes`, { limit: 100 });
      for (const d of dishes) {
        const row = mapDish(
          {
            ...d,
            cloudKitchenId: d.cloudKitchenId || kitchenId,
            cloudKitchen: d.cloudKitchen || { id: kitchenId, name: kitchenName },
          },
          kitchenName,
        );
        if (row.id && row.id !== "—") byId.set(row.id, row);
      }
    } catch {
      // kitchen may be empty or inaccessible
    }
  }

  return Array.from(byId.values());
}

function CkDishesPage() {
  const qc = useQueryClient();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [kitchenSettingsId, setKitchenSettingsId] = useState("");
  const [kitchenRating, setKitchenRating] = useState("");
  const [kitchenDeliveryMins, setKitchenDeliveryMins] = useState("");
  const [kitchenMinOrder, setKitchenMinOrder] = useState("");
  const [kitchenSlots, setKitchenSlots] = useState<string[]>([
    "11:00–12:00",
    "12:00–13:00",
    "18:00–19:00",
  ]);
  const [customSlot, setCustomSlot] = useState("");

  const { data: kitchensRaw = [] } = useQuery({
    queryKey: ["cloud-kitchen", "kitchens", "full"],
    queryFn: async () => {
      try {
        return await fetchList("/cloud-kitchen/kitchens");
      } catch {
        return [];
      }
    },
    staleTime: 60_000,
  });

  const kitchens = useMemo(
    () =>
      kitchensRaw
        .map((k: any) => ({
          value: str(k.id),
          label: str(k.name, k.id),
          raw: k,
        }))
        .filter((o: { value: string }) => o.value),
    [kitchensRaw],
  );

  const kitchenLookup = useMemo(
    () => kitchens.map((k) => ({ value: k.value, label: k.label })),
    [kitchens],
  );

  useEffect(() => {
    if (!kitchenSettingsId && kitchens[0]?.value) {
      setKitchenSettingsId(kitchens[0].value);
    }
  }, [kitchens, kitchenSettingsId]);

  useEffect(() => {
    if (!kitchenSettingsId) return;
    const row = kitchens.find((k) => k.value === kitchenSettingsId)?.raw as any;
    if (!row) return;
    setKitchenRating(row.rating != null && row.rating !== "" ? String(row.rating) : "");
    setKitchenDeliveryMins(
      row.deliveryTimeMinutes != null && row.deliveryTimeMinutes !== ""
        ? String(row.deliveryTimeMinutes)
        : "",
    );
    setKitchenMinOrder(
      row.minOrderAmount != null && row.minOrderAmount !== "" ? String(row.minOrderAmount) : "",
    );
    const slots = Array.isArray(row.deliverySlots)
      ? row.deliverySlots.map((s: unknown) => normalizeSlotLabel(String(s))).filter(Boolean)
      : [];
    setKitchenSlots(slots.length ? slots : ["11:00–12:00", "12:00–13:00", "18:00–19:00"]);
  }, [kitchenSettingsId, kitchens]);

  const {
    data: rows = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin", "ck-dishes"],
    queryFn: loadCkDishes,
  });

  const active = rows.filter((r) => r.status === "active").length;

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["admin", "ck-dishes"] });
    await qc.invalidateQueries({ queryKey: ["cloud-kitchen"] });
  };

  const toggleSlot = (slot: string) => {
    const label = normalizeSlotLabel(slot);
    setKitchenSlots((prev) =>
      prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label],
    );
  };

  const addCustomSlot = () => {
    const label = normalizeSlotLabel(customSlot);
    if (!label) return;
    if (!/^\d{1,2}:\d{2}–\d{1,2}:\d{2}$/.test(label)) {
      toast.error("Use format HH:MM–HH:MM (e.g. 14:00–15:00)");
      return;
    }
    setKitchenSlots((prev) => (prev.includes(label) ? prev : [...prev, label]));
    setCustomSlot("");
  };

  const kitchenSaveMut = useMutation({
    mutationFn: async () => {
      if (!kitchenSettingsId) throw new Error("Select a kitchen");
      return updateCloudKitchen(kitchenSettingsId, {
        rating: kitchenRating !== "" ? Number(kitchenRating) : null,
        deliveryTimeMinutes: kitchenDeliveryMins !== "" ? Number(kitchenDeliveryMins) : null,
        minOrderAmount: kitchenMinOrder !== "" ? Number(kitchenMinOrder) : null,
        deliverySlots: kitchenSlots,
      });
    },
    onSuccess: async () => {
      toast.success("Kitchen settings saved");
      await qc.invalidateQueries({ queryKey: ["cloud-kitchen"] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to save kitchen"),
  });

  const resolveKitchenId = (raw: unknown) => {
    const token = String(raw || "").trim();
    if (!token) return "";
    const byId = kitchenLookup.find((o) => o.value === token);
    if (byId) return byId.value;
    const byLabel = kitchenLookup.find((o) => o.label.toLowerCase() === token.toLowerCase());
    return byLabel?.value ?? token;
  };

  const presetSet = new Set(DEFAULT_SLOT_PRESETS);
  const extraSlots = kitchenSlots.filter((s) => !presetSet.has(s));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card shadow-soft mx-6 lg:mx-8 mt-6 overflow-hidden">
        <button
          type="button"
          className="w-full flex items-center justify-between gap-3 px-6 py-4 text-left hover:bg-muted/30 transition-colors"
          onClick={() => setSettingsOpen((o) => !o)}
        >
          <div>
            <h2 className="text-base font-semibold">Kitchen display settings</h2>
            <p className="text-sm text-muted-foreground">
              Optional — rating, delivery time, min order &amp; slots for mobile CK browse.
            </p>
          </div>
          <ChevronDown
            className={cn(
              "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
              settingsOpen && "rotate-180",
            )}
          />
        </button>
        {settingsOpen ? (
          <div className="border-t border-border px-6 py-5 space-y-4">
            <div className="grid gap-4 md:grid-cols-2 max-w-3xl">
              <div>
                <Label className="text-xs text-muted-foreground">Kitchen</Label>
                <SearchableSelect
                  options={kitchenLookup}
                  value={kitchenSettingsId}
                  onChange={setKitchenSettingsId}
                  placeholder="Select kitchen…"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Rating (0–5)</Label>
                <Input
                  type="number"
                  min={0}
                  max={5}
                  step={0.1}
                  value={kitchenRating}
                  onChange={(e) => setKitchenRating(e.target.value)}
                  placeholder="e.g. 4.8"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Delivery time (minutes)</Label>
                <Input
                  type="number"
                  min={0}
                  value={kitchenDeliveryMins}
                  onChange={(e) => setKitchenDeliveryMins(e.target.value)}
                  placeholder="e.g. 90"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Min order (AED)</Label>
                <Input
                  type="number"
                  min={0}
                  value={kitchenMinOrder}
                  onChange={(e) => setKitchenMinOrder(e.target.value)}
                  placeholder="e.g. 250"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label className="text-xs text-muted-foreground">Delivery slots</Label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_SLOT_PRESETS.map((slot) => {
                    const on = kitchenSlots.includes(slot);
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => toggleSlot(slot)}
                        className={cn(
                          "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                          on
                            ? "border-primary bg-primary/15 text-primary"
                            : "border-border bg-background text-muted-foreground hover:bg-muted/40",
                        )}
                      >
                        {slot}
                      </button>
                    );
                  })}
                  {extraSlots.map((slot) => (
                    <Badge key={slot} variant="secondary" className="gap-1 pr-1">
                      {slot}
                      <button
                        type="button"
                        className="rounded-full p-0.5 hover:bg-muted"
                        onClick={() => toggleSlot(slot)}
                        aria-label={`Remove ${slot}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2 max-w-sm">
                  <Input
                    value={customSlot}
                    onChange={(e) => setCustomSlot(e.target.value)}
                    placeholder="Custom slot e.g. 14:00–15:00"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomSlot();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={addCustomSlot}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                disabled={!kitchenSettingsId || kitchenSaveMut.isPending}
                onClick={() => kitchenSaveMut.mutate()}
              >
                {kitchenSaveMut.isPending ? "Saving…" : "Save kitchen settings"}
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <DataPage
        title="Cloud Kitchen Dishes"
        description="Add dishes one by one. Kitchen is assigned automatically. Upload images in Media Library, then paste the CDN URL here (or upload in the Image field)."
        icon={<Soup className="h-5 w-5 text-primary" />}
        entityName="Dish"
        idKey="id"
        lookups={{}}
        formFields={[
          {
            key: "name",
            label: "Dish name",
            required: true,
            type: "text",
            placeholder: "e.g. Butter Chicken",
          },
          {
            key: "basePrice",
            label: "Base price (AED)",
            required: true,
            type: "number",
            placeholder: "0",
          },
          {
            key: "category",
            label: "Category",
            type: "select",
            options: [...CK_CATEGORIES],
            placeholder: "Select category…",
          },
          { key: "description", label: "Description", type: "text" },
          {
            key: "ingredients",
            label: "Ingredients",
            type: "text",
            placeholder: "Comma-separated or JSON array",
          },
          {
            key: "bulkPricing",
            label: "Bulk pricing (JSON)",
            type: "text",
            placeholder: '[{"label":"10 portions","minQty":10,"price":40}]',
          },
          { key: "prepMinutes", label: "Prep minutes", type: "number", placeholder: "optional" },
          { key: "currency", label: "Currency", type: "text", placeholder: "AED" },
          {
            key: "imageUrl",
            label: "Image URL",
            type: "image",
            placeholder: "Upload or paste CDN URL from Media Library",
          },
          {
            key: "status",
            label: "Status",
            required: true,
            type: "select",
            options: [...DISH_STATUSES],
          },
        ]}
        viewFields={[
          { key: "id", label: "ID" },
          { key: "cloudKitchenId", label: "Cloud kitchen ID" },
          { key: "name", label: "Dish" },
          { key: "category", label: "Category" },
          { key: "basePrice", label: "Base price" },
          { key: "currency", label: "Currency" },
          { key: "prepMinutes", label: "Prep minutes" },
          { key: "status", label: "Status" },
          { key: "description", label: "Description" },
          { key: "ingredients", label: "Ingredients" },
          { key: "bulkPricing", label: "Bulk pricing" },
          { key: "imageUrl", label: "Image URL" },
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
        searchKeys={["name", "category", "status", "id", "cloudKitchenId"]}
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
            key: "id",
            label: "ID",
            className: "font-mono text-[11px] max-w-[140px]",
            render: (r) => (
              <span className="block truncate" title={r.id}>
                {r.id || "—"}
              </span>
            ),
          },
          {
            key: "cloudKitchenId",
            label: "Cloud kitchen ID",
            className: "font-mono text-[11px] max-w-[140px]",
            render: (r) => (
              <span className="block truncate" title={r.cloudKitchenId}>
                {r.cloudKitchenId || "—"}
              </span>
            ),
          },
          {
            key: "name",
            label: "Dish",
            render: (r) => <span className="font-medium">{r.name}</span>,
          },
          { key: "category", label: "Category", className: "whitespace-nowrap w-[1%]" },
          {
            key: "basePrice",
            label: "Price",
            className: "whitespace-nowrap w-[1%]",
            render: (r) =>
              r.currency === "AED" || !r.currency
                ? AED(r.basePrice)
                : `${r.currency} ${r.basePrice.toLocaleString()}`,
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
          const cloudKitchenId =
            resolveKitchenId(kitchenSettingsId) || kitchenLookup[0]?.value || "";
          if (!cloudKitchenId) {
            throw new Error("Create a cloud kitchen first (no kitchen available)");
          }
          const name = String(data.name || "").trim();
          if (!name) throw new Error("Dish name is required");
          const basePrice = Number(data.basePrice);
          if (!Number.isFinite(basePrice) || basePrice < 0) {
            throw new Error("Base price must be 0 or more");
          }
          const duplicate = rows.find(
            (r) =>
              r.cloudKitchenId === cloudKitchenId &&
              String(r.name || "").trim().toLowerCase() === name.toLowerCase(),
          );
          if (duplicate) {
            throw new Error(`Dish "${name}" already exists for this kitchen`);
          }
          const payload = {
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
            ingredients: data.ingredients ? String(data.ingredients).trim() : undefined,
            bulkPricing: parseBulkPricingInput(data.bulkPricing),
          };
          let created: any;
          try {
            created = await api.post<any>("/admin/cloud-kitchen/dishes", payload, { toastOnSuccess: true });
          } catch {
            const { cloudKitchenId: _ck, ...kitchenPayload } = payload;
            created = await api.post<any>(
              `/cloud-kitchen/kitchens/${cloudKitchenId}/dishes`,
              kitchenPayload,
              { toastOnSuccess: true },
            );
          }
          await invalidate();
          return mapDish({
            ...created,
            cloudKitchenId,
            cloudKitchen: {
              id: cloudKitchenId,
              name: kitchenLookup.find((k) => k.value === cloudKitchenId)?.label,
            },
          });
        }}
        onUpdate={async (id, data) => {
          const existing = rows.find((r) => r.id === id);
          const cloudKitchenId =
            resolveKitchenId(existing?.cloudKitchenId) ||
            resolveKitchenId(kitchenSettingsId) ||
            kitchenLookup[0]?.value ||
            "";
          const name = String(data.name || "").trim();
          if (!name) throw new Error("Dish name is required");
          const basePrice = Number(data.basePrice);
          if (!Number.isFinite(basePrice) || basePrice < 0) {
            throw new Error("Base price must be 0 or more");
          }
          const payload = {
            ...(cloudKitchenId ? { cloudKitchenId } : {}),
            name,
            basePrice,
            description: data.description != null ? String(data.description) : undefined,
            category: data.category != null ? String(data.category).trim() : undefined,
            currency: data.currency ? String(data.currency).trim().toUpperCase() : undefined,
            imageUrl: data.imageUrl != null ? String(data.imageUrl).trim() || null : undefined,
            status: data.status || undefined,
            prepMinutes:
              data.prepMinutes !== "" && data.prepMinutes != null
                ? Number(data.prepMinutes)
                : undefined,
            ingredients: data.ingredients != null ? String(data.ingredients).trim() : undefined,
            bulkPricing:
              data.bulkPricing != null ? parseBulkPricingInput(data.bulkPricing) : undefined,
          };
          let updated: any;
          try {
            updated = await api.patch<any>(`/admin/cloud-kitchen/dishes/${id}`, payload);
          } catch {
            const { cloudKitchenId: _ck, ...dishPayload } = payload;
            updated = await api.patch<any>(`/cloud-kitchen/dishes/${id}`, dishPayload);
          }
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
          try {
            await api.delete(`/admin/cloud-kitchen/dishes/${id}`);
          } catch {
            await api.delete(`/cloud-kitchen/dishes/${id}`);
          }
          await invalidate();
        }}
      />
    </div>
  );
}
