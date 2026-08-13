import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download, Plus, Filter, Pencil, Trash2, Eye, ImagePlus, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { SearchableSelect, SearchableMultiSelect, type SelectOption } from "@/components/admin/SearchableSelect";
import { api } from "@/lib/api/client";

export type Column<T> = {
  key: keyof T | string;
  label: string;
  render?: (row: T) => ReactNode;
  className?: string;
};

export type Kpi = { label: string; value: string; hint?: string; tone?: "default" | "success" | "warning" | "destructive" | "info" };

export type FormField = {
  key: string;
  label: string;
  type?: "text" | "number" | "select" | "searchable" | "multiselect" | "image" | "readonly";
  /** Plain select options (string values). */
  options?: string[];
  /** Searchable dropdown options (value/label). */
  selectOptions?: SelectOption[];
  placeholder?: string;
  allowClear?: boolean;
};

/** Relation-like column keys that should prefer searchable dropdowns. */
const SEARCHABLE_KEYS = new Set([
  "category", "categories", "parent", "parentId", "categoryId",
  "supplier", "supplierId", "supplierOrgId", "restaurant", "restaurantId",
  "buyer", "buyerOrgId", "party", "organization", "organizationId",
  "unit", "unitId", "brand", "brandId", "rfq", "rfqId", "po", "purchaseOrderId",
  "invoice", "invoiceId", "driver", "visibility", "method", "scope", "role",
]);

const ENUM_KEYS = new Set(["status", "type", "tone", "priority"]);

function uniqueFromRows(rows: Record<string, any>[], key: string): string[] {
  const seen = new Set<string>();
  for (const r of rows) {
    const v = r?.[key];
    if (v == null || v === "" || v === "—") continue;
    if (Array.isArray(v)) {
      v.forEach((x) => {
        const s = String(x).trim();
        if (s && s !== "—") seen.add(s);
      });
    } else {
      const s = String(v).trim();
      if (s) seen.add(s);
    }
  }
  return Array.from(seen).sort((a, b) => a.localeCompare(b));
}

function toSelectOptions(values: string[]): SelectOption[] {
  return values.map((v) => ({ value: v, label: v }));
}

