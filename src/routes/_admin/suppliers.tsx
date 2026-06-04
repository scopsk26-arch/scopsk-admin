import { createFileRoute } from "@tanstack/react-router";
import { DataPage, StatusBadge, AED } from "@/components/admin/DataPage";
import { suppliers } from "@/lib/mock-data";
import { Truck } from "lucide-react";

export const Route = createFileRoute("/_admin/suppliers")({
  head: () => ({ meta: [{ title: "Suppliers — Prime Plate" }] }),
  component: () => (
    <DataPage
      title="Suppliers"
      description="Vetted suppliers with performance, win-rate and category coverage."
      icon={<Truck className="h-5 w-5 text-primary" />}
      kpis={[
        { label: "Total suppliers", value: "1,293" },
        { label: "Verified", value: "1,108", tone: "success" },
        { label: "Pending review", value: "62", tone: "warning" },
        { label: "Avg. win-rate", value: "67%", tone: "info" },
      ]}
      rows={suppliers}
      searchKeys={["name", "id"]}
      columns={[
        { key: "id", label: "ID", className: "font-mono text-xs" },
        { key: "name", label: "Supplier", render: (r) => <span className="font-medium">{r.name}</span> },
        { key: "categories", label: "Categories", render: (r) => r.categories.join(", ") },
        { key: "revenue", label: "Revenue (90d)", render: (r) => AED(r.revenue) },
        { key: "winRate", label: "Win rate", render: (r) => `${r.winRate}%` },
        { key: "rating", label: "Rating", render: (r) => `★ ${r.rating}` },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  ),
});
