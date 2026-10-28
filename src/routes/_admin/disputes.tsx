import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Scale } from "lucide-react";
import { pagedListProps, usePagedList } from "@/hooks/usePagedList";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { api, str } from "@/lib/api/client";

export const Route = createFileRoute("/_admin/disputes")({
  head: () => ({ meta: [{ title: "Disputes — ScopsK" }] }),
  component: DisputesPage,
});

const CATEGORY_LABEL: Record<string, string> = {
  quality: "Quality",
  quantity: "Missing or short",
  late_delivery: "Late delivery",
  damaged: "Damaged goods",
  pricing: "Price",
  other: "Something else",
};

const STATUS_CODES = [
  "open",
  "under_review",
  "awaiting_response",
  "investigating",
  "resolved",
  "rejected",
  "closed",
];

const NEXT_STATUS: Record<string, string> = {
  open: "open",
  under_review: "under_review",
  awaiting_response: "awaiting_response",
  investigating: "investigating",
  resolved: "resolved",
  rejected: "rejected",
  closed: "closed",
  "Under review": "under_review",
  "Awaiting supplier": "awaiting_response",
  "Awaiting response": "awaiting_response",
  Investigating: "investigating",
  Resolved: "resolved",
  Rejected: "rejected",
  Closed: "closed",
  Open: "open",
};

function statusCode(value: unknown) {
  const raw = String(value || "").trim();
  return NEXT_STATUS[raw] || NEXT_STATUS[raw.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())] || "";
}

function blank(value: unknown) {
  const text = String(value || "").trim();
  return !text || text === "—" ? "" : text;
}

function categoryLabel(value: unknown) {
  const raw = str(value, "");
  if (!raw || raw === "—") return "—";
  return CATEGORY_LABEL[raw] || raw.replace(/[_-]+/g, " ");
}

function mapDispute(r: any) {
  const order = str(r.purchaseOrder?.number ?? r.purchaseOrderNumber, "—");
  return {
    id: str(r.id),
    number: str(r.number ?? r.id),
    order,
    restaurant: str(r.buyerOrg?.name ?? r.buyerName, "—"),
    supplier: str(r.sellerOrg?.name ?? r.sellerName, "—"),
    category: categoryLabel(r.category),
    reason: str(r.reason, "—"),
    detail: str(r.description, "—"),
    reply: str(r.sellerResponse, "—"),
    result: str(r.resolution, "—"),
    priority: str(r.priority, "medium"),
    status: str(r.status, "open"),
    statusLabel: str(r.status, "open").replace(/[_-]+/g, " "),
    opened: r.createdAt ? String(r.createdAt).slice(0, 10) : "—",
  };
}

function DisputesPage() {
  const queryClient = useQueryClient();
  const list = usePagedList({
    queryKey: ["disputes"],
    path: "/disputes",
    map: mapDispute,
  });
  const rows = list.rows;
  const open = rows.filter((r) =>
    ["open", "awaiting_response", "under_review", "investigating"].includes(r.status),
  ).length;

  return (
    <DataPage
      title="Disputes"
      description="A restaurant disputed an order. Review both sides, then set the result they both see."
      icon={<Scale className="h-5 w-5 text-primary" />}
      formFields={[
        {
          key: "status",
          label: "New status",
          required: true,
          type: "select",
          options: STATUS_CODES.filter((status) => status !== "open"),
        },
        { key: "resolution", label: "Result the restaurant and supplier see", type: "text" },
        { key: "adminNotes", label: "Internal note", type: "text" },
      ]}
      viewFields={[
        { key: "number", label: "Dispute" },
        { key: "order", label: "Order" },
        { key: "restaurant", label: "Restaurant" },
        { key: "supplier", label: "Supplier" },
        { key: "category", label: "What went wrong" },
        { key: "reason", label: "Summary" },
        { key: "detail", label: "More detail" },
        { key: "reply", label: "Supplier reply" },
        { key: "result", label: "Result" },
        { key: "priority", label: "Priority" },
        { key: "statusLabel", label: "Status" },
        { key: "opened", label: "Opened" },
      ]}
      loadDetail={async (row) => {
        try {
          const detail = await api.get(`/disputes/${row.id}`);
          return mapDispute(detail);
        } catch {
          return row;
        }
      }}
      kpis={[
        { label: "On this page", value: String(rows.length) },
        { label: "Still open", value: String(open), tone: "warning" },
        {
          label: "Waiting on supplier",
          value: String(rows.filter((r) => r.status === "awaiting_response" || r.status === "open").length),
          tone: "info",
        },
        {
          label: "Resolved",
          value: String(rows.filter((r) => r.status === "resolved").length),
          tone: "success",
        },
      ]}
      rows={rows}
      serverPagination={pagedListProps(list)}
      searchKeys={["number", "order", "restaurant", "supplier", "reason", "category"]}
      emptyHint={
        list.isLoading
          ? "Loading…"
          : list.isError
            ? "Failed to load disputes."
            : "No disputes yet. They appear here when a restaurant raises one from an order."
      }
      columns={[
        { key: "number", label: "Dispute", className: "font-mono text-xs whitespace-nowrap w-[1%]" },
        { key: "order", label: "Order", className: "font-mono text-xs whitespace-nowrap" },
        { key: "restaurant", label: "Restaurant" },
        { key: "supplier", label: "Supplier" },
        {
          key: "reason",
          label: "Summary",
          render: (r) => <span className="font-medium">{r.reason}</span>,
        },
        { key: "category", label: "Issue" },
        {
          key: "status",
          label: "Status",
          className: "whitespace-nowrap w-[1%]",
          render: (r) => <StatusBadge status={r.status} />,
        },
      ]}
      onUpdate={async (id, data, row) => {
        if (["resolved", "rejected", "closed"].includes(row.status)) {
          throw new Error("This dispute is already finished.");
        }
        const status = statusCode(data.status);
        if (!status || status === "open") throw new Error("Choose the next step.");
        const resolution = blank(data.resolution);
        const adminNotes = blank(data.adminNotes);
        if ((status === "resolved" || status === "rejected") && resolution.length < 8) {
          throw new Error("Add the result the restaurant and supplier should see.");
        }
        await api.post(`/disputes/${id}/transition`, {
          status,
          resolution: resolution || undefined,
          adminNotes: adminNotes || undefined,
        });
        await queryClient.invalidateQueries({ queryKey: ["disputes"] });
        return {
          ...row,
          status,
          result: resolution || row.result,
        };
      }}
    />
  );
}
