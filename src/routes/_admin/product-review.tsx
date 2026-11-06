import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck } from "lucide-react";
import { api } from "@/lib/api/client";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { ProductReviewDialog, type ProductReviewRow } from "@/components/admin/ProductReviewDialog";

export const Route = createFileRoute("/_admin/product-review")({
  head: () => ({ meta: [{ title: "Product review — ScopsK" }] }),
  component: ProductReviewPage,
});

type PendingProduct = ProductReviewRow & {
  createdAt?: string;
};

function ProductReviewPage() {
  const qc = useQueryClient();
  const reviews = useQuery({
    queryKey: ["catalog", "product-reviews"],
    queryFn: () => api.get<PendingProduct[]>("/catalog/product-reviews"),
  });
  const [selected, setSelected] = useState<ProductReviewRow | null>(null);
  const rows = (reviews.data || []).map((item) => ({
    ...item,
    category: item.category || "—",
    sku: item.sku || "—",
    halalLabel: item.halal ? "Yes" : "No",
    reason: (item.reasons || []).map((line) => {
      const known: Record<string, string> = {
        "The name looks non-Halal, or it names alcohol.":
          "The product name indicates a non-Halal item or an alcoholic product.",
        "It is marked Halal, but the name does not match.":
          "The product is marked Halal, but the name indicates a non-Halal item.",
      };
      return known[line] || line;
    }).join(" ") || "—",
    status: "pending",
  }));

  return (
    <>
      <DataPage
        title="Product review"
        description="Pending products stay hidden until you approve or reject them."
        icon={<ClipboardCheck className="h-5 w-5 text-primary" />}
        entityName="Product"
        kpis={[
          { label: "In queue", value: String(rows.length), tone: "warning" },
        ]}
        rows={rows}
        onRowClick={(row) => {
          setSelected(row);
          return true;
        }}
        searchKeys={["name", "sku", "category", "reason"]}
        emptyHint={
          reviews.isLoading
            ? "Loading…"
            : reviews.isError
              ? "Could not load pending products."
              : "No products are waiting for review."
        }
        columns={[
          {
            key: "sku",
            label: "Item code",
            className: "font-mono text-xs whitespace-nowrap w-[1%]",
          },
          {
            key: "name",
            label: "Product",
            className: "whitespace-nowrap",
            render: (row) => <span className="font-medium">{row.name}</span>,
          },
          { key: "category", label: "Category", className: "whitespace-nowrap" },
          { key: "halalLabel", label: "Halal", className: "whitespace-nowrap w-[1%]" },
          { key: "reason", label: "Reason" },
          {
            key: "status",
            label: "Status",
            className: "whitespace-nowrap w-[1%]",
            render: () => <StatusBadge status="pending" />,
          },
        ]}
      />
      <ProductReviewDialog
        row={selected}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        onDone={async () => {
          await qc.invalidateQueries({ queryKey: ["catalog", "product-reviews"] });
          await qc.invalidateQueries({ queryKey: ["catalog", "products"] });
        }}
      />
    </>
  );
}
