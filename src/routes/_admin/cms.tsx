import { createFileRoute } from "@tanstack/react-router";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { cmsPages } from "@/lib/mock-data-extra";
import { BookOpen } from "lucide-react";

export const Route = createFileRoute("/_admin/cms")({
  head: () => ({ meta: [{ title: "CMS — Prime Plate" }] }),
  component: () => (
    <DataPage
      title="Content Management"
      description="Landing pages, help articles, FAQs and legal pages with version history."
      icon={<BookOpen className="h-5 w-5 text-primary" />}
      kpis={[
        { label: "Published", value: "24", tone: "success" },
        { label: "Drafts", value: "6", tone: "info" },
        { label: "Locales", value: "1" },
        { label: "Avg. read time", value: "2m" },
      ]}
      rows={cmsPages}
      searchKeys={["id", "title", "slug", "author"]}
      columns={[
        { key: "id", label: "ID", className: "font-mono text-xs" },
        { key: "title", label: "Title", render: (r) => <span className="font-medium">{r.title}</span> },
        { key: "slug", label: "Slug", className: "font-mono text-xs" },
        { key: "author", label: "Author" },
        { key: "updated", label: "Updated" },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  ),
});
