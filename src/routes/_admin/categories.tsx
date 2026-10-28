import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { pagedListProps, usePagedList } from "@/hooks/usePagedList";
import { DataPage, StatusBadge, FieldLabel, formatStatusLabel } from "@/components/admin/DataPage";
import { GenericJsonDetailView } from "@/components/admin/DetailViews";
import { FolderTree, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchCategoryDetail } from "@/lib/api/resources";
import { api, num, str } from "@/lib/api/client";
import type { SelectOption } from "@/components/admin/SearchableSelect";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/categories")({
  head: () => ({ meta: [{ title: "Categories — ScopsK" }] }),
  component: CategoriesPage,
});

type CategoryRow = {
  id: string;
  name: string;
  parent: string;
  parentId: string;
  depth: number;
  products: number;
  suppliers: number;
  status: string;
  vatRate: string;
  exciseRate: string;
  imageUrl: string;
};

function mapCategoryRow(r: any, byId?: Map<string, any>): CategoryRow {
  const parentId = str(r.parentId ?? r.parent?.id, "");
  const parentName = str(r.parent?.name ?? (parentId && byId?.get(parentId)?.name) ?? "", "—");
  let depth = 0;
  if (byId && parentId) {
    let cursor = parentId;
    const seen = new Set<string>();
    while (cursor && !seen.has(cursor)) {
      seen.add(cursor);
      const p = byId.get(cursor);
      if (!p) break;
      depth += 1;
      cursor = str(p.parentId ?? p.parent?.id, "");
    }
  } else if (parentName && parentName !== "—") {
    depth = 1;
  }
  return {
    id: str(r.id),
    name: str(r.name, "—"),
    parent: parentName,
    parentId,
    depth,
    products: num(r.productsCount ?? r.metadata?.products),
    suppliers: num(r.metadata?.suppliers),
    status: str(r.status, "active"),
    vatRate: r.vatRate != null && r.vatRate !== "" ? String(r.vatRate) : "",
    exciseRate: r.exciseRate != null && r.exciseRate !== "" ? String(r.exciseRate) : "",
    imageUrl: str(r.imageUrl, ""),
  };
}

function toCategoryPayload(data: Record<string, any>) {
  const parentId = data.parentId && String(data.parentId).trim() ? String(data.parentId) : null;
  const imageUrl = data.imageUrl != null && String(data.imageUrl).trim() ? String(data.imageUrl).trim() : null;
  return {
    name: String(data.name || "").trim(),
    parentId,
    status: data.status || "active",
    vatRate: data.vatRate === "" || data.vatRate == null ? null : Number(data.vatRate),
    exciseRate: data.exciseRate === "" || data.exciseRate == null ? null : Number(data.exciseRate),
    imageUrl,
  };
}

