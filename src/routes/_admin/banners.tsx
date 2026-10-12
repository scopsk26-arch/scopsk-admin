import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { pagedListProps, usePagedList } from "@/hooks/usePagedList";
import { useCallback, useState } from "react";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { GenericJsonDetailView } from "@/components/admin/DetailViews";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { reorderBanners } from "@/lib/api/resources";
import { api, num, str } from "@/lib/api/client";

export const Route = createFileRoute("/_admin/banners")({
  head: () => ({ meta: [{ title: "Banners — ScopsK" }] }),
  component: BannersPage,
});

type BannerRow = {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  ctaLabel: string;
  ctaTarget: string;
  status: string;
  type: string;
  sortOrder: number;
  startsAt: string;
  endsAt: string;
  metadata: string;
};

function mapBanner(r: any): BannerRow {
  return {
    id: str(r.id),
    title: str(r.title, "—"),
    subtitle: str(r.subtitle, ""),
    imageUrl: str(r.imageUrl, ""),
    ctaLabel: str(r.ctaLabel, ""),
    ctaTarget: str(r.ctaTarget, ""),
    status: str(r.status, "inactive"),
    type: str(r.type, "homepage"),
    sortOrder: num(r.sortOrder),
    startsAt: r.startsAt ? String(r.startsAt).slice(0, 10) : "",
    endsAt: r.endsAt ? String(r.endsAt).slice(0, 10) : "",
    metadata: typeof r.metadata === "object" ? JSON.stringify(r.metadata) : str(r.metadata, ""),
  };
}

