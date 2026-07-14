import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { Code2 } from "lucide-react";
import { toast } from "sonner";
import {
  EMPTY_LIST,
  createApiKey,
  fetchApiKeys,
  revokeApiKey,
} from "@/lib/api/resources";

export const Route = createFileRoute("/_admin/api")({
  head: () => ({ meta: [{ title: "API Management — Prime Plate" }] }),
  component: ApiKeysPage,
});

function ApiKeysPage() {
  const qc = useQueryClient();
  const { data: rows = EMPTY_LIST, isLoading, isError } = useQuery({
    queryKey: ["admin", "api-keys"],
    queryFn: fetchApiKeys,
  });

  const active = rows.filter((r: any) => r.status === "active").length;
  const calls24h = rows.reduce((s: number, r: any) => s + (Number(r.calls24h) || 0), 0);

  return (
    <DataPage
      title="API Management"
      description="API keys, scopes, rate limits and live request monitoring."
      icon={<Code2 className="h-5 w-5 text-primary" />}
      entityName="API Key"
      formFields={[
        { key: "label", label: "Label", type: "text", placeholder: "Production — Web" },
        { key: "scope", label: "Scopes", type: "text", placeholder: "read:catalog write:rfq" },
      ]}
      kpis={[
        { label: "Active keys", value: String(active), tone: "success" },
        { label: "Calls (24h)", value: calls24h > 0 ? calls24h.toLocaleString() : "—", tone: "info" },
        { label: "Total keys", value: String(rows.length) },
        { label: "Revoked", value: String(rows.filter((r: any) => r.status === "suspended").length), tone: "warning" },
      ]}
      rows={rows}
      searchKeys={["id", "label", "scope"]}
      emptyHint={isLoading ? "Loading…" : isError ? "Failed to load API keys." : "No API keys yet."}
      columns={[
        {
          key: "id",
          label: "Key ID",
          className: "font-mono text-xs",
          render: (r) => (r.keyPrefix ? `${r.keyPrefix}…` : String(r.id).slice(0, 8)),
        },
        { key: "label", label: "Label", render: (r) => <span className="font-medium">{r.label}</span> },
        { key: "scope", label: "Scope", className: "font-mono text-xs text-muted-foreground" },
        { key: "calls24h", label: "Calls (24h)", render: (r) => (r.calls24h ? String(r.calls24h) : "—") },
        { key: "lastUsed", label: "Last used" },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
      onCreate={async (data) => {
        const created = await createApiKey({
          name: String(data.label || data.name || "API Key"),
          scopes: data.scope || data.scopes,
        });
        const plaintext = created?.key;
        if (plaintext) {
          toast.success("API key created — copy now", {
            description: plaintext,
            duration: 20_000,
          });
        } else {
          toast.success("API key created");
        }
        await qc.invalidateQueries({ queryKey: ["admin", "api-keys"] });
        // Never put full secret into the table row
        return {
          id: String(created?.id ?? ""),
          label: String(created?.name ?? data.label ?? "API Key"),
          scope: typeof created?.scopes === "string"
            ? created.scopes
            : String(data.scope || "—"),
          calls24h: 0,
          lastUsed: "—",
          status: "active",
          keyPrefix: created?.keyPrefix ?? "",
        };
      }}
      onUpdate={async () => {
        throw new Error("API keys cannot be edited — revoke and create a new key");
      }}
      onDelete={async (id) => {
        await revokeApiKey(id);
        toast.success("API key revoked");
        await qc.invalidateQueries({ queryKey: ["admin", "api-keys"] });
      }}
    />
  );
}
