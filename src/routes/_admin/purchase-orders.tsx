import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DataPage, StatusBadge, AED } from "@/components/admin/DataPage";
import { PurchaseOrderDetailView } from "@/components/admin/DetailViews";
import { ClipboardList } from "lucide-react";
import {
  fetchList,
  fetchPurchaseOrderDetail,
  updatePurchaseOrderStatus,
} from "@/lib/api/resources";
import { num, str } from "@/lib/api/client";
import { useAdminLookups } from "@/hooks/useAdminLookups";

export const Route = createFileRoute("/_admin/purchase-orders")({
  head: () => ({ meta: [{ title: "Purchase Orders — ScopsK Admin" }] }),
  component: PurchaseOrdersPage,
});

const PO_STATUSES = [
  "draft",
  "confirmed",
  "in_progress",
  "delivered",
  "completed",
  "cancelled",
] as const;

function mapPo(r: any) {
  const items = Array.isArray(r.items) ? r.items : [];
  const meta = (r.metadata || {}) as Record<string, unknown>;
  const commissions = (meta.commissions || {}) as Record<string, unknown>;
  const subtotal = num(r.subtotal);
  const tax = num(r.tax);
  const total = num(r.total ?? r.subtotal);
  const commission = num(r.commissionAmount ?? commissions.totalAmount);
  const vatRate =
    num(meta.vatRate) || (subtotal > 0 && tax > 0 ? Math.round((tax / subtotal) * 1000) / 10 : 0);
  return {
    id: str(r.id),
    number: str(r.number ?? r.id),
    orderNumber: str(r.executionOrder?.number ?? r.orderNumber, "—"),
    restaurant: str(r.buyerOrg?.name ?? r.buyerOrgId, "—"),
    supplier: str(r.supplierOrg?.name ?? r.supplierOrgId, "—"),
    buyerOrgId: str(r.buyerOrgId ?? r.buyerOrg?.id, ""),
    rfq: str(r.rfq?.number ?? r.rfqId, "—"),
    quotation: str(r.quotation?.number ?? r.quotationId, "—"),
    itemCount: items.length || num(r.itemCount),
    subtotal,
    vat: tax,
    vatRate,
    commission,
    amount: total,
    currency: str(r.currency, "AED"),
    createdAt: r.createdAt ? String(r.createdAt) : "",
    created: r.createdAt ? String(r.createdAt).slice(0, 10) : "—",
    acceptedAt: r.acceptedAt ? String(r.acceptedAt).replace("T", " ").slice(0, 19) : "—",
    status: str(r.status, "processing"),
  };
}

