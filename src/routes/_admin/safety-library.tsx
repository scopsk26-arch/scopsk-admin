import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, asArray } from "@/lib/api/client";
import { Shield } from "lucide-react";

export const Route = createFileRoute("/_admin/safety-library")({
  head: () => ({ meta: [{ title: "Food safety — ScopsK" }] }),
  component: SafetyLibraryPage,
});

function SafetyLibraryPage() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["safety-library"],
    queryFn: () => api.get<unknown>("/admin/safety-documents"),
  });
  const rows = asArray<{ id: string; title: string; audience: string }>(list.data);
  const [title, setTitle] = useState("");
  const [audience, setAudience] = useState("both");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!file || title.trim().length < 2) {
      setError("Add a name and the client file.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("purpose", "safety_library");
      const uploaded = await api.post<{ id?: string }>("/files/upload", form);
      const fileId = uploaded?.id;
      if (!fileId) throw new Error("Upload did not return a file");
      await api.post("/admin/safety-documents", { title: title.trim(), fileId, audience });
      setTitle("");
      setFile(null);
      await qc.invalidateQueries({ queryKey: ["safety-library"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the file");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5" />
        <h1 className="text-xl font-semibold">Food safety library</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Upload the client’s hygiene checklist, food code, and safety files. The app shows the names. Only an active subscription can open them.
      </p>
      <div className="grid max-w-lg gap-3">
        <input className="rounded border px-3 py-2" placeholder="File name" value={title} onChange={(e) => setTitle(e.target.value)} />
        <select className="rounded border px-3 py-2" value={audience} onChange={(e) => setAudience(e.target.value)}>
          <option value="both">Restaurants and suppliers</option>
          <option value="restaurant">Restaurants only</option>
          <option value="supplier">Suppliers only</option>
        </select>
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button type="button" className="rounded bg-black px-3 py-2 text-white disabled:opacity-50" disabled={busy} onClick={() => void save()}>
          {busy ? "Saving…" : "Add file"}
        </button>
      </div>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
            <span>{row.title} · {row.audience}</span>
            <button
              type="button"
              className="text-red-600"
              onClick={() => {
                void api.delete(`/admin/safety-documents/${row.id}`).then(() => qc.invalidateQueries({ queryKey: ["safety-library"] }));
              }}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
