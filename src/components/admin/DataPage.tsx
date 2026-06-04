import { useMemo, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download, Plus, Filter, Pencil, Trash2, MoreHorizontal } from "lucide-react";
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
  type?: "text" | "number" | "select";
  options?: string[];
  placeholder?: string;
};

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
  idKey = "id",
  entityName = "Record",
  disableCrud = false,
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
  idKey?: string;
  entityName?: string;
  disableCrud?: boolean;
}) {
  const [rows, setRows] = useState<T[]>(initialRows);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<T | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<T | null>(null);

  // Auto-derive form fields from columns when not provided.
  const fields: FormField[] = useMemo(() => {
    if (formFields) return formFields;
    const sample = initialRows[0] ?? {};
    return columns
      .filter((c) => typeof c.key === "string" && c.key !== "actions" && c.key in sample)
      .map((c) => {
        const v = sample[c.key as keyof typeof sample];
        const type: FormField["type"] = typeof v === "number" ? "number" : "text";
        return { key: c.key as string, label: c.label, type };
      });
  }, [columns, formFields, initialRows]);

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

  const handleSave = (data: Record<string, any>, isNew: boolean) => {
    if (isNew) {
      const id = data[idKey] || `${entityName.slice(0, 3).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`;
      const newRow = { ...data, [idKey]: id } as T;
      setRows((prev) => [newRow, ...prev]);
      toast.success(`${entityName} created`, { description: String(id) });
      setCreating(false);
    } else {
      setRows((prev) => prev.map((r) => (r[idKey as keyof T] === editing?.[idKey as keyof T] ? ({ ...r, ...data } as T) : r)));
      toast.success(`${entityName} updated`);
      setEditing(null);
    }
  };

  const handleDelete = () => {
    if (!deleting) return;
    setRows((prev) => prev.filter((r) => r[idKey as keyof T] !== deleting[idKey as keyof T]));
    toast.success(`${entityName} deleted`, { description: String(deleting[idKey as keyof T]) });
    setDeleting(null);
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
          {!disableCrud && (
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4 mr-1.5" />New {entityName}
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
                {!disableCrud && <th className="px-4 py-3 w-[1%]"></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (disableCrud ? 0 : 1)} className="px-4 py-12 text-center text-sm text-muted-foreground">
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
                    {!disableCrud && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex gap-1 justify-end">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(row)} aria-label="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleting(row)} aria-label="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="More">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
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
        entityName={entityName}
        fields={fields}
        initial={editing ?? undefined}
        onSubmit={(data) => handleSave(data, creating)}
      />

      {/* Delete confirmation */}
      <AlertDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {entityName.toLowerCase()}?</AlertDialogTitle>
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

function RecordDialog({
  open, onOpenChange, entityName, fields, initial, onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  entityName: string;
  fields: FormField[];
  initial?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => void;
}) {
  const isEdit = !!initial;
  const [form, setForm] = useState<Record<string, any>>({});

  // Reset form when dialog opens
  useMemo(() => {
    if (open) {
      const init: Record<string, any> = {};
      fields.forEach((f) => { init[f.key] = initial?.[f.key] ?? (f.type === "number" ? 0 : ""); });
      setForm(init);
    }
  }, [open, initial, fields]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${entityName.toLowerCase()}` : `New ${entityName.toLowerCase()}`}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update fields and save changes." : `Add a new ${entityName.toLowerCase()} to the system.`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.key} className={cn(fields.length === 1 && "sm:col-span-2")}>
                <Label htmlFor={f.key} className="text-xs">{f.label}</Label>
                {f.type === "select" && f.options ? (
                  <Select value={String(form[f.key] ?? "")} onValueChange={(v) => setForm((p) => ({ ...p, [f.key]: v }))}>
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{isEdit ? "Save changes" : `Create ${entityName.toLowerCase()}`}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
