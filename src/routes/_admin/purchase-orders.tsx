import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DataPage, StatusBadge, AED } from "@/components/admin/DataPage";
import { ClipboardList } from "lucide-react";
import { fetchList, updatePurchaseOrderStatus } from "@/lib/api/resources";
import { num, str } from "@/lib/api/client";
import { useAdminLookups } from "@/hooks/useAdminLookups";

export const Route = createFileRoute("/_admin/purchase-orders")({
  head: () => ({ meta: [{ title: "Purchase Orders — Prime Plate" }] }),
  component: PurchaseOrdersPage,
});

const PO_STATUSES = ["draft", "confirmed", "in_progress", "delivered", "completed", "cancelled"] as const;

function mapPo(r: any) {
  return {
    id: str(r.id),
    number: str(r.number ?? r.id),
    restaurant: str(r.buyerOrg?.name ?? r.buyerOrgId, "—"),
    supplier: str(r.supplierOrg?.name ?? r.supplierOrgId, "—"),
    buyerOrgId: str(r.buyerOrgId ?? r.buyerOrg?.id, ""),
    amount: num(r.total ?? r.subtotal),
    status: str(r.status, "processing"),
  };
}

function PurchaseOrdersPage() {
  const { restaurants, suppliers } = useAdminLookups();
  const queryClient = useQueryClient();

  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: async () => {
      const list = await fetchList("/purchase-orders");
      return list.map(mapPo);
    },
  });

  const open = rows.filter((r) => !["delivered", "cancelled", "closed", "completed"].includes(r.status)).length;
  const delivered = rows.filter((r) => ["delivered", "completed"].includes(r.status)).length;
  const gmv = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <DataPage
      title="Purchase Orders"
      description="POs with fulfilment status. Changing status persists to the API."
      icon={<ClipboardList className="h-5 w-5 text-primary" />}
      lookups={{
        restaurant: restaurants.map((r) => ({ value: r.label, label: r.label })),
        supplier: suppliers.map((s) => ({ value: s.label, label: s.label })),
      }}
      formFields={[
        { key: "number", label: "PO #", type: "text" },
        { key: "restaurant", label: "Buyer", type: "text" },
        { key: "supplier", label: "Supplier", type: "text" },
        { key: "amount", label: "Amount", type: "number" },
        { key: "status", label: "Status", type: "select", options: [...PO_STATUSES] },
      ]}
      kpis={[
        { label: "Open POs", value: String(open) },
        { label: "In transit", value: String(rows.filter((r) => ["dispatched", "in_transit", "in_progress"].includes(r.status)).length), tone: "info" },
        { label: "Delivered", value: String(delivered), tone: "success" },
        { label: "GMV", value: AED(gmv) },
      ]}
      rows={rows}
      searchKeys={["number", "restaurant", "supplier"]}
      emptyHint={isLoading ? "Loading…" : isError ? "Failed to load POs." : "No purchase orders found."}
      columns={[
        { key: "number", label: "PO", className: "font-mono text-xs" },
        { key: "restaurant", label: "Buyer", render: (r) => <span className="font-medium">{r.restaurant}</span> },
        { key: "supplier", label: "Supplier" },
        { key: "amount", label: "Amount", render: (r) => AED(r.amount) },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
      onUpdate={async (id, data, row) => {
        if (!data.status) throw new Error("Status is required");
        const orgId = String(row.buyerOrgId || "");
        if (!orgId) throw new Error("Missing buyer organization for this PO");
        const updated = await updatePurchaseOrderStatus(id, String(data.status), orgId);
        await queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
        return mapPo({ ...updated, buyerOrg: row, number: row.number });
      }}
    />
  );
}
