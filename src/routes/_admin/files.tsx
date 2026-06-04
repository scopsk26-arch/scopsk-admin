import { createFileRoute } from "@tanstack/react-router";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { files } from "@/lib/mock-data-extra";
import { FolderOpen } from "lucide-react";

export const Route = createFileRoute("/_admin/files")({
  head: () => ({ meta: [{ title: "Files — Prime Plate" }] }),
  component: () => (
    <DataPage
      title="File Management"
      description="Supplier and restaurant documents, contracts and invoices."
      icon={<FolderOpen className="h-5 w-5 text-primary" />}
      kpis={[
        { label: "Files", value: "12,840" },
        { label: "Verified", value: "11,420", tone: "success" },
        { label: "Pending review", value: "84", tone: "warning" },
        { label: "Storage used", value: "184 GB", tone: "info" },
      ]}
      rows={files}
      searchKeys={["id", "name", "owner", "type"]}
      columns={[
        { key: "name", label: "File", render: (r) => <span className="font-medium font-mono text-xs">{r.name}</span> },
        { key: "owner", label: "Owner" },
        { key: "type", label: "Type" },
        { key: "size", label: "Size" },
        { key: "uploaded", label: "Uploaded" },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  ),
});
