import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DataPage, StatusBadge, AED } from "@/components/admin/DataPage";
import { RfqDetailView } from "@/components/admin/DetailViews";
import { ChefHat } from "lucide-react";
import { fetchList, fetchRfqDetail } from "@/lib/api/resources";
import { api, num, str } from "@/lib/api/client";
import { useAdminLookups } from "@/hooks/useAdminLookups";

export const Route = createFileRoute("/_admin/ck-requests")({
  head: () => ({ meta: [{ title: "CK Requests — ResPy" }] }),
  component: CkRequestsPage,
});

const RFQ_STATUSES = ["draft", "published", "closed", "awarded", "cancelled", "expired"] as const;

function mapRfqRow(r: any) {
  const qty =
    r.totalQuantity != null
      ? Number(r.totalQuantity)
      : r.itemCount != null
        ? Number(r.itemCount)
        : num(r.metadata?.quantity);
  const itemCount = num(r.itemCount);
  let quantityLabel = "—";
  if (itemCount > 0 && qty > 0) {
    quantityLabel = itemCount === 1 ? String(qty) : `${qty} (${itemCount} items)`;
  } else if (qty > 0) {
    quantityLabel = String(qty);
  } else if (itemCount > 0) {
    quantityLabel = `${itemCount} items`;
  }

  const estimated =
    r.estimatedTotal != null && Number.isFinite(Number(r.estimatedTotal))
      ? Number(r.estimatedTotal)
      : null;

  return {
    id: str(r.id),
    number: str(r.number ?? r.id),
    title: str(r.title, ""),
    restaurant: str(r.organization?.name ?? r.title, "—"),
    quantity: quantityLabel,
    itemCount,
    estimatedTotal: estimated,
    deliveryDate: r.deliveryDate ? String(r.deliveryDate).slice(0, 10) : "—",
    created: r.createdAt ? String(r.createdAt).slice(0, 10) : "—",
    creator: str(
      r.creator?.email ?? [r.creator?.firstName, r.creator?.lastName].filter(Boolean).join(" "),
      "—",
    ),
    status: str(r.status, "draft"),
    channel: "cloud_kitchen",
  };
}

function CkRequestsPage() {
  const { restaurants } = useAdminLookups(["restaurants"]);
  const queryClient = useQueryClient();

  const {
    data: rows = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["rfqs", "cloud_kitchen"],
    staleTime: 30_000,
    queryFn: async () => {
      const list = await fetchList("/rfqs", { limit: 100, channel: "cloud_kitchen" });
      return list.map(mapRfqRow);
    },
  });

  const open = rows.filter((r) =>
    ["open", "published", "active", "supplier_invited", "negotiation"].includes(r.status),
  ).length;
  const served = rows.filter((r) => ["awarded", "closed"].includes(r.status)).length;

  return (
    <DataPage
      title="Cloud Kitchen Requests"
      description="Restaurant Cloud Kitchen orders submitted via the RFQ flow. Suppliers are not invited — update status to serve."
      icon={<ChefHat className="h-5 w-5 text-primary" />}
      exportExcludeKeys={["budget", "estimatedBudget"]}
      lookups={{
        restaurant: restaurants.map((r) => ({ value: r.label, label: r.label })),
      }}
      formFields={[
        { key: "number", label: "Request #", type: "readonly" },
        { key: "restaurant", label: "Restaurant", type: "readonly" },
        { key: "quantity", label: "Quantity", type: "readonly" },
        {
          key: "status",
          label: "Status",
          required: true,
          type: "select",
          options: [...RFQ_STATUSES],
        },
      ]}
      viewFields={[
        { key: "number", label: "Request #" },
        { key: "title", label: "Title" },
        { key: "restaurant", label: "Restaurant" },
        { key: "quantity", label: "Quantity" },
        { key: "itemCount", label: "Line items" },
        { key: "estimatedTotal", label: "Est. total" },
        { key: "deliveryDate", label: "Delivery date" },
        { key: "created", label: "Created" },
        { key: "creator", label: "Creator" },
        { key: "status", label: "Status" },
      ]}
      loadDetail={async (row) => {
        const detail = await fetchRfqDetail(row.id);
        return { ...detail, ...mapRfqRow({ ...detail, organization: detail.organization }) };
      }}
      renderView={(detail) => <RfqDetailView detail={detail} cloudKitchen />}
      kpis={[
        { label: "Open to serve", value: String(open), tone: "info" },
        { label: "Served / closed", value: String(served), tone: "success" },
        { label: "Total CK requests", value: String(rows.length) },
      ]}
      rows={rows}
      searchKeys={["number", "restaurant", "title"]}
      emptyHint={
        isLoading
          ? "Loading…"
          : isError
            ? "Failed to load Cloud Kitchen requests."
            : "No Cloud Kitchen requests yet."
      }
      columns={[
        {
          key: "number",
          label: "Request",
          className: "font-mono text-xs whitespace-nowrap w-[1%]",
        },
        {
          key: "restaurant",
          label: "Restaurant",
          render: (r) => <span className="font-medium">{r.restaurant}</span>,
        },
        { key: "quantity", label: "Quantity", className: "whitespace-nowrap w-[1%]" },
        {
          key: "estimatedTotal",
          label: "Est. total",
          className: "whitespace-nowrap w-[1%]",
          render: (r) => (r.estimatedTotal != null ? AED(r.estimatedTotal) : "—"),
        },
        { key: "created", label: "Created", className: "whitespace-nowrap w-[1%]" },
        {
          key: "status",
          label: "Status",
          className: "whitespace-nowrap w-[1%]",
          render: (r) => <StatusBadge status={r.status} />,
        },
      ]}
      onUpdate={async (id, data) => {
        if (!data.status) throw new Error("Status is required");
        try {
          const updated = await api.patch<any>(`/rfqs/${id}`, { status: data.status });
          await queryClient.invalidateQueries({ queryKey: ["rfqs"] });
          return mapRfqRow(updated);
        } catch (err) {
          if (data.status === "published") {
            const current = await api.get<any>(`/rfqs/${id}`);
            const headerOrg = current?.organizationId;
            if (!headerOrg) throw err;
            const published = await api.post<any>(
              `/rfqs/${id}/publish`,
              {},
              { headers: { "X-Organization-Id": headerOrg } },
            );
            await queryClient.invalidateQueries({ queryKey: ["rfqs"] });
            return mapRfqRow(published);
          }
          throw err;
        }
      }}
    />
  );
}
