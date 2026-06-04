import { createFileRoute } from "@tanstack/react-router";
import { DataPage, StatusBadge, AED } from "@/components/admin/DataPage";
import { catalog } from "@/lib/mock-data-extra";
import { Boxes } from "lucide-react";

export const Route = createFileRoute("/_admin/catalog")({
  head: () => ({ meta: [{ title: "Product Catalog — Prime Plate" }] }),
  component: () => (
    <DataPage
      title="Product Catalog"
      description="Master catalog with templates, units, pricing and stock signals."
      icon={<Boxes className="h-5 w-5 text-primary" />}
      kpis={[
        { label: "SKUs", value: "4,820" },
        { label: "Active", value: "4,612", tone: "success" },
        { label: "Low stock", value: "84", tone: "warning" },
        { label: "Categories", value: "9" },
      ]}
      rows={catalog}
      searchKeys={["sku", "name", "category", "supplier"]}
      columns={[
        { key: "sku", label: "SKU", className: "font-mono text-xs" },
        { key: "name", label: "Product", render: (r) => <span className="font-medium">{r.name}</span> },
        { key: "category", label: "Category" },
        { key: "unit", label: "Unit" },
        { key: "price", label: "Price", render: (r) => AED(r.price) },
        { key: "supplier", label: "Supplier" },
        { key: "stock", label: "Stock" },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  ),
});
