import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { GenericJsonDetailView } from "@/components/admin/DetailViews";
import { BookOpen } from "lucide-react";
import { fetchList } from "@/lib/api/resources";
import { api, str } from "@/lib/api/client";

export const Route = createFileRoute("/_admin/cms")({
  head: () => ({ meta: [{ title: "CMS — Prime Plate" }] }),
  component: CmsPage,
});

function mapCms(r: any) {
  return {
    id: str(r.id),
    title: str(r.title, "—"),
    slug: str(r.slug, "—"),
    author: str(r.author?.email ?? r.createdBy ?? r.author, "—"),
    updated: r.updatedAt ? String(r.updatedAt).slice(0, 10) : "—",
    status: str(r.status, "draft"),
    body: str(r.body, ""),
  };
}

function CmsPage() {
  const queryClient = useQueryClient();
  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["cms"],
    queryFn: async () => {
      const list = await fetchList("/cms");
      return list.map(mapCms);
    },
  });

  return (
    <DataPage
      title="Content Management"
      description="Landing pages, help articles, FAQs and legal pages."
      icon={<BookOpen className="h-5 w-5 text-primary" />}
      formFields={[
        { key: "title", label: "Title", type: "text" },
        { key: "slug", label: "Slug", type: "text" },
        { key: "status", label: "Status", type: "select", options: ["draft", "published", "archived"] },
        { key: "body", label: "Body", type: "text" },
      ]}
      viewFields={[
        { key: "title", label: "Title" },
        { key: "slug", label: "Slug" },
        { key: "author", label: "Author" },
        { key: "updated", label: "Updated" },
        { key: "status", label: "Status" },
        { key: "body", label: "Body" },
      ]}
      loadDetail={async (row) => row}
      renderView={(detail) => <GenericJsonDetailView detail={detail} />}
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
      onCreate={async (data) => {
        if (!data.title || !data.slug) throw new Error("Title and slug are required");
        const created = await api.post("/cms", {
          title: data.title,
          slug: data.slug,
          body: data.body || "",
          status: data.status || "draft",
        });
        await queryClient.invalidateQueries({ queryKey: ["cms"] });
        return mapCms(created);
      }}
      onUpdate={async (id, data) => {
        const updated = await api.patch(`/cms/${id}`, {
          title: data.title,
          slug: data.slug,
          body: data.body,
          status: data.status,
        });
        await queryClient.invalidateQueries({ queryKey: ["cms"] });
        return mapCms(updated);
      }}
      onDelete={async (id) => {
        await api.delete(`/cms/${id}`);
        await queryClient.invalidateQueries({ queryKey: ["cms"] });
      }}
    />
  );
}