export function DataPage<T extends Record<string, any>>({
  title,
  description,
  icon,
  kpis = [],
  columns,
  rows: initialRows,
  searchKeys = [],
  filters,
  emptyHint,
  formFields,
  viewFields,
  loadDetail,
  loadEdit,
  renderView,
  lookups,
  idKey = "id",
  entityName: entityNameProp,
  disableCrud = false,
  hideView = false,
  onCreate,
  onUpdate,
  onDelete,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
  kpis?: Kpi[];
  columns: Column<T>[];
  rows: T[];
  searchKeys?: (keyof T | string)[];
  filters?: ReactNode;
  emptyHint?: string;
  formFields?: FormField[];
  /** Fields shown in View dialog (defaults to formFields → columns). */
  viewFields?: FormField[];
  /** Fetch full record when opening View (GET /:id). */
  loadDetail?: (row: T) => Promise<Record<string, any>>;
  /** Fetch extra fields when opening Edit (e.g. selected cuisine IDs). */
  loadEdit?: (row: T) => Promise<Partial<T> | Record<string, any>>;
  /** Extra nested sections under the field grid (items, docs, timeline). */
  renderView?: (detail: Record<string, any>, row: T) => ReactNode;
  /** Prefetched dropdown options keyed by form field name (e.g. category, parent, supplier). */
  lookups?: Record<string, SelectOption[]>;
  idKey?: string;
  entityName?: string;
  disableCrud?: boolean;
  /** Hide the Eye/View action (rare). */
  hideView?: boolean;
  onCreate?: (data: Record<string, any>) => Promise<T | void> | T | void;
  onUpdate?: (id: string, data: Record<string, any>, row: T) => Promise<T | void> | T | void;
  onDelete?: (id: string, row: T) => Promise<void> | void;
}) {
  // Derive a friendly singular entity name from the page title when not provided.
  const entity = entityNameProp ?? (title.replace(/s$/i, "").replace(/\s*&\s*.*$/, "").trim() || "Item");
  const [rows, setRows] = useState<T[]>(initialRows);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<T | null>(null);
  const [viewing, setViewing] = useState<T | null>(null);
  const [viewDetail, setViewDetail] = useState<Record<string, any> | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<T | null>(null);

  // Sync when parent rows change (react-query). Include values so edits refetch into the table.
  const rowsSyncKey = useMemo(
    () =>
      initialRows
        .map((r) => {
          const id = String(r?.[idKey as keyof T] ?? "");
          const name = String((r as any)?.name ?? "");
          const status = String((r as any)?.status ?? "");
          const cats = Array.isArray((r as any)?.categories)
            ? (r as any).categories.join("|")
            : String((r as any)?.categories ?? "");
          const cuisines = Array.isArray((r as any)?.cuisineIds)
            ? (r as any).cuisineIds.join("|")
            : String((r as any)?.cuisines ?? "");
          return `${id}:${name}:${status}:${cats}:${cuisines}`;
        })
        .join(";"),
    [initialRows, idKey],
  );
  useEffect(() => {
    setRows(initialRows);
    // rowsSyncKey encodes identity of the incoming rows
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowsSyncKey]);

  // Auto-derive form fields from columns when not provided — relation fields become searchable.
  const fields: FormField[] = useMemo(() => {
    const enrich = (f: FormField): FormField => {
      if (f.type === "image" || f.type === "readonly") return f;
      if (f.selectOptions && f.selectOptions.length > 0) return f;
      if (f.options?.length && f.type === "select") return f;
      const fromLookup = lookups?.[f.key];
      if (fromLookup?.length) {
        return {
          ...f,
          type: f.type === "multiselect" ? "multiselect" : "searchable",
          selectOptions: fromLookup,
          allowClear: f.allowClear ?? true,
        };
      }
      // Never invent options from *Id columns — unique values are UUIDs and show as labels.
      if (/Id$/i.test(f.key) || f.key === "id") return f;
      if (SEARCHABLE_KEYS.has(f.key) || ENUM_KEYS.has(f.key)) {
        const values = uniqueFromRows(initialRows as Record<string, any>[], f.key);
        if (values.length) {
          if (ENUM_KEYS.has(f.key) && values.length <= 12) {
            return { ...f, type: "select", options: values };
          }
          return { ...f, type: "searchable", selectOptions: toSelectOptions(values), allowClear: f.allowClear ?? true };
        }
      }
      return f;
    };

    if (formFields) return formFields.map(enrich);

    const sample = initialRows[0] ?? {};
    return columns
      .filter((c) => typeof c.key === "string" && c.key !== "actions" && c.key in sample)
      .map((c) => {
        const key = c.key as string;
        const v = sample[key as keyof typeof sample];
        const base: FormField = {
          key,
          label: c.label,
          type: typeof v === "number" ? "number" : "text",
        };
        return enrich(base);
      });
  }, [columns, formFields, initialRows, lookups]);

  const displayViewFields: FormField[] = useMemo(() => {
    if (viewFields?.length) return viewFields;
    if (formFields?.length) return formFields;
    return fields;
  }, [viewFields, formFields, fields]);

  const openView = async (row: T) => {
    setViewing(row);
    setViewDetail(null);
    if (!loadDetail) {
      setViewDetail(row as Record<string, any>);
      return;
    }
    setViewLoading(true);
    try {
      const detail = await loadDetail(row);
      setViewDetail({ ...(row as Record<string, any>), ...(detail || {}) });
    } catch (err) {
      setViewDetail(row as Record<string, any>);
      toast.error(err instanceof Error ? err.message : "Failed to load details");
    } finally {
      setViewLoading(false);
    }
  };

  const closeView = () => {
    setViewing(null);
    setViewDetail(null);
    setViewLoading(false);
  };

  const openEdit = async (row: T) => {
    setEditing(row);
    if (!loadEdit) return;
    try {
      const extra = await loadEdit(row);
      if (!extra) return;
      setEditing((prev) => {
        if (!prev) return prev;
        if (String(prev[idKey as keyof T] ?? "") !== String(row[idKey as keyof T] ?? "")) return prev;
        return { ...prev, ...extra } as T;
      });
    } catch {
      // Keep list-row values if detail fetch fails
    }
  };

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const needle = q.toLowerCase();
    return rows.filter((r) =>
      (searchKeys.length ? searchKeys : Object.keys(r)).some((k) => {
        const v = r[k as keyof T];
        return v != null && String(v).toLowerCase().includes(needle);
      })
    );
  }, [q, rows, searchKeys]);

  const canCreate = Boolean(onCreate) && !disableCrud;
  const canUpdate = Boolean(onUpdate) && !disableCrud;
  const canDelete = Boolean(onDelete) && !disableCrud;
  const canView = !hideView;
  const showRowActions = canUpdate || canDelete || canView;

  const handleSave = async (data: Record<string, any>, isNew: boolean) => {
    try {
      if (isNew) {
        if (!onCreate) {
          toast.error(`Create is not available for ${entity.toLowerCase()}s`);
          return;
        }
        const created = await onCreate(data);
        const id = (created as T | undefined)?.[idKey as keyof T]
          ?? data[idKey]
          ?? `${entity.slice(0, 3).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`;
        const newRow = { ...(created ?? data), [idKey]: id } as T;
        setRows((prev) => [newRow, ...prev]);
        toast.success(`${entity} created`, { description: String(id) });
        setCreating(false);
      } else {
        if (!onUpdate) {
          toast.error(`Save is not available for ${entity.toLowerCase()}s — wire an API handler`);
          return;
        }
        const rowId = String(editing?.[idKey as keyof T] ?? "");
        const updated = await onUpdate(rowId, data, editing as T);
        setRows((prev) => prev.map((r) => (
          r[idKey as keyof T] === editing?.[idKey as keyof T]
            ? ({ ...r, ...(updated ?? data) } as T)
            : r
        )));
        toast.success(`${entity} updated`);
        setEditing(null);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to save ${entity.toLowerCase()}`);
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    if (!onDelete) {
      toast.error(`Delete is not available for ${entity.toLowerCase()}s`);
      setDeleting(null);
      return;
    }
    try {
      const rowId = String(deleting[idKey as keyof T] ?? "");
      await onDelete(rowId, deleting);
      setRows((prev) => prev.filter((r) => r[idKey as keyof T] !== deleting[idKey as keyof T]));
      toast.success(`${entity} deleted`, { description: rowId });
      setDeleting(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to delete ${entity.toLowerCase()}`);
    }
  };

  const handleExport = () => {
    const headerKeys = columns.filter((c) => typeof c.key === "string" && c.key !== "actions").map((c) => c.key as string);
    const csv = [
      headerKeys.join(","),
      ...filtered.map((r) =>
        headerKeys.map((k) => {
          const v = r[k as keyof T];
          const s = Array.isArray(v) ? v.join("; ") : String(v ?? "");
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        }).join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export complete", { description: `${filtered.length} rows` });
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {icon && (
            <div className="h-11 w-11 rounded-xl glass grid place-items-center shrink-0">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-display font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{description}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4 mr-1.5" />Export</Button>
          {canCreate && (
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4 mr-1.5" />New {entity}
            </Button>
          )}
        </div>
      </div>

      {kpis.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-xl border border-border bg-card p-4 shadow-soft">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{k.label}</div>
              <div className={cn(
                "mt-1 text-2xl font-display font-semibold",
                k.tone === "success" && "text-success",
                k.tone === "warning" && "text-warning",
                k.tone === "destructive" && "text-destructive",
                k.tone === "info" && "text-info",
              )}>{k.value}</div>
              {k.hint && <div className="text-xs text-muted-foreground mt-0.5">{k.hint}</div>}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
        <div className="p-4 flex flex-wrap items-center gap-2 border-b border-border">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search..."
              className="pl-9 h-9"
            />
          </div>
          {filters ?? (
            <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-1.5" />Filter</Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left">
                {columns.map((c) => (
                  <th key={String(c.key)} className={cn("px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground", c.className)}>
                    {c.label}
                  </th>
                ))}
                {showRowActions && <th className="px-4 py-3 w-[1%]"></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (showRowActions ? 1 : 0)} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    {emptyHint ?? "No results found."}
                  </td>
                </tr>
              ) : (
                filtered.map((row, i) => (
                  <tr key={String(row[idKey as keyof T] ?? i)} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    {columns.map((c) => (
                      <td key={String(c.key)} className={cn("px-4 py-3", c.className)}>
                        {c.render ? c.render(row) : String(row[c.key as keyof T] ?? "—")}
                      </td>
                    ))}
                    {showRowActions && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex gap-1 justify-end">
                          {canUpdate && (
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => void openEdit(row)} aria-label="Edit">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleting(row)} aria-label="Delete">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canView && (
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => void openView(row)} aria-label="View">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>Showing {filtered.length} of {rows.length}</span>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" disabled>Previous</Button>
            <Button variant="ghost" size="sm" disabled>Next</Button>
          </div>
        </div>
      </div>

      {/* Create / Edit dialog */}
      <RecordDialog
        open={creating || editing !== null}
        onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null); } }}
        entity={entity}
        fields={fields}
        initial={editing ?? undefined}
        onSubmit={(data) => handleSave(data, creating)}
      />

      {/* View dialog */}
      <Dialog open={viewing !== null} onOpenChange={(o) => { if (!o) closeView(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] !flex !flex-col overflow-hidden gap-4">
          <DialogHeader className="shrink-0 pr-8">
            <DialogTitle>View {entity.toLowerCase()}</DialogTitle>
            <DialogDescription>Read-only details for this record.</DialogDescription>
          </DialogHeader>
          {viewLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Loading details…</div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain space-y-6 py-1 pr-1 max-h-[calc(90vh-11.5rem)]">
              <div className="grid gap-4 sm:grid-cols-2">
                {displayViewFields.map((f) => {
                  const source = viewDetail ?? viewing;
                  const raw = source?.[f.key];
                  const col = columns.find((c) => String(c.key) === f.key);
                  let display: ReactNode = "—";
                  if (raw != null && raw !== "") {
                    if (col?.render && viewing) {
                      // Prefer formatted column render when value lives on the list row.
                      try {
                        display = col.render({ ...viewing, ...source, [f.key]: raw } as T);
                      } catch {
                        display = formatViewValue(raw, f);
                      }
                    } else {
                      display = formatViewValue(raw, f);
                    }
                  }
                  return (
                    <div key={f.key} className={cn(displayViewFields.length === 1 && "sm:col-span-2")}>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">{f.label}</div>
                      <div className="mt-1 text-sm font-medium break-words">{display}</div>
                    </div>
                  );
                })}
              </div>
              {viewDetail && renderView && viewing ? renderView(viewDetail, viewing) : null}
            </div>
          )}
          <DialogFooter className="shrink-0 border-t border-border pt-4 bg-background">
            <Button type="button" variant="outline" onClick={closeView}>Close</Button>
            {canUpdate && viewing && (
              <Button type="button" onClick={() => { void openEdit(viewing); closeView(); }}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" />Edit
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {entity.toLowerCase()}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <span className="font-mono">{deleting ? String(deleting[idKey as keyof T]) : ""}</span>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ImageUrlField({
  value,
  onChange,
  onFileIdChange,
  disabled,
  placeholder,
}: {
  value: string;
  onChange: (url: string) => void;
  onFileIdChange?: (fileId: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onPick = async (file: File | null) => {
    if (!file || disabled) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("purpose", "product");
      const uploaded = await api.post<{ id?: string; cdnUrl?: string }>("/files/upload", form);
      const url = uploaded?.cdnUrl ? String(uploaded.cdnUrl) : "";
      if (!url) throw new Error("Upload succeeded but no CDN URL returned");
      onChange(url);
      if (uploaded?.id) onFileIdChange?.(String(uploaded.id));
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="mt-1 space-y-2">
      <div className="flex items-start gap-3">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md border border-border bg-muted/40 flex items-center justify-center">
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2 min-w-0">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={disabled || uploading}
            onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <ImagePlus className="h-3.5 w-3.5" />
                  {value ? "Replace picture" : "Upload picture"}
                </>
              )}
            </Button>
            {value ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled || uploading}
                onClick={() => {
                  onChange("");
                  onFileIdChange?.("");
                }}
              >
                <X className="h-3.5 w-3.5" />
                Remove
              </Button>
            ) : null}
          </div>
          <p className="text-[11px] text-muted-foreground truncate">
            {value || placeholder || "Saved as DigitalOcean CDN URL on the product."}
          </p>
        </div>
      </div>
    </div>
  );
}

function RecordDialog({
  open, onOpenChange, entity, fields, initial, onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  entity: string;
  fields: FormField[];
  initial?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => void | Promise<void>;
}) {
  const isEdit = !!initial;
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  // Reset form when dialog opens — normalize arrays (e.g. categories) for inputs
  useEffect(() => {
    if (open) {
      const init: Record<string, any> = {};
      fields.forEach((f) => {
        const raw = initial?.[f.key];
        if (f.type === "multiselect") {
          if (Array.isArray(raw)) {
            init[f.key] = raw.map(String).filter(Boolean);
          } else if (raw == null || raw === "" || raw === "—") {
            init[f.key] = [] as string[];
          } else {
            init[f.key] = String(raw)
              .split(/[,;|]/)
              .map((s) => s.trim())
              .filter(Boolean);
          }
        } else if (Array.isArray(raw)) {
          init[f.key] = raw[0] != null ? String(raw[0]) : "";
        } else if (raw == null) {
          init[f.key] = f.type === "number" ? 0 : "";
        } else {
          init[f.key] = raw;
        }
      });
      setForm(init);
      setSaving(false);
      savingRef.current = false;
    }
  }, [open, initial, fields]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      await onSubmit(form);
    } catch {
      // Parent toasts the error; re-enable so the user can retry.
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (savingRef.current && !o) return;
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] !flex !flex-col overflow-hidden gap-4">
        <DialogHeader className="shrink-0 pr-8">
          <DialogTitle>{isEdit ? `Edit ${entity.toLowerCase()}` : `New ${entity.toLowerCase()}`}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update fields and save changes." : `Add a new ${entity.toLowerCase()} to the system.`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 max-h-[calc(90vh-11.5rem)]">
            <fieldset disabled={saving} className="min-w-0 border-0 p-0 m-0">
            <div className="grid gap-4 sm:grid-cols-2 pb-4">
              {fields.map((f) => (
                <div
                  key={f.key}
                  className={cn(
                    (fields.length === 1 || f.type === "image" || f.type === "multiselect") && "sm:col-span-2",
                  )}
                >
                  <Label htmlFor={f.key} className="text-xs">{f.label}</Label>
                  {f.type === "image" ? (
                    <ImageUrlField
                      value={String(form[f.key] ?? "")}
                      onChange={(v) => setForm((p) => ({ ...p, [f.key]: v }))}
                      onFileIdChange={(fileId) =>
                        setForm((p) => ({ ...p, imageFileId: fileId }))
                      }
                      disabled={saving}
                      placeholder={f.placeholder}
                    />
                  ) : f.type === "readonly" ? (
                    <Input
                      id={f.key}
                      value={form[f.key] ? String(form[f.key]) : ""}
                      placeholder={f.placeholder ?? "Auto-generated"}
                      readOnly
                      disabled
                      className="mt-1 font-mono text-xs bg-muted/40"
                    />
                  ) : f.type === "multiselect" ? (
                    <SearchableMultiSelect
                      value={form[f.key] ?? []}
                      onChange={(v) => setForm((p) => ({ ...p, [f.key]: v }))}
                      options={f.selectOptions ?? []}
                      placeholder={f.placeholder ?? `Select ${f.label.toLowerCase()}…`}
                      disabled={saving}
                    />
                  ) : f.type === "searchable" || (f.selectOptions && f.selectOptions.length > 0) ? (
                    <SearchableSelect
                      value={String(form[f.key] ?? "")}
                      onChange={(v) => setForm((p) => ({ ...p, [f.key]: v }))}
                      options={f.selectOptions ?? []}
                      placeholder={f.placeholder ?? `Search ${f.label.toLowerCase()}…`}
                      allowClear={f.allowClear !== false}
                      disabled={saving}
                    />
                  ) : f.type === "select" && f.options ? (
                    <Select
                      value={String(form[f.key] ?? "")}
                      onValueChange={(v) => setForm((p) => ({ ...p, [f.key]: v }))}
                      disabled={saving}
                    >
                      <SelectTrigger className="mt-1"><SelectValue placeholder={`Select ${f.label.toLowerCase()}`} /></SelectTrigger>
                      <SelectContent>
                        {f.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id={f.key}
                      type={f.type === "number" ? "number" : "text"}
                      placeholder={f.placeholder}
                      value={form[f.key] ?? ""}
                      onChange={(e) => setForm((p) => ({
                        ...p,
                        [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value,
                      }))}
                      className="mt-1"
                    />
                  )}
                </div>
              ))}
            </div>
            </fieldset>
          </div>
          <DialogFooter className="shrink-0 border-t border-border pt-4 mt-0 bg-background">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving
                ? (isEdit ? "Saving…" : "Creating…")
                : (isEdit ? "Save changes" : `Create ${entity.toLowerCase()}`)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function labelFromObject(o: Record<string, unknown>): string {
  for (const key of ["name", "label", "title", "slug", "email", "number", "code"] as const) {
    const v = o[key];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return "";
}

function formatViewValue(raw: unknown, field: FormField): ReactNode {
  if (raw == null || raw === "") return "—";
  if (Array.isArray(raw)) {
    if (!raw.length) return "—";
    if (raw.every((x) => x == null || typeof x !== "object")) return raw.map(String).join(", ");
    const labels = raw
      .map((x) => {
        if (x == null) return "";
        if (typeof x !== "object") return String(x);
        return labelFromObject(x as Record<string, unknown>);
      })
      .filter(Boolean);
    if (labels.length) return labels.join(", ");
    return `${raw.length} item(s)`;
  }
  if (typeof raw === "object") {
    const labeled = labelFromObject(raw as Record<string, unknown>);
    if (labeled) return labeled;
    try {
      return JSON.stringify(raw);
    } catch {
      return "[object]";
    }
  }
  const opt = field.selectOptions?.find((o) => o.value === String(raw) || o.label === String(raw));
  return opt?.label ?? String(raw);
}

/** Section heading + body for nested View content (line items, timeline, etc.). */
export function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2 border-t border-border pt-4">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}

/** Compact key/value list for nested objects. */
export function DetailKv({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">{r.label}</div>
          <div className="mt-1 text-sm font-medium break-words">{r.value ?? "—"}</div>
        </div>
      ))}
    </div>
  );
}

/** Simple nested table for line items / documents. */
export function DetailTable({
  columns,
  rows,
  empty = "None",
}: {
  columns: { key: string; label: string; render?: (row: any) => ReactNode; className?: string }[];
  rows: any[];
  empty?: string;
}) {
  if (!rows?.length) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30 text-left">
            {columns.map((c) => (
              <th key={c.key} className={cn("px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground", c.className)}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={String(row.id ?? i)} className="border-b border-border last:border-0">
              {columns.map((c) => (
                <td key={c.key} className={cn("px-3 py-2", c.className)}>
                  {c.render ? c.render(row) : String(row[c.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StatusBadge({ status, tone }: { status: string; tone?: "success" | "warning" | "destructive" | "info" | "default" }) {
  const t = tone ?? inferTone(status);
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border",
      t === "success" && "bg-success/10 text-success border-success/20",
      t === "warning" && "bg-warning/10 text-warning border-warning/20",
      t === "destructive" && "bg-destructive/10 text-destructive border-destructive/20",
      t === "info" && "bg-info/10 text-info border-info/20",
      t === "default" && "bg-muted text-muted-foreground border-border",
    )}>
      <span className={cn(
        "h-1.5 w-1.5 rounded-full",
        t === "success" && "bg-success",
        t === "warning" && "bg-warning",
        t === "destructive" && "bg-destructive",
        t === "info" && "bg-info",
        t === "default" && "bg-muted-foreground",
      )} />
      {status}
    </span>
  );
}

function inferTone(status: string): "success" | "warning" | "destructive" | "info" | "default" {
  const s = status.toLowerCase();
  if (["active","verified","approved","delivered","paid","resolved","sent","published","success","completed","online","open"].includes(s)) return "success";
  if (["pending","processing","draft","review","queued","dispatched","ready","scheduled"].includes(s)) return "info";
  if (["flagged","delayed","warning","at risk","overdue","high"].includes(s)) return "warning";
  if (["suspended","rejected","failed","closed","critical","blocked","banned"].includes(s)) return "destructive";
  return "default";
}

export const AED = (n: number) => `AED ${n.toLocaleString("en-AE", { maximumFractionDigits: 0 })}`;
