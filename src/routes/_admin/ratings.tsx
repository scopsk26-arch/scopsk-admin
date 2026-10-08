import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { Star } from "lucide-react";
import { fetchList, updateRating } from "@/lib/api/resources";
import { num, str } from "@/lib/api/client";

export const Route = createFileRoute("/_admin/ratings")({
  head: () => ({ meta: [{ title: "Ratings — ScopsK" }] }),
  component: RatingsPage,
});

function mapRating(r: any) {
  return {
    id: str(r.id),
    fromOrg: str(r.fromOrg?.name ?? r.fromOrgId, "—"),
    toOrg: str(r.toOrg?.name ?? r.toOrgId, "—"),
    purchaseOrder: str(r.purchaseOrder?.number ?? r.purchaseOrderId, "—"),
    score: num(r.score),
    comment: str(r.comment, ""),
    status: str(r.status, "published"),
    createdAt: r.createdAt ? String(r.createdAt).slice(0, 16).replace("T", " ") : "—",
  };
}

function RatingsPage() {
  const qc = useQueryClient();

  const {
    data: rows = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin", "ratings"],
    staleTime: 60_000,
    queryFn: async () => {
      const list = await fetchList("/ratings");
      return list.map(mapRating);
    },
  });

  const published = rows.filter((r) => r.status === "published").length;
  const hidden = rows.filter((r) => r.status === "hidden").length;
  const pending = rows.filter((r) => r.status === "pending").length;

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["admin", "ratings"] });
  };

  return (
    <DataPage
      title="Ratings"
      description="Marketplace ratings between restaurants and suppliers. Hide or restore visibility."
      icon={<Star className="h-5 w-5 text-primary" />}
      entityName="Rating"
      hideView={false}
      kpis={[
        { label: "Total", value: String(rows.length) },
        { label: "Published", value: String(published), tone: "success" },
        { label: "Hidden", value: String(hidden), tone: "warning" },
        { label: "Pending", value: String(pending), tone: "info" },
      ]}
      rows={rows}
      idKey="id"
      searchKeys={["fromOrg", "toOrg", "purchaseOrder", "comment", "status"]}
      emptyHint={
        isLoading ? "Loading ratings…" : isError ? "Failed to load ratings." : "No ratings yet."
      }
      columns={[
        { key: "fromOrg", label: "From", className: "whitespace-nowrap font-medium" },
        { key: "toOrg", label: "To", className: "whitespace-nowrap" },
        { key: "purchaseOrder", label: "PO", className: "font-mono text-xs whitespace-nowrap" },
        { key: "score", label: "Score", className: "whitespace-nowrap" },
        {
          key: "comment",
          label: "Comment",
          render: (r) => (
            <span className="line-clamp-2 max-w-[280px] text-muted-foreground text-sm">
              {r.comment || "—"}
            </span>
          ),
        },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
        { key: "createdAt", label: "Created", className: "whitespace-nowrap text-xs" },
      ]}
      viewFields={[
        { key: "fromOrg", label: "From" },
        { key: "toOrg", label: "To" },
        { key: "purchaseOrder", label: "PO" },
        { key: "score", label: "Score" },
        { key: "comment", label: "Comment" },
        { key: "status", label: "Status" },
        { key: "createdAt", label: "Created" },
      ]}
      formFields={[
        {
          key: "status",
          label: "Status",
          required: true,
          type: "select",
          options: ["published", "hidden", "pending"],
        },
      ]}
      onUpdate={async (id, data) => {
        const status = String(data.status || "published");
        const updated = await updateRating(id, { status });
        await invalidate();
        return mapRating(updated);
      }}
    />
  );
}
