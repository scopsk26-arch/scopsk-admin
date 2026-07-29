import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { GenericJsonDetailView } from "@/components/admin/DetailViews";
import { FolderOpen } from "lucide-react";
import { fetchFileDetail, fetchList } from "@/lib/api/resources";
import { str } from "@/lib/api/client";

export const Route = createFileRoute("/_admin/files")({
  head: () => ({ meta: [{ title: "Files — Prime Plate" }] }),
  component: FilesPage,
});

function FilesPage() {
  // Backend exposes upload/delete only — no list endpoint. Keep empty until one exists.
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["files"],
    queryFn: async () => {
      const list = await fetchList("/files");
      return list.map((r: any) => ({
        id: str(r.id),
        name: str(r.originalName ?? r.filename ?? r.name, "—"),
        owner: str(r.uploadedBy ?? r.organizationId ?? r.owner, "—"),
        type: str(r.mimeType ?? r.type, "—"),
        size: r.sizeBytes != null ? `${Math.round(Number(r.sizeBytes) / 1024)} KB` : str(r.size, "—"),
        uploaded: r.createdAt ? String(r.createdAt).slice(0, 10) : "—",
        status: str(r.status, "active"),
      }));
    },
  });

  return (
    <DataPage
      title="File Management"
      description="No list API yet — upload via POST /files/upload. This page is view-only once listing ships."
      disableCrud
      icon={<FolderOpen className="h-5 w-5 text-primary" />}
      viewFields={[
        { key: "name", label: "File" },
        { key: "owner", label: "Owner" },
        { key: "type", label: "Type" },
        { key: "size", label: "Size" },
        { key: "uploaded", label: "Uploaded" },
        { key: "status", label: "Status" },
      ]}
      loadDetail={async (row) => {
        try {
          return await fetchFileDetail(row.id);
        } catch {
          return row;
        }
      }}
      renderView={(detail) => <GenericJsonDetailView detail={detail} />}
      kpis={[
        { label: "Files", value: String(rows.length) },
        { label: "Verified", value: "—", tone: "success" },
        { label: "Pending review", value: "—", tone: "warning" },
        { label: "Storage used", value: "—", tone: "info" },
      ]}
      rows={rows}
      searchKeys={["id", "name", "owner", "type"]}
      emptyHint={isLoading ? "Loading…" : "No file list API yet — upload via /files/upload."}
      columns={[
        { key: "name", label: "File", render: (r) => <span className="font-medium font-mono text-xs">{r.name}</span> },
        { key: "owner", label: "Owner" },
        { key: "type", label: "Type" },
        { key: "size", label: "Size" },
        { key: "uploaded", label: "Uploaded" },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  );
}
