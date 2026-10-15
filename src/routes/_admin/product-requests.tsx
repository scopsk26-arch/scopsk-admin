import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { PackagePlus } from "lucide-react";
import { pagedListProps, usePagedList } from "@/hooks/usePagedList";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { api, num, str } from "@/lib/api/client";

export const Route = createFileRoute("/_admin/product-requests")({
  head: () => ({ meta: [{ title: "Missing products — ScopsK" }] }),
  component: ProductRequestsPage,
});

function mapRequest(r: any) {
  return {
    id: str(r.id),
    number: str(r.number ?? r.id),
    product: str(r.name, "—"),
    restaurant: str(r.buyerOrg?.name ?? r.buyerOrgId, "—"),
    quantity: r.requestedQuantity != null ? String(num(r.requestedQuantity)) : "—",
    unit: str(r.unit, "—"),
    status: str(r.status, "pending"),
    created: r.createdAt ? String(r.createdAt).slice(0, 10) : "—",
    notes: str(r.notes ?? r.description, "—"),
  };
}

function ProductRequestsPage() {
  const queryClient = useQueryClient();
  const list = usePagedList({
    queryKey: ["product-requests"],
    path: "/product-requests",
    map: mapRequest,
  });
  const rows = list.rows;
  const pending = rows.filter((r) => r.status === "pending").length;

  return (
    <DataPage
      title="Missing products"
      description="Restaurants asked for something that is not in the catalog. Approve to send the request to suppliers, or reject it."
      icon={<PackagePlus className="h-5 w-5 text-primary" />}
      formFields={[
        {
          key: "status",
          label: "Decision",
          required: true,
          type: "select",
          options: ["approved", "rejected"],
        },
        { key: "adminNote", label: "Note to the restaurant", type: "text" },
      ]}
      viewFields={[
        { key: "number", label: "Request" },
        { key: "product", label: "Product" },
        { key: "restaurant", label: "Restaurant" },
        { key: "quantity", label: "Quantity" },
        { key: "unit", label: "Unit" },
        { key: "status", label: "Status" },
        { key: "created", label: "Created" },
        { key: "notes", label: "Notes" },
      ]}
      kpis={[
        { label: "On this page", value: String(rows.length) },
        { label: "Waiting", value: String(pending), tone: "warning" },
        {
          label: "Sent to suppliers",
          value: String(rows.filter((r) => r.status === "sent_to_suppliers").length),
          tone: "success",
        },
        {
          label: "Rejected",
          value: String(rows.filter((r) => r.status === "rejected").length),
          tone: "destructive",
        },
      ]}
      rows={rows}
      serverPagination={pagedListProps(list)}
      searchKeys={["number", "product", "restaurant"]}
      emptyHint={
        list.isLoading
          ? "Loading…"
          : list.isError
            ? "Failed to load product requests."
            : "No missing-product requests."
      }
      columns={[
        { key: "number", label: "Request", className: "font-mono text-xs whitespace-nowrap w-[1%]" },
        { key: "product", label: "Product", render: (r) => <span className="font-medium">{r.product}</span> },
        { key: "restaurant", label: "Restaurant" },
        { key: "quantity", label: "Qty", className: "whitespace-nowrap w-[1%]" },
        {
          key: "status",
          label: "Status",
          className: "whitespace-nowrap w-[1%]",
          render: (r) => <StatusBadge status={r.status} />,
        },
      ]}
      onUpdate={async (id, data, row) => {
        if (row.status !== "pending") {
          throw new Error("Only a waiting request can be approved or rejected.");
        }
        const status = String(data.status || "");
        const notes = String(data.adminNote || "").trim();
        if (status === "approved") {
          await api.post(`/product-requests/${id}/approve`, { notes: notes || undefined, publish: true });
        } else if (status === "rejected") {
          await api.post(`/product-requests/${id}/reject`, { notes: notes || undefined });
        } else {
          throw new Error("Choose Approved or Rejected.");
        }
        await queryClient.invalidateQueries({ queryKey: ["product-requests"] });
        await queryClient.invalidateQueries({ queryKey: ["rfqs"] });
        return { ...row, status: status === "approved" ? "sent_to_suppliers" : "rejected" };
      }}
    />
  );
}
