import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DataPage, StatusBadge, AED } from "@/components/admin/DataPage";
import { FileText } from "lucide-react";
import { fetchList } from "@/lib/api/resources";
import { api, num, str } from "@/lib/api/client";
import { useAdminLookups } from "@/hooks/useAdminLookups";

export const Route = createFileRoute("/_admin/rfqs")({
  head: () => ({ meta: [{ title: "RFQs — Prime Plate" }] }),
  component: RfqsPage,
});

const RFQ_STATUSES = [
  "draft",
  "published",
  "closed",
  "awarded",
  "cancelled",
  "expired",
] as const;

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

  return {
    id: str(r.id),
    number: str(r.number ?? r.id),
    restaurant: str(r.organization?.name ?? r.title, "—"),
    category: str(r.visibility ?? r.metadata?.category, "—"),
    quantity: quantityLabel,
    budget: num(r.estimatedBudget),
    quotations: num(r.quotationsCount ?? r.quotationCount ?? r.metadata?.quotations),
    created: r.createdAt ? String(r.createdAt).slice(0, 10) : "—",
    status: str(r.status, "draft"),
  };
}

function RfqsPage() {
  const { restaurants, categories } = useAdminLookups();
  const queryClient = useQueryClient();

  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["rfqs"],
    queryFn: async () => {
      const list = await fetchList("/rfqs", { limit: 200 });
      return list.map(mapRfqRow);
    },
  });

  const open = rows.filter((r) =>
    ["open", "published", "active", "supplier_invited", "negotiation"].includes(r.status)
  ).length;
  const openValue = rows.reduce((s, r) => s + (r.budget || 0), 0);

  return (
    <DataPage
      title="Requests for Quotation"
      description="Live RFQs across categories with quotation counts and budgets."
      icon={<FileText className="h-5 w-5 text-primary" />}
      lookups={{
        restaurant: restaurants.map((r) => ({ value: r.label, label: r.label })),
        category: categories.map((c) => ({ value: c.label, label: c.label })),
      }}
      formFields={[
        { key: "number", label: "RFQ #", type: "text", placeholder: "RFQ-001" },
        { key: "restaurant", label: "Restaurant", type: "searchable", placeholder: "Search restaurants…" },
        { key: "category", label: "Category", type: "searchable", placeholder: "Search categories…" },
        { key: "quantity", label: "Quantity", type: "text" },
        { key: "budget", label: "Budget", type: "number" },
        {
          key: "status",
          label: "Status",
          type: "select",
          options: [...RFQ_STATUSES],
        },
      ]}
      kpis={[
        { label: "Active RFQs", value: String(open), tone: "info" },
        { label: "Total RFQs", value: String(rows.length) },
        {
          label: "Avg. responses",
          value: rows.length
            ? (rows.reduce((s, r) => s + r.quotations, 0) / rows.length).toFixed(1)
            : "0",
        },
        { label: "Open value", value: AED(openValue), tone: "success" },
      ]}
      rows={rows}
      searchKeys={["number", "restaurant", "category"]}
      emptyHint={isLoading ? "Loading…" : isError ? "Failed to load RFQs." : "No RFQs found."}
      columns={[
        { key: "number", label: "RFQ", className: "font-mono text-xs" },
        {
          key: "restaurant",
          label: "Restaurant",
          render: (r) => <span className="font-medium">{r.restaurant}</span>,
        },
        { key: "category", label: "Category" },
        { key: "quantity", label: "Quantity" },
        { key: "budget", label: "Budget", render: (r) => AED(r.budget) },
        { key: "quotations", label: "Quotations" },
        { key: "created", label: "Created" },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
      onUpdate={async (id, data) => {
        if (!data.status) throw new Error("Status is required");
        try {
          const updated = await api.patch<any>(`/rfqs/${id}`, { status: data.status });
          await queryClient.invalidateQueries({ queryKey: ["rfqs"] });
          return mapRfqRow(updated);
        } catch (err) {
          // Live Heroku may lag behind PATCH — POST publish is already deployed
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