function CategoriesPage() {
  const qc = useQueryClient();
  const [subParent, setSubParent] = useState<CategoryRow | null>(null);
  const [subName, setSubName] = useState("");
  const [subStatus, setSubStatus] = useState("active");
  const [subSaving, setSubSaving] = useState(false);

  const list = usePagedList({
    queryKey: ["catalog", "categories"],
    path: "/catalog/categories",
    prepare: (raw) => {
      const byId = new Map(raw.map((r: any) => [str(r.id), r]));
      return raw
        .map((r) => mapCategoryRow(r, byId))
        .sort((a, b) => {
          const ap = a.parent === "—" ? a.name : `${a.parent} / ${a.name}`;
          const bp = b.parent === "—" ? b.name : `${b.parent} / ${b.name}`;
          return ap.localeCompare(bp) || a.name.localeCompare(b.name);
        });
    },
  });
  const rows = list.rows;
  const isLoading = list.isLoading;
  const isError = list.isError;

  const parentOptions: SelectOption[] = useMemo(
    () =>
      rows
        .filter((r) => r.id && r.name && r.name !== "—")
        .map((r) => ({
          value: r.id,
          label: r.parent && r.parent !== "—" ? `${r.parent} › ${r.name}` : r.name,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [rows],
  );

  const top = rows.filter((r) => !r.parentId || r.parent === "—" || !r.parent).length;
  const nested = rows.filter((r) => r.depth > 0).length;
  const childCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      if (!row.parentId) continue;
      counts.set(row.parentId, (counts.get(row.parentId) ?? 0) + 1);
    }
    return counts;
  }, [rows]);

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["catalog", "categories"] });
    await qc.invalidateQueries({ queryKey: ["lookups", "categories"] });
  };

  const createSubcategory = async () => {
    if (!subParent) return;
    const name = subName.trim();
    if (!name) {
      toast.error("Subcategory name is required");
      return;
    }
    setSubSaving(true);
    try {
      await api.post("/catalog/categories", {
        name,
        parentId: subParent.id,
        status: subStatus,
      });
      toast.success(`Added subcategory under ${subParent.name}`);
      setSubParent(null);
      setSubName("");
      setSubStatus("active");
      await invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Failed to add subcategory");
    } finally {
      setSubSaving(false);
    }
  };

  return (
    <>
      <DataPage
        title="Categories"
        description="Product groups. Add a subcategory from a row, or set a parent when you create one."
        icon={<FolderTree className="h-5 w-5 text-primary" />}
        entityName="Category"
        idKey="id"
        formFields={[
          {
            key: "name",
            label: "Category name",
            required: true,
            type: "text",
            placeholder: "e.g. Fresh Produce",
          },
          {
            key: "parentId",
            label: "Parent category",
            type: "searchable",
            selectOptions: parentOptions,
            placeholder: "None (top-level)",
            allowClear: true,
          },
          {
            key: "imageUrl",
            label: "Picture",
            type: "image",
            placeholder: "Upload category image",
          },
          {
            key: "status",
            label: "Status",
            required: true,
            type: "select",
            options: ["active", "inactive", "draft", "archived"],
          },
          { key: "vatRate", label: "VAT % default", type: "number" },
          { key: "exciseRate", label: "Excise % default", type: "number" },
        ]}
        lookups={{ parent: parentOptions, parentId: parentOptions }}
        viewFields={[
          { key: "imageUrl", label: "Picture", type: "image" },
          { key: "name", label: "Category" },
          { key: "parent", label: "Parent" },
          { key: "depth", label: "Level" },
          { key: "products", label: "Products" },
          { key: "suppliers", label: "Suppliers" },
          { key: "status", label: "Status" },
          { key: "vatRate", label: "VAT % default" },
          { key: "exciseRate", label: "Excise % default" },
        ]}
        loadDetail={async (row) => {
          try {
            return await fetchCategoryDetail(row.id);
          } catch {
            return row;
          }
        }}
        renderView={(detail) => <GenericJsonDetailView detail={detail} />}
        kpis={[
          { label: "Top-level", value: String(top) },
          { label: "Nested", value: String(nested), tone: "info" },
          { label: "Total", value: String(rows.length) },
          {
            label: "Active",
            value: String(rows.filter((r) => r.status === "active").length),
            tone: "success",
          },
        ]}
        rows={rows}
        serverPagination={pagedListProps(list)}
        searchKeys={["name", "parent", "id"]}
        emptyHint={
          isLoading ? "Loading…" : isError ? "Failed to load categories." : "No categories found."
        }
        rowClassName={(r) => (r.depth > 0 ? "bg-muted/35" : undefined)}
        columns={[
          {
            key: "name",
            label: "Category",
            render: (r) => {
              const nested = r.depth > 0;
              const children = childCount.get(r.id) ?? 0;
              return (
                <div
                  className="flex min-w-[240px] items-center gap-3"
                  style={{ paddingLeft: `${Math.min(r.depth, 3) * 28}px` }}
                >
                  {nested ? (
                    <span aria-hidden className="relative h-10 w-4 shrink-0">
                      <span className="absolute bottom-1/2 left-0 top-0 w-px bg-border" />
                      <span className="absolute left-0 top-1/2 h-px w-3 bg-border" />
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      "flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/50",
                      nested ? "h-8 w-8" : "h-10 w-10",
                    )}
                  >
                    {r.imageUrl ? (
                      <img src={r.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <FolderTree className={cn("text-muted-foreground", nested ? "h-3.5 w-3.5" : "h-4 w-4")} />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className={cn("truncate", nested ? "font-medium" : "font-semibold")}>{r.name}</span>
                      {nested ? (
                        <span className="shrink-0 rounded-md bg-background px-1.5 py-0.5 text-[11px] font-medium leading-4 text-muted-foreground">
                          Subcategory
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {nested
                        ? `Under ${r.parent}`
                        : children === 1
                          ? "1 subcategory"
                          : children > 1
                            ? `${children} subcategories`
                            : "Top level"}
                    </span>
                  </span>
                </div>
              );
            },
          },
          {
            key: "parent",
            label: "Parent",
            render: (r) =>
              r.parent && r.parent !== "—" ? (
                <span className="font-medium">{r.parent}</span>
              ) : (
                <span className="text-muted-foreground">—</span>
              ),
          },
          { key: "products", label: "Products" },
          { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
          {
            key: "addSub",
            label: "",
            className: "whitespace-nowrap w-[1%]",
            render: (r) => (
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2.5 text-[13px] font-medium"
                title={`Add a subcategory under ${r.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  setSubParent(r);
                  setSubName("");
                  setSubStatus("active");
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Add sub
              </Button>
            ),
          },
        ]}
        onCreate={async (data) => {
          const payload = toCategoryPayload(data);
          if (!payload.name) throw new Error("Category name is required");
          const created = await api.post<any>("/catalog/categories", payload, { toastOnSuccess: true });
          await invalidate();
          return mapCategoryRow(created);
        }}
        onUpdate={async (id, data) => {
          const payload = toCategoryPayload(data);
          if (!payload.name) throw new Error("Category name is required");
          const updated = await api.patch<any>(`/catalog/categories/${id}`, payload);
          await invalidate();
          return mapCategoryRow(updated);
        }}
        onDelete={async (id) => {
          await api.delete(`/catalog/categories/${id}`);
          await invalidate();
        }}
      />

      <Dialog
        open={!!subParent}
        onOpenChange={(o) => {
          if (!o) setSubParent(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add subcategory</DialogTitle>
            <DialogDescription>
              Creates a child under{" "}
              <span className="font-medium text-foreground">{subParent?.name}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <FieldLabel required className="text-sm font-medium text-foreground/90">
                Name
              </FieldLabel>
              <Input
                className="mt-1"
                value={subName}
                onChange={(e) => setSubName(e.target.value)}
                placeholder="e.g. Chicken"
              />
            </div>
            <div>
              <FieldLabel required className="text-sm font-medium text-foreground/90">
                Status
              </FieldLabel>
              <Select value={subStatus} onValueChange={setSubStatus}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["active", "inactive", "draft", "archived"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {formatStatusLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubParent(null)}>
              Cancel
            </Button>
            <Button disabled={subSaving} onClick={() => void createSubcategory()}>
              {subSaving ? "Saving…" : "Add subcategory"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
