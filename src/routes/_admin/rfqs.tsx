import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DataPage, StatusBadge, AED } from "@/components/admin/DataPage";
import { FileText } from "lucide-react";
import { fetchList } from "@/lib/api/resources";
import { num, str } from "@/lib/api/client";
import { useAdminLookups } from "@/hooks/useAdminLookups";

export const Route = createFileRoute("/_admin/rfqs")({
  head: () => ({ meta: [{ title: "RFQs — Prime Plate" }] }),
  component: RfqsPage,
});

function RfqsPage() {
  const { restaurants, categories } = useAdminLookups();

  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["rfqs"],
    queryFn: async () => {
      const list = await fetchList("/rfqs");
      return list.map((r: any) => ({
        id: str(r.number ?? r.id),
        restaurant: str(r.organization?.name ?? r.title, "—"),
        category: str(r.visibility ?? r.metadata?.category, "—"),
        quantity: str(r.metadata?.quantity, "—"),
        budget: num(r.estimatedBudget),
        quotations: num(r.quotationsCount ?? r.quotationCount ?? r.metadata?.quotations),
        created: r.createdAt ? String(r.createdAt).slice(0, 10) : "—",
        status: str(r.status, "draft"),
      }));
    },
  });

  const open = rows.filter((r) => ["open", "published", "active"].includes(r.status)).length;
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
        { key: "id", label: "RFQ #", type: "text", placeholder: "RFQ-001" },
        { key: "restaurant", label: "Restaurant", type: "searchable", placeholder: "Search restaurants…" },
        { key: "category", label: "Category", type: "searchable", placeholder: "Search categories…" },
        { key: "quantity", label: "Quantity", type: "text" },
        { key: "budget", label: "Budget", type: "number" },
        {
          key: "status",
          label: "Status",
          type: "select",
          options: ["draft", "published", "awarded", "closed", "cancelled"],
        },
      ]}
      kpis={[
        { label: "Active RFQs", value: String(open), tone: "info" },
        { label: "Total RFQs", value: String(rows.length) },
        { label: "Avg. responses", value: rows.length ? (rows.reduce((s, r) => s + r.quotations, 0) / rows.length).toFixed(1) : "0" },
        { label: "Open value", value: AED(openValue), tone: "success" },
      ]}
      rows={rows}
      searchKeys={["id", "restaurant", "category"]}
      emptyHint={isLoading ? "Loading…" : isError ? "Failed to load RFQs." : "No RFQs found."}
      columns={[
        { key: "id", label: "RFQ", className: "font-mono text-xs" },
        { key: "restaurant", label: "Restaurant", render: (r) => <span className="font-medium">{r.restaurant}</span> },
        { key: "category", label: "Category" },
        { key: "quantity", label: "Quantity" },
        { key: "budget", label: "Budget", render: (r) => AED(r.budget) },
        { key: "quotations", label: "Bids" },
        { key: "created", label: "Created" },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  );
}