function sortBanners(list: BannerRow[]): BannerRow[] {
  return [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
}

function buildBannerReorderItems(bannerRows: BannerRow[]): { id: string; sortOrder: number }[] {
  return sortBanners(bannerRows).map((row, index) => ({
    id: row.id,
    sortOrder: index,
  }));
}

function BannersPage() {
  const queryClient = useQueryClient();
  const [reorderBusy, setReorderBusy] = useState<string | null>(null);
  const list = usePagedList({
    queryKey: ["admin", "banners"],
    path: "/admin/banners",
    prepare: (raw) => sortBanners(raw.map(mapBanner)),
  });
  const rows = list.rows;
  const isLoading = list.isLoading;
  const isError = list.isError;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "banners"] });

  const moveBanner = useCallback(
    async (id: string, direction: "up" | "down") => {
      setReorderBusy(id);
      try {
        const sorted = sortBanners(rows);
        const idx = sorted.findIndex((row) => row.id === id);
        if (idx < 0) return;
        const targetIdx = direction === "up" ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= sorted.length) return;
        const next = [...sorted];
        [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
        await reorderBanners(buildBannerReorderItems(next));
        await invalidate();
        toast.success("Banner order updated");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to reorder banners");
      } finally {
        setReorderBusy(null);
      }
    },
    [rows, queryClient],
  );

  const active = rows.filter((r) => r.status === "active").length;

  return (
    <DataPage
      title="Promotional Banners"
      description="Hero and promo banners shown in the restaurant mobile app."
      icon={<Megaphone className="h-5 w-5 text-primary" />}
      entityName="Banner"
      idKey="id"
      formFields={[
        { key: "title", label: "Title", required: true, type: "text" },
        { key: "subtitle", label: "Subtitle", type: "text" },
        { key: "imageUrl", label: "Image URL", required: true, type: "image" },
        { key: "ctaLabel", label: "CTA Label", type: "text" },
        { key: "ctaTarget", label: "CTA Target (route/deep link)", type: "text" },
        {
          key: "status",
          label: "Status",
          required: true,
          type: "select",
          options: ["active", "inactive"],
        },
        {
          key: "type",
          label: "Placement",
          required: true,
          type: "select",
          options: ["homepage", "cloud_kitchen"],
        },
        { key: "sortOrder", label: "Sort order", type: "number" },
        { key: "startsAt", label: "Starts at (YYYY-MM-DD)", type: "text" },
        { key: "endsAt", label: "Ends at (YYYY-MM-DD)", type: "text" },
      ]}
      viewFields={[
        { key: "title", label: "Title" },
        { key: "subtitle", label: "Subtitle" },
        { key: "imageUrl", label: "Image URL" },
        { key: "ctaLabel", label: "CTA Label" },
        { key: "ctaTarget", label: "CTA Target" },
        { key: "status", label: "Status" },
        { key: "type", label: "Placement" },
        { key: "sortOrder", label: "Sort order" },
        { key: "startsAt", label: "Starts at" },
        { key: "endsAt", label: "Ends at" },
        { key: "metadata", label: "Metadata" },
      ]}
      loadDetail={async (row) => row}
      renderView={(detail) => <GenericJsonDetailView detail={detail} />}
      kpis={[
        { label: "Active", value: String(active), tone: "success" },
        {
          label: "Inactive",
          value: String(rows.filter((r) => r.status === "inactive").length),
          tone: "info",
        },
        { label: "Total", value: String(rows.length) },
        {
          label: "Scheduled",
          value: String(rows.filter((r) => r.startsAt || r.endsAt).length),
          tone: "info",
        },
      ]}
      rows={rows}
      serverPagination={pagedListProps(list)}
      searchKeys={["id", "title", "subtitle", "ctaLabel", "ctaTarget"]}
      emptyHint={isLoading ? "Loading…" : isError ? "Failed to load banners." : "No banners found."}
      columns={[
        {
          key: "id",
          label: "ID",
          className: "font-mono text-xs",
          render: (r) => String(r.id).slice(0, 8),
        },
        {
          key: "title",
          label: "Title",
          render: (r) => <span className="font-medium">{r.title}</span>,
        },
        { key: "subtitle", label: "Subtitle", className: "max-w-[200px] truncate" },
        { key: "sortOrder", label: "Order" },
        {
          key: "reorder",
          label: "Move",
          render: (r) => {
            const idx = rows.findIndex((row) => row.id === r.id);
            const busy = reorderBusy === r.id;
            return (
              <div className="flex gap-0.5">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  disabled={busy || reorderBusy !== null || idx <= 0}
                  aria-label="Move up"
                  onClick={() => void moveBanner(r.id, "up")}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  disabled={busy || reorderBusy !== null || idx < 0 || idx >= rows.length - 1}
                  aria-label="Move down"
                  onClick={() => void moveBanner(r.id, "down")}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          },
        },
        { key: "startsAt", label: "Starts" },
        { key: "endsAt", label: "Ends" },
        { key: "type", label: "Placement" },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
      onCreate={async (data) => {
        if (!data.title || !data.imageUrl) throw new Error("Title and image URL are required");
        const created = await api.post("/admin/banners", {
          title: data.title,
          subtitle: data.subtitle || null,
          imageUrl: data.imageUrl,
          ctaLabel: data.ctaLabel || null,
          ctaTarget: data.ctaTarget || null,
          status: data.status || "active",
          type: data.type || "homepage",
          sortOrder: data.sortOrder != null && data.sortOrder !== "" ? Number(data.sortOrder) : 0,
          startsAt: data.startsAt || null,
          endsAt: data.endsAt || null,
        }, { toastOnSuccess: true });
        await invalidate();
        return mapBanner(created);
      }}
      onUpdate={async (id, data, row) => {
        const updated = await api.patch(`/admin/banners/${id}`, {
          title: data.title,
          subtitle: data.subtitle || null,
          imageUrl: data.imageUrl,
          ctaLabel: data.ctaLabel || null,
          ctaTarget: data.ctaTarget || null,
          status: data.status,
          type: data.type,
          sortOrder:
            data.sortOrder != null && data.sortOrder !== "" ? Number(data.sortOrder) : undefined,
          startsAt: data.startsAt || null,
          endsAt: data.endsAt || null,
        });
        const mapped = mapBanner(updated);
        const sortChanged =
          data.sortOrder != null &&
          data.sortOrder !== "" &&
          Number(data.sortOrder) !== row.sortOrder;
        if (sortChanged) {
          const nextRows = rows.map((banner) => (banner.id === id ? mapped : banner));
          await reorderBanners(buildBannerReorderItems(nextRows));
        }
        await invalidate();
        return mapped;
      }}
      onDelete={async (id) => {
        await api.delete(`/admin/banners/${id}`);
        await invalidate();
      }}
    />
  );
}
