import { createFileRoute } from "@tanstack/react-router";
import { pagedListProps, usePagedList } from "@/hooks/usePagedList";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { GenericJsonDetailView } from "@/components/admin/DetailViews";
import { Award } from "lucide-react";
import { num, str } from "@/lib/api/client";

export const Route = createFileRoute("/_admin/qualities")({
  head: () => ({ meta: [{ title: "Qualities — ScopsK" }] }),
  component: QualitiesPage,
});

type QualityRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
  status: string;
};

function mapQuality(r: any): QualityRow {
  return {
    id: str(r.id),
    name: str(r.name, "—"),
    slug: str(r.slug, ""),
    description: str(r.description, ""),
    sortOrder: num(r.sortOrder),
    status: str(r.status, "active"),
  };
}

function QualitiesPage() {
  const list = usePagedList({
    queryKey: ["catalog", "qualities"],
    path: "/catalog/qualities",
    map: mapQuality,
  });
  const rows = list.rows;
  const isLoading = list.isLoading;
  const isError = list.isError;

  const active = rows.filter((r) => r.status === "active").length;

  return (
    <DataPage
      title="Product Qualities"
      description="Master list of product quality grades used across the catalog."
      icon={<Award className="h-5 w-5 text-primary" />}
      entityName="Quality"
      disableCrud
      viewFields={[
        { key: "name", label: "Quality" },
        { key: "slug", label: "Slug" },
        { key: "description", label: "Description" },
        { key: "sortOrder", label: "Sort order" },
        { key: "status", label: "Status" },
      ]}
      loadDetail={async (row) => row}
      renderView={(detail) => <GenericJsonDetailView detail={detail} />}
      kpis={[
        { label: "Total", value: String(list.total) },
        { label: "Active", value: String(active), tone: "success" },
        { label: "Inactive", value: String(rows.length - active) },
        { label: "Grades", value: String(rows.length), tone: "info" },
      ]}
      rows={rows}
      serverPagination={pagedListProps(list)}
      searchKeys={["name", "slug", "description", "id"]}
      emptyHint={isLoading ? "Loading…" : isError ? "Failed to load qualities." : "No qualities found."}
      columns={[
        { key: "id", label: "ID", className: "font-mono text-xs", render: (r) => String(r.id).slice(0, 8) },
        { key: "name", label: "Quality", render: (r) => <span className="font-medium">{r.name}</span> },
        { key: "slug", label: "Slug", className: "font-mono text-xs" },
        { key: "description", label: "Description", className: "text-muted-foreground" },
        { key: "sortOrder", label: "Order" },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  );
}
