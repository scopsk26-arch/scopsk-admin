import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, Upload } from "lucide-react";
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

/** Same column order as the importer — edit in Excel, save, then upload. */
const SAMPLE_HEADERS = [
  "name",
  "basePrice",
  "id",
  "cloudKitchenId",
  "description",
  "category",
  "currency",
  "status",
  "prepMinutes",
  "produced",
  "ingredients",
  "bulkPricing",
  "imageUrl",
] as const;

const SAMPLE_ROWS: string[][] = [
  [
    "Chicken Biryani",
    "28.50",
    "",
    "",
    "Classic cloud-kitchen biryani",
    "Rice",
    "AED",
    "available",
    "35",
    "50",
    "chicken, rice, spices",
    "",
    "",
  ],
  [
    "Veg Pasta",
    "22.00",
    "",
    "",
    "Creamy vegetable pasta",
    "Pasta",
    "AED",
    "available",
    "20",
    "30",
    "pasta, cream, vegetables",
    "",
    "",
  ],
];

function csvEscape(value: string) {
  const v = String(value ?? "");
  if (/[",\r\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Downloads an unlocked .xlsx sample (editable in Excel).
 * Falls back to a client-generated CSV if the static file is unavailable.
 */
async function downloadSampleExcel() {
  try {
    const res = await fetch(`/samples/ck-dishes-sample.xlsx?v=${Date.now()}`);
    if (!res.ok) throw new Error("Sample file not found");
    const blob = await res.blob();
    triggerDownload(blob, "ck-dishes-sample.xlsx");
    toast.success("Sample Excel downloaded", {
      description: "If Excel shows Protected View, click Enable Editing — then edit cells freely.",
    });
    return;
  } catch {
    /* fall through to CSV */
  }

  const blankRows = Array.from({ length: 8 }, () => SAMPLE_HEADERS.map(() => ""));
  const lines = [
    SAMPLE_HEADERS.map(csvEscape).join(","),
    ...SAMPLE_ROWS.map((row) => row.map(csvEscape).join(",")),
    ...blankRows.map((row) => row.map(csvEscape).join(",")),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8",
  });
  triggerDownload(blob, "ck-dishes-sample.csv");
  toast.success("Sample CSV downloaded", {
    description: "Open in Excel, edit cells, save, then upload.",
  });
}

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
      if (!file) throw new Error("Choose a CSV/Excel file to upload");
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
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-xl glass grid place-items-center">
            <Upload className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-semibold tracking-tight">CK Bulk Import</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Download the sample, open it in Excel (fully editable), fill rows in the same column
              order, save locally, then upload. Required: <code>name</code>, <code>basePrice</code>.
              Include <code>id</code> to update an existing dish.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Optional: <code>cloudKitchenId</code>, <code>description</code>, <code>category</code>,{" "}
              <code>currency</code>, <code>status</code>, <code>prepMinutes</code>, <code>produced</code>,{" "}
              <code>ingredients</code>, <code>bulkPricing</code>, <code>imageUrl</code>.
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => void downloadSampleExcel()}>
          <Download className="h-4 w-4 mr-1.5" />
          Download sample Excel
        </Button>
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
          <Label className="text-xs text-muted-foreground">File (CSV or Excel export)</Label>
          <Input
            type="file"
            accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
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
