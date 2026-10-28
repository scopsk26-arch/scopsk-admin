import { createFileRoute } from "@tanstack/react-router";
import { pagedListProps, usePagedList } from "@/hooks/usePagedList";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { GenericJsonDetailView } from "@/components/admin/DetailViews";
import { FolderOpen } from "lucide-react";
import { fetchFileDetail } from "@/lib/api/resources";
import { str } from "@/lib/api/client";

export const Route = createFileRoute("/_admin/files")({
  head: () => ({ meta: [{ title: "Files — ScopsK" }] }),
  component: FilesPage,
});

function FilesPage() {
  // List all uploaded files for Media Library / File Management.
  const list = usePagedList({
    queryKey: ["files"],
    path: "/files",
    map: (r: any) => ({
      id: str(r.id),
      name: str(r.originalName ?? r.filename ?? r.name, "—"),
      owner: str(r.uploadedBy ?? r.organizationId ?? r.owner, "—"),
      type: str(r.mimeType ?? r.type, "—"),
      size:
        r.size != null
          ? `${Math.max(1, Math.round(Number(r.size) / 1024))} KB`
          : str(r.sizeBytes, "—"),
      uploaded: r.createdAt ? String(r.createdAt).slice(0, 10) : "—",
      status: str(r.status, "active"),
    }),
  });
  const rows = list.rows;
  const isLoading = list.isLoading;

  return (
    <DataPage
      title="Files"
      description="Uploaded files. Use Files in the sidebar to upload and copy a link."
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
      serverPagination={pagedListProps(list)}
      searchKeys={["id", "name", "owner", "type"]}
      emptyHint={isLoading ? "Loading…" : "No files yet — use Media Library to upload."}
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
