import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { GenericJsonDetailView } from "@/components/admin/DetailViews";
import { FolderTree, Plus } from "lucide-react";
import { fetchCategoryDetail, fetchList } from "@/lib/api/resources";
import { api, num, str } from "@/lib/api/client";
import type { SelectOption } from "@/components/admin/SearchableSelect";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/categories")({
  head: () => ({ meta: [{ title: "Categories — ResPy" }] }),
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
};

function mapCategoryRow(r: any, byId?: Map<string, any>): CategoryRow {
  const parentId = str(r.parentId ?? r.parent?.id, "");
  const parentName = str(
    r.parent?.name ?? (parentId && byId?.get(parentId)?.name) ?? "",
    "—",
  );
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
  };
}

function toCategoryPayload(data: Record<string, any>) {
  const parentId = data.parentId && String(data.parentId).trim() ? String(data.parentId) : null;
  return {
    name: String(data.name || "").trim(),
    parentId,
    status: data.status || "active",
    vatRate: data.vatRate === "" || data.vatRate == null ? null : Number(data.vatRate),
    exciseRate: data.exciseRate === "" || data.exciseRate == null ? null : Number(data.exciseRate),
  };
}

function CategoriesPage() {
  const qc = useQueryClient();
  const [subParent, setSubParent] = useState<CategoryRow | null>(null);
  const [subName, setSubName] = useState("");
  const [subStatus, setSubStatus] = useState("active");
  const [subSaving, setSubSaving] = useState(false);

  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["catalog", "categories"],
    staleTime: 60_000,
    queryFn: async () => {
      const list = await fetchList("/catalog/categories");
      const byId = new Map(list.map((r: any) => [str(r.id), r]));
      return list
        .map((r) => mapCategoryRow(r, byId))
        .sort((a, b) => {
          const ap = a.parent === "—" ? a.name : `${a.parent} / ${a.name}`;
          const bp = b.parent === "—" ? b.name : `${b.parent} / ${b.name}`;
          return ap.localeCompare(bp) || a.name.localeCompare(b.name);
        });
    },
  });

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
        description="Top-level and nested categories. Use Parent category when creating, or Add subcategory on a row."
        icon={<FolderTree className="h-5 w-5 text-primary" />}
        entityName="Category"
        idKey="id"
        formFields={[
          { key: "name", label: "Category name", type: "text", placeholder: "e.g. Fresh Produce" },
          {
            key: "parentId",
            label: "Parent category",
            type: "searchable",
            selectOptions: parentOptions,
            placeholder: "None (top-level)",
            allowClear: true,
          },
          {
            key: "status",
            label: "Status",
            type: "select",
            options: ["active", "inactive", "draft", "archived"],
          },
          { key: "vatRate", label: "VAT % default", type: "number" },
          { key: "exciseRate", label: "Excise % default", type: "number" },
        ]}
        lookups={{ parent: parentOptions, parentId: parentOptions }}
        viewFields={[
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
          { label: "Active", value: String(rows.filter((r) => r.status === "active").length), tone: "success" },
        ]}
        rows={rows}
        searchKeys={["name", "parent", "id"]}
        emptyHint={isLoading ? "Loading…" : isError ? "Failed to load categories." : "No categories found."}
        columns={[
          { key: "id", label: "ID", className: "font-mono text-xs", render: (r) => String(r.id).slice(0, 8) },
          {
            key: "name",
            label: "Category",
            render: (r) => (
              <span className="font-medium" style={{ paddingLeft: `${Math.min(r.depth, 4) * 12}px` }}>
                {r.depth > 0 ? "↳ " : ""}{r.name}
              </span>
            ),
          },
          {
            key: "parent",
            label: "Parent",
            render: (r) => (r.parent && r.parent !== "—" ? r.parent : "—"),
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
                variant="ghost"
                className="h-8 px-2 text-xs"
                onClick={() => {
                  setSubParent(r);
                  setSubName("");
                  setSubStatus("active");
                }}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Sub
              </Button>
            ),
          },
        ]}
        onCreate={async (data) => {
          const payload = toCategoryPayload(data);
          if (!payload.name) throw new Error("Category name is required");
          const created = await api.post<any>("/catalog/categories", payload);
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

      <Dialog open={!!subParent} onOpenChange={(o) => { if (!o) setSubParent(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add subcategory</DialogTitle>
            <DialogDescription>
              Creates a child under <span className="font-medium text-foreground">{subParent?.name}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label className="text-xs">Name</Label>
              <Input
                className="mt-1"
                value={subName}
                onChange={(e) => setSubName(e.target.value)}
                placeholder="e.g. Bread"
              />
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={subStatus} onValueChange={setSubStatus}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["active", "inactive", "draft", "archived"].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubParent(null)}>Cancel</Button>
            <Button disabled={subSaving} onClick={() => void createSubcategory()}>
              {subSaving ? "Saving…" : "Add subcategory"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
