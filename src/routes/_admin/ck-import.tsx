import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/admin/SearchableSelect";
import { fetchList, importCloudKitchenDishes } from "@/lib/api/resources";
import { num, str } from "@/lib/api/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/ck-import")({
  head: () => ({ meta: [{ title: "CK Bulk Import — ResPy" }] }),
  component: CkImportPage,
});

type ImportResult = {
  imported?: number;
  created?: number;
  updated?: number;
  failed?: number;
  errors?: Array<{ row: number; error: string }>;
};

function CkImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [cloudKitchenId, setCloudKitchenId] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  const { data: kitchens = [] } = useQuery({
    queryKey: ["cloud-kitchen", "kitchens"],
    queryFn: async () => {
      try {
        const list = await fetchList("/cloud-kitchen/kitchens");
        return list
          .map((k: any) => ({
            value: str(k.id),
            label: str(k.name, k.id),
          }))
          .filter((o) => o.value);
      } catch {
        return [];
      }
    },
    staleTime: 60_000,
  });

  const kitchenOptions = useMemo(() => kitchens, [kitchens]);

  const importMut = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Choose a CSV file to upload");
      return importCloudKitchenDishes(file, cloudKitchenId || undefined);
    },
    onSuccess: (data) => {
      setResult(data || {});
      const created = num(data?.created ?? data?.imported);
      const updated = num(data?.updated);
      const failed = num(data?.failed);
      const parts = [
        created ? `${created} created` : "",
        updated ? `${updated} updated` : "",
        failed ? `${failed} failed` : "",
      ].filter(Boolean);
      toast.success(`Import finished — ${parts.join(", ") || "done"}`);
    },
    onError: (err: Error) => toast.error(err.message || "Import failed"),
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-xl glass grid place-items-center">
          <Upload className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-semibold tracking-tight">CK Bulk Import</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload a CSV of cloud-kitchen dishes. Required columns: <code>name</code>,{" "}
            <code>basePrice</code>. Include an <code>id</code> column (dish UUID) to update an
            existing row instead of creating a new one.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Optional columns: <code>cloudKitchenId</code>, <code>description</code>,{" "}
            <code>category</code>, <code>currency</code>, <code>status</code> (or{" "}
            <code>availability</code>), <code>prepMinutes</code>, <code>produced</code>,{" "}
            <code>ingredients</code>, <code>bulkPricing</code> (JSON), <code>imageUrl</code>.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-4 max-w-2xl">
        <div>
          <Label className="text-xs text-muted-foreground">Default cloud kitchen (optional)</Label>
          <div className="mt-1">
            <SearchableSelect
              options={kitchenOptions}
              value={cloudKitchenId}
              onChange={setCloudKitchenId}
              placeholder="Use CSV cloudKitchenId column if empty…"
              allowClear
            />
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">CSV file</Label>
          <Input
            type="file"
            accept=".csv,text/csv"
            className="mt-1"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setResult(null);
            }}
          />
          {file ? (
            <p className="text-xs text-muted-foreground mt-1">
              Selected: {file.name} ({Math.round(file.size / 1024)} KB)
            </p>
          ) : null}
        </div>
        <div className="flex justify-end">
          <Button disabled={!file || importMut.isPending} onClick={() => importMut.mutate()}>
            {importMut.isPending ? "Uploading…" : "Upload & import"}
          </Button>
        </div>
      </div>

      {result ? (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Created: </span>
              <span className="font-semibold text-primary">
                {num(result.created ?? result.imported)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Updated: </span>
              <span className="font-semibold text-primary">{num(result.updated)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Failed: </span>
              <span className="font-semibold text-destructive">{num(result.failed)}</span>
            </div>
          </div>
          {(result.errors || []).length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Row</th>
                    <th className="py-2 font-medium">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {(result.errors || []).map((err, i) => (
                    <tr key={`${err.row}-${i}`} className="border-b border-border/60">
                      <td className="py-2 pr-4 font-mono text-xs">{err.row}</td>
                      <td className="py-2 text-destructive">{err.error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No row-level errors reported.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
