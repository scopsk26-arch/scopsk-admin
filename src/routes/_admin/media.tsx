import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, ImagePlus, Images, Loader2, Search, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, asArray, num, str } from "@/lib/api/client";
import { fetchList } from "@/lib/api/resources";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_admin/media")({
  head: () => ({ meta: [{ title: "Media Library — ResPy" }] }),
  component: MediaLibraryPage,
});

type MediaFile = {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
  purpose: string;
  createdAt: string;
};

function formatBytes(n: number) {
  if (!n || n < 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function mapFile(r: any): MediaFile {
  return {
    id: str(r.id),
    name: str(r.originalName || r.fileName, "file"),
    url: str(r.cdnUrl, ""),
    size: num(r.size),
    mimeType: str(r.mimeType, ""),
    purpose: str(r.purpose, ""),
    createdAt: r.createdAt ? String(r.createdAt) : "",
  };
}

function MediaLibraryPage() {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: files = [], isLoading, isError } = useQuery({
    queryKey: ["admin", "media-library"],
    queryFn: async () => {
      const list = await fetchList("/files", { imagesOnly: true, limit: 100 });
      return asArray(list).map(mapFile).filter((f) => f.id && f.url);
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "media-library"] });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => api.delete(`/files/${id}`),
    onSuccess: async () => {
      toast.success("Image deleted");
      await invalidate();
    },
    onError: (err: Error) => toast.error(err.message || "Delete failed"),
  });

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return files;
    return files.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.url.toLowerCase().includes(q) ||
        f.purpose.toLowerCase().includes(q),
    );
  }, [files, filter]);

  const onUpload = async (picked: FileList | null) => {
    if (!picked?.length) return;
    setUploading(true);
    let ok = 0;
    let fail = 0;
    try {
      for (const file of Array.from(picked)) {
        try {
          const form = new FormData();
          form.append("file", file);
          form.append("purpose", "media_library");
          form.append("entityType", "media_library");
          await api.post("/files/upload", form);
          ok += 1;
        } catch {
          fail += 1;
        }
      }
      if (ok) toast.success(ok === 1 ? "Image uploaded" : `${ok} images uploaded`);
      if (fail) toast.error(`${fail} upload(s) failed`);
      await invalidate();
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const copyUrl = async (url: string) => {
    if (!url) {
      toast.error("No CDN URL on this file");
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("CDN URL copied");
    } catch {
      toast.error("Could not copy — select the URL manually");
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-xl glass grid place-items-center">
            <Images className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-semibold tracking-tight">Media Library</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Upload images to DigitalOcean Spaces. Copy the CDN URL into dishes, banners, or catalog.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={uploading}
            onChange={(e) => onUpload(e.target.files)}
          />
          <Button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-1.5" />
                Upload
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4 text-sm space-y-2">
        <p className="font-semibold">Image tip: 16:9 landscape works best (e.g. 2560 × 1440)</p>
        <ul className="list-disc pl-5 text-muted-foreground space-y-1">
          <li>Crop banners and dish photos before upload.</li>
          <li>
            Compress with{" "}
            <a
              href="https://tinypng.com"
              target="_blank"
              rel="noreferrer"
              className="text-primary underline-offset-2 hover:underline"
            >
              tinypng.com
            </a>{" "}
            to keep uploads fast.
          </li>
          <li>
            After upload, use <strong>Copy URL</strong> and paste into CK Dishes / Banners / Catalog.
          </li>
        </ul>
        <p className="text-muted-foreground">
          Need a dish image? Open{" "}
          <Link to="/ck-dishes" className="text-primary underline-offset-2 hover:underline">
            CK Dishes
          </Link>{" "}
          and paste the CDN URL in the Image field.
        </p>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by name or URL…"
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading media…</p>
      ) : isError ? (
        <p className="text-sm text-destructive">
          Could not load files. Ensure the API exposes GET /files and you have upload permission.
        </p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
          <ImagePlus className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">No images yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Click Upload to add files to DigitalOcean Spaces.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((file) => (
            <div
              key={file.id}
              className={cn(
                "rounded-xl border border-border bg-card shadow-soft overflow-hidden flex flex-col",
              )}
            >
              <div className="aspect-video bg-muted/40 relative">
                {file.mimeType.startsWith("image/") || /\.(jpe?g|png|gif|webp|svg)(\?|$)/i.test(file.url) ? (
                  <img
                    src={file.url}
                    alt={file.name}
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center text-xs text-muted-foreground">
                    {file.mimeType || "file"}
                  </div>
                )}
              </div>
              <div className="p-3 space-y-2 flex-1 flex flex-col">
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{formatBytes(file.size)}</p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => copyUrl(file.url)}
                >
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  Copy URL
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full text-destructive hover:text-destructive"
                  disabled={deleteMut.isPending}
                  onClick={() => {
                    if (confirm(`Delete “${file.name}”?`)) deleteMut.mutate(file.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