function PurchaseOrdersPage() {
  const { restaurants, suppliers } = useAdminLookups(["restaurants", "suppliers"]);
  const queryClient = useQueryClient();

  const {
    data: rows = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["purchase-orders"],
    staleTime: 60_000,
    queryFn: async () => {
      const list = await fetchList("/purchase-orders", {
        limit: 100,
        sortBy: "createdAt",
        sortOrder: "DESC",
      });
      return list
        .map(mapPo)
        .sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
    },
  });

  const open = rows.filter(
    (r) => !["delivered", "cancelled", "closed", "completed"].includes(r.status),
  ).length;
  const delivered = rows.filter((r) => ["delivered", "completed"].includes(r.status)).length;
  const gmv = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <DataPage
      title="Purchase Orders"
      description="Commercial purchase order documents. An execution order is created when the supplier accepts. Status changes persist to the API."
      icon={<ClipboardList className="h-5 w-5 text-primary" />}
      entityName="Purchase Order"
      lookups={{
        restaurant: restaurants.map((r) => ({ value: r.label, label: r.label })),
        supplier: suppliers.map((s) => ({ value: s.label, label: s.label })),
      }}
      formFields={[
        { key: "number", label: "PO #", type: "text" },
        { key: "restaurant", label: "Buyer", type: "text" },
        { key: "supplier", label: "Supplier", type: "text" },
        { key: "amount", label: "Amount", type: "number" },
        {
          key: "status",
          label: "Status",
          required: true,
          type: "select",
          options: [...PO_STATUSES],
        },
      ]}
      viewFields={[
        { key: "number", label: "PO #" },
        { key: "orderNumber", label: "Order" },
        { key: "restaurant", label: "Buyer" },
        { key: "supplier", label: "Supplier" },
        { key: "rfq", label: "RFQ" },
        { key: "quotation", label: "Quotation" },
        { key: "itemCount", label: "Line items" },
        { key: "subtotal", label: "Actual value" },
        { key: "vatRate", label: "VAT %" },
        { key: "vat", label: "VAT amount" },
        { key: "commission", label: "Commission" },
        { key: "amount", label: "Total (incl. VAT)" },
        { key: "currency", label: "Currency" },
        { key: "created", label: "Created" },
        { key: "acceptedAt", label: "Supplier accepted" },
        { key: "status", label: "Status" },
      ]}
      loadDetail={async (row) => fetchPurchaseOrderDetail(row.id)}
      renderView={(detail) => <PurchaseOrderDetailView detail={detail} />}
      kpis={[
        { label: "Open POs", value: String(open) },
        {
          label: "In transit",
          value: String(
            rows.filter((r) => ["dispatched", "in_transit", "in_progress"].includes(r.status))
              .length,
          ),
          tone: "info",
        },
        { label: "Delivered", value: String(delivered), tone: "success" },
        { label: "GMV", value: AED(gmv) },
      ]}
      rows={rows}
      searchKeys={["number", "orderNumber", "restaurant", "supplier", "rfq"]}
      emptyHint={
        isLoading
          ? "Loading…"
          : isError
            ? "Failed to load purchase orders."
            : "No purchase orders found."
      }
      columns={[
        { key: "number", label: "PO", className: "font-mono text-xs whitespace-nowrap w-[1%]" },
        {
          key: "orderNumber",
          label: "Order",
          className: "font-mono text-xs whitespace-nowrap w-[1%]",
        },
        {
          key: "restaurant",
          label: "Buyer",
          render: (r) => <span className="font-medium">{r.restaurant}</span>,
        },
        { key: "supplier", label: "Supplier" },
        { key: "rfq", label: "RFQ", className: "font-mono text-xs whitespace-nowrap w-[1%]" },
        { key: "itemCount", label: "Items", className: "whitespace-nowrap w-[1%]" },
        {
          key: "subtotal",
          label: "Value",
          className: "whitespace-nowrap w-[1%]",
          render: (r) => AED(r.subtotal),
        },
        {
          key: "vat",
          label: "VAT",
          className: "whitespace-nowrap w-[1%]",
          render: (r) => (r.vatRate ? `${r.vatRate}% · ${AED(r.vat)}` : AED(r.vat)),
        },
        {
          key: "commission",
          label: "Commission",
          className: "whitespace-nowrap w-[1%]",
          render: (r) => AED(r.commission),
        },
        {
          key: "amount",
          label: "Total",
          className: "whitespace-nowrap w-[1%]",
          render: (r) => AED(r.amount),
        },
        {
          key: "status",
          label: "Status",
          className: "whitespace-nowrap w-[1%]",
          render: (r) => <StatusBadge status={r.status} />,
        },
      ]}
      onUpdate={async (id, data, row) => {
        if (!data.status) throw new Error("Status is required");
        const orgId = String(row.buyerOrgId || "");
        if (!orgId) throw new Error("Missing buyer organization for this PO");
        const updated = await updatePurchaseOrderStatus(id, String(data.status), orgId);
        await queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
        return mapPo({
          ...(updated && typeof updated === "object" ? updated : {}),
          id,
          number: row.number,
          status: data.status,
          buyerOrg: { name: row.restaurant, id: row.buyerOrgId },
          supplierOrg: { name: row.supplier },
        });
      }}
    />
  );
}
