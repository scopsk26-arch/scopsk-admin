import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { ChefHat } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/admin/SearchableSelect";
import { fetchCloudKitchenProduction, fetchList } from "@/lib/api/resources";
import { asArray, num, str } from "@/lib/api/client";

export const Route = createFileRoute("/_admin/ck-production")({
  head: () => ({ meta: [{ title: "CK Production — ResPy" }] }),
  component: CkProductionPage,
});

type ProductionRow = {
  id: string;
  dishId: string;
  name: string;
  cloudKitchenId: string;
  cloudKitchenName: string;
  date: string;
  produced: number;
  sold: number;
  remaining: number;
  status: string;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function CkProductionPage() {
  const [date, setDate] = useState(todayIso());
  const [cloudKitchenId, setCloudKitchenId] = useState("");

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
          .filter((o) => o.value);
      } catch {
        return [];
      }
    },
    staleTime: 60_000,
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "ck-production", date, cloudKitchenId],
    queryFn: () =>
      fetchCloudKitchenProduction({
        date: date || undefined,
        cloudKitchenId: cloudKitchenId || undefined,
      }),
  });

  const rows: ProductionRow[] = useMemo(() => {
    const list = asArray(data?.rows ?? data);
    return list.map((r: any) => ({
      id: str(r.dishId ?? r.id),
      dishId: str(r.dishId ?? r.id),
      name: str(r.name, "—"),
      cloudKitchenId: str(r.cloudKitchenId, ""),
      cloudKitchenName: str(r.cloudKitchenName, "—"),
      date: str(r.date ?? data?.date, date),
      produced: num(r.produced),
      sold: num(r.sold),
      remaining: num(r.remaining),
      status: str(r.status, "active"),
    }));
  }, [data, date]);

  const totals = data?.totals ?? {
    produced: rows.reduce((s, r) => s + r.produced, 0),
    sold: rows.reduce((s, r) => s + r.sold, 0),
    remaining: rows.reduce((s, r) => s + r.remaining, 0),
  };

  return (
    <DataPage
      title="CK Production"
      description="Daily cloud-kitchen production snapshot: produced, sold and remaining by dish."
      icon={<ChefHat className="h-5 w-5 text-primary" />}
      entityName="Dish"
      disableCrud
      filters={
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value || todayIso())}
            className="h-9 w-[160px]"
          />
          <div className="w-[240px]">
            <SearchableSelect
              options={kitchens}
              value={cloudKitchenId}
              onChange={setCloudKitchenId}
              placeholder="All kitchens…"
              allowClear
            />
          </div>
        </div>
      }
      viewFields={[
        { key: "name", label: "Dish" },
        { key: "cloudKitchenName", label: "Kitchen" },
        { key: "date", label: "Date" },
        { key: "produced", label: "Produced" },
        { key: "sold", label: "Sold" },
        { key: "remaining", label: "Remaining" },
        { key: "status", label: "Status" },
      ]}
      kpis={[
        { label: "Dishes", value: String(rows.length) },
        { label: "Produced", value: String(num(totals.produced)), tone: "info" },
        { label: "Sold", value: String(num(totals.sold)), tone: "success" },
        { label: "Remaining", value: String(num(totals.remaining)), tone: "warning" },
      ]}
      rows={rows}
      searchKeys={["name", "cloudKitchenName", "dishId"]}
      emptyHint={
        isLoading
          ? "Loading…"
          : isError
            ? "Failed to load production snapshot."
            : "No production rows for this date."
      }
      columns={[
        { key: "name", label: "Dish", render: (r) => <span className="font-medium">{r.name}</span> },
        { key: "cloudKitchenName", label: "Kitchen" },
        { key: "produced", label: "Produced", className: "whitespace-nowrap w-[1%]" },
        { key: "sold", label: "Sold", className: "whitespace-nowrap w-[1%]" },
        { key: "remaining", label: "Remaining", className: "whitespace-nowrap w-[1%]" },
        {
          key: "status",
          label: "Status",
          className: "whitespace-nowrap w-[1%]",
          render: (r) => <StatusBadge status={r.status} />,
        },
      ]}
    />
  );
}
