import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DataPage, StatusBadge, AED } from "@/components/admin/DataPage";
import { QuotationDetailView } from "@/components/admin/DetailViews";
import { Quote } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  approveQuotation,
  fetchList,
  fetchQuotationDetail,
  rejectQuotation,
} from "@/lib/api/resources";
import { num, str } from "@/lib/api/client";
import { useAdminLookups } from "@/hooks/useAdminLookups";
import { computeQuotationAiScore } from "@/lib/admin-export";

export const Route = createFileRoute("/_admin/quotations")({
  head: () => ({ meta: [{ title: "Quotations — ResPy" }] }),
  component: QuotationsPage,
});

function mapQuotation(r: any) {
  const validUntil = r.validUntil
    ? String(r.validUntil).slice(0, 10)
    : r.validityDate
      ? String(r.validityDate).slice(0, 10)
      : "—";
  return {
    id: str(r.id),
    number: str(r.number ?? r.id),
    rfq: str(r.rfq?.number ?? r.rfqId, "—"),
    supplier: str(r.supplierOrg?.name ?? r.organization?.name ?? r.supplierOrgId, "—"),
    restaurant: str(r.rfq?.organization?.name ?? r.buyerOrg?.name, "—"),
    buyerOrgId: str(r.rfq?.organizationId ?? r.buyerOrgId ?? r.rfq?.organization?.id, ""),
    amount: num(r.total ?? r.amount ?? r.subtotal),
    aiScore: computeQuotationAiScore(r),
    fulfillmentType: str(r.fulfillmentType, "—"),
    validUntil,
    created: r.createdAt ? String(r.createdAt).slice(0, 10) : "—",
    status: str(r.status, "pending"),
  };
}

function QuotationsPage() {
  const { restaurants, suppliers, rfqs } = useAdminLookups(["restaurants", "suppliers", "rfqs"]);
  const queryClient = useQueryClient();

  const {
    data: rows = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["quotations"],
    staleTime: 60_000,
    queryFn: async () => {
      const list = await fetchList("/quotations");
      return list.map(mapQuotation);
    },
  });

  const approved = rows.filter((r) => ["approved", "accepted"].includes(r.status)).length;
  const flagged = rows.filter((r) => r.status === "flagged").length;
  const avgScore = rows.length
    ? (rows.reduce((s, r) => s + r.aiScore, 0) / rows.length).toFixed(1)
    : "0";

  return (
    <DataPage
      title="Quotations"
      description="Quotation monitoring with approval workflow. Set status to approved or rejected to award / decline."
      icon={<Quote className="h-5 w-5 text-primary" />}
      lookups={{
        restaurant: restaurants.map((r) => ({ value: r.label, label: r.label })),
        supplier: suppliers.map((s) => ({ value: s.label, label: s.label })),
        rfq: rfqs.map((r) => ({ value: r.label, label: r.label })),
      }}
      formFields={[
        { key: "number", label: "Quotation #", type: "text" },
        { key: "supplier", label: "Supplier", type: "text" },
        { key: "restaurant", label: "Restaurant", type: "text" },
        { key: "amount", label: "Amount", type: "number" },
        {
          key: "status",
          label: "Decision",
          required: true,
          type: "select",
          options: ["approved", "rejected", "submitted", "draft", "pending"],
        },
      ]}
      viewFields={[
        { key: "number", label: "Quotation #" },
        { key: "rfq", label: "RFQ" },
        { key: "supplier", label: "Supplier" },
        { key: "restaurant", label: "Restaurant" },
        { key: "amount", label: "Amount" },
        { key: "aiScore", label: "AI score" },
        { key: "fulfillmentType", label: "Fulfillment" },
        { key: "validUntil", label: "Valid until" },
        { key: "created", label: "Created" },
        { key: "status", label: "Status" },
      ]}
      loadDetail={async (row) => {
        const detail = await fetchQuotationDetail(row.id);
        return {
          ...detail,
          aiScore: computeQuotationAiScore({ ...detail, aiScore: detail?.aiScore ?? row.aiScore }),
          validUntil: detail?.validUntil ?? detail?.validityDate ?? row.validUntil,
        };
      }}
      renderView={(detail) => <QuotationDetailView detail={detail} />}
      kpis={[
        { label: "Active quotations", value: String(rows.length) },
        { label: "Approved", value: String(approved), tone: "success" },
        { label: "Flagged by AI", value: String(flagged), tone: "warning" },
        { label: "Avg. AI score", value: avgScore, tone: "info" },
      ]}
      rows={rows}
      searchKeys={["number", "rfq", "supplier", "restaurant"]}
      emptyHint={
        isLoading ? "Loading…" : isError ? "Failed to load quotations." : "No quotations found."
      }
      columns={[
        {
          key: "number",
          label: "Quotation",
          className: "font-mono text-xs whitespace-nowrap w-[1%]",
        },
        { key: "rfq", label: "RFQ", className: "font-mono text-xs whitespace-nowrap w-[1%]" },
        {
          key: "supplier",
          label: "Supplier",
          render: (r) => <span className="font-medium">{r.supplier}</span>,
        },
        { key: "restaurant", label: "Restaurant" },
        {
          key: "amount",
          label: "Amount",
          className: "whitespace-nowrap w-[1%]",
          render: (r) => AED(r.amount),
        },
        {
          key: "aiScore",
          label: "AI Score",
          className: "whitespace-nowrap w-[1%]",
          render: (r) => (
            <span
              className={cn(
                "font-mono font-semibold",
                r.aiScore >= 90 ? "text-success" : r.aiScore >= 75 ? "text-info" : "text-warning",
              )}
            >
              {r.aiScore || "—"}
            </span>
          ),
        },
        {
          key: "status",
          label: "Status",
          className: "whitespace-nowrap w-[1%]",
          render: (r) => <StatusBadge status={r.status} />,
        },
      ]}
      onUpdate={async (id, data, row) => {
        const status = String(data.status || "");
        const buyerOrgId = String(row.buyerOrgId || "");
        if (!buyerOrgId) throw new Error("Missing buyer organization for this quotation");
        if (status === "approved") {
          await approveQuotation(id, buyerOrgId);
        } else if (status === "rejected") {
          await rejectQuotation(id, buyerOrgId);
        } else {
          throw new Error("Set status to approved or rejected to persist");
        }
        await queryClient.invalidateQueries({ queryKey: ["quotations"] });
        await queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
        return { ...row, status };
      }}
    />
  );
}
