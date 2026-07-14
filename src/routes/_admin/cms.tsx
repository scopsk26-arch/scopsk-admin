import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { BookOpen } from "lucide-react";
import { fetchList } from "@/lib/api/resources";
import { str } from "@/lib/api/client";

export const Route = createFileRoute("/_admin/cms")({
  head: () => ({ meta: [{ title: "CMS — Prime Plate" }] }),
  component: CmsPage,
});

function CmsPage() {
  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["cms"],
    queryFn: async () => {
      const list = await fetchList("/cms");
      return list.map((r: any) => ({
        id: str(r.id),
        title: str(r.title, "—"),
        slug: str(r.slug, "—"),
        author: str(r.author?.email ?? r.createdBy ?? r.author, "—"),
        updated: r.updatedAt ? String(r.updatedAt).slice(0, 10) : "—",
        status: str(r.status, "draft"),
      }));
    },
  });

  return (
    <DataPage
      title="Content Management"
      description="Landing pages, help articles, FAQs and legal pages with version history."
      icon={<BookOpen className="h-5 w-5 text-primary" />}
      kpis={[
        { label: "Published", value: String(rows.filter((r) => r.status === "published").length), tone: "success" },
        { label: "Drafts", value: String(rows.filter((r) => r.status === "draft").length), tone: "info" },
        { label: "Total", value: String(rows.length) },
        { label: "Authors", value: String(new Set(rows.map((r) => r.author).filter((a) => a && a !== "—")).size), tone: "info" },
      ]}
      rows={rows}
      searchKeys={["id", "title", "slug", "author"]}
      emptyHint={isLoading ? "Loading…" : isError ? "Failed to load CMS pages." : "No CMS pages found."}
      columns={[
        { key: "id", label: "ID", className: "font-mono text-xs", render: (r) => String(r.id).slice(0, 8) },
        { key: "title", label: "Title", render: (r) => <span className="font-medium">{r.title}</span> },
        { key: "slug", label: "Slug", className: "font-mono text-xs" },
        { key: "author", label: "Author" },
        { key: "updated", label: "Updated" },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  );
}
