import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { pagedListProps, usePagedList } from "@/hooks/usePagedList";
import { DataPage, StatusBadge, AED } from "@/components/admin/DataPage";
import { RfqDetailView } from "@/components/admin/DetailViews";
import { FileText } from "lucide-react";
import { fetchRfqDetail } from "@/lib/api/resources";
import { api, num, str } from "@/lib/api/client";
import { useAdminLookups } from "@/hooks/useAdminLookups";

export const Route = createFileRoute("/_admin/rfqs")({
  head: () => ({ meta: [{ title: "Quote requests — ScopsK" }] }),
  component: RfqsPage,
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

  const isCk =
    r.cloudKitchen === true ||
    r.channel === "cloud_kitchen" ||
    r.metadata?.channel === "cloud_kitchen" ||
    r.metadata?.cloudKitchen === true;

  return {
    id: str(r.id),
    number: str(r.number ?? r.id),
    title: str(r.title, ""),
    restaurant: str(r.organization?.name ?? r.title, "—"),
    category: isCk ? "Cloud Kitchen" : str(r.visibility ?? r.metadata?.category, "—"),
    quantity: quantityLabel,
    itemCount,
    quotations: num(r.quotationsCount ?? r.quotationCount ?? r.metadata?.quotations),
    deliveryDate: r.deliveryDate ? String(r.deliveryDate).slice(0, 10) : "—",
    created: r.createdAt ? String(r.createdAt).slice(0, 10) : "—",
    creator: str(
      r.creator?.email ?? [r.creator?.firstName, r.creator?.lastName].filter(Boolean).join(" "),
      "—",
    ),
    status: str(r.status, "draft"),
    cloudKitchen: isCk,
  };
}

function RfqsPage() {
  const { restaurants, categories } = useAdminLookups(["restaurants", "categories"]);
  const queryClient = useQueryClient();

  const list = usePagedList({
    queryKey: ["rfqs"],
    path: "/rfqs",
    map: mapRfqRow,
  });
  const rows = list.rows;
  const isLoading = list.isLoading;
  const isError = list.isError;

  const open = rows.filter((r) =>
    ["open", "published", "active", "supplier_invited", "negotiation"].includes(r.status),
  ).length;

  return (
    <DataPage
      title="Quote requests"
      description="Open quote requests from restaurants."
      icon={<FileText className="h-5 w-5 text-primary" />}
      exportExcludeKeys={["budget", "estimatedBudget"]}
      lookups={{
        restaurant: restaurants.map((r) => ({ value: r.label, label: r.label })),
        category: categories.map((c) => ({ value: c.label, label: c.label })),
      }}
      formFields={[
        { key: "number", label: "RFQ #", type: "text", placeholder: "RFQ-001" },
        {
          key: "restaurant",
          label: "Restaurant",
          type: "searchable",
          placeholder: "Search restaurants…",
        },
        {
          key: "category",
          label: "Category",
          type: "searchable",
          placeholder: "Search categories…",
        },
        { key: "quantity", label: "Quantity", type: "text" },
        {
          key: "status",
          label: "Status",
          required: true,
          type: "select",
          options: [...RFQ_STATUSES],
        },
      ]}
      viewFields={[
        { key: "number", label: "RFQ request" },
        { key: "title", label: "Title" },
        { key: "restaurant", label: "Restaurant" },
        { key: "category", label: "Visibility" },
        { key: "quantity", label: "Quantity" },
        { key: "itemCount", label: "Line items" },
        { key: "deliveryDate", label: "Delivery date" },
        { key: "created", label: "Created" },
        { key: "creator", label: "Creator" },
        { key: "status", label: "Status" },
      ]}
      loadDetail={async (row) => fetchRfqDetail(row.id)}
      renderView={(detail) => <RfqDetailView detail={detail} />}
      kpis={[
        { label: "Open requests", value: String(open), tone: "info" },
        { label: "Total requests", value: String(list.total) },
      ]}
      rows={rows}
      serverPagination={pagedListProps(list)}
      searchKeys={["number", "restaurant", "category", "title"]}
      emptyHint={isLoading ? "Loading…" : isError ? "Failed to load RFQs." : "No RFQs found."}
      columns={[
        { key: "number", label: "RFQ request", className: "font-mono text-xs whitespace-nowrap w-[1%]" },
        {
          key: "restaurant",
          label: "Restaurant",
          render: (r) => (
            <span className="font-medium">
              {r.restaurant}
              {r.cloudKitchen ? (
                <span className="ml-2 text-xs font-medium text-muted-foreground">
                  CK
                </span>
              ) : null}
            </span>
          ),
        },
        { key: "category", label: "Visibility", className: "whitespace-nowrap w-[1%]" },
        { key: "quantity", label: "Quantity", className: "whitespace-nowrap w-[1%]" },
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
              { headers: { "X-Organization-Id": headerOrg }, toastOnSuccess: true },
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
