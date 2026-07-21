import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { approveKyc, fetchList, rejectKyc } from "@/lib/api/resources";
import { str } from "@/lib/api/client";

export const Route = createFileRoute("/_admin/kyc")({
  head: () => ({ meta: [{ title: "KYC Queue — Prime Plate" }] }),
  component: KycPage,
});

type KycDoc = {
  type: string;
  name: string;
  url: string | null;
};

function KycPage() {
  const queryClient = useQueryClient();

  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["kyc", "applications"],
    queryFn: async () => {
      const list = await fetchList("/kyc/applications");
      return list.map((r: any) => {
        const documents: KycDoc[] = (r.documents || []).map((d: any) => ({
          type: str(d.documentType ?? d.type, "document"),
          name: str(d.file?.originalName ?? d.file?.fileName, "File"),
          url: d.file?.cdnUrl ? String(d.file.cdnUrl) : null,
        }));
        return {
          id: str(r.id),
          entity: str(r.organization?.name ?? r.organizationId, "—"),
          type: str(r.type, "—"),
          submitted: r.submittedAt
            ? String(r.submittedAt).slice(0, 10)
            : r.createdAt
              ? String(r.createdAt).slice(0, 10)
              : "—",
          priority: str(r.priority ?? r.metadata?.priority, "medium"),
          reviewer: str(r.reviewer?.email ?? r.reviewedBy, "—"),
          status: str(r.status, "pending"),
          docCount: documents.length,
          documents,
          notes: "",
        };
      });
    },
  });

  const pending = rows.filter((r) =>
    ["pending", "review", "submitted", "under_review"].includes(r.status),
  ).length;
  const approved = rows.filter((r) => r.status === "approved").length;

  return (
    <DataPage
      title="KYC Queue"
      description="Review restaurant/supplier documents (DigitalOcean CDN URLs), then approve or reject."
      icon={<ShieldCheck className="h-5 w-5 text-primary" />}
      formFields={[
        { key: "entity", label: "Entity", type: "text" },
        { key: "type", label: "Type", type: "text" },
        {
          key: "status",
          label: "Decision",
          type: "select",
          options: ["approved", "rejected", "under_review", "pending", "submitted"],
        },
        { key: "notes", label: "Notes (required to reject)", type: "text", placeholder: "Rejection reason…" },
      ]}
      kpis={[
        { label: "Pending review", value: String(pending), tone: "warning" },
        { label: "Approved", value: String(approved), tone: "success" },
        { label: "Total", value: String(rows.length), tone: "info" },
        {
          label: "With documents",
          value: String(rows.filter((r) => r.docCount > 0).length),
          tone: "destructive",
        },
      ]}
      rows={rows}
      searchKeys={["id", "entity", "reviewer"]}
      emptyHint={isLoading ? "Loading…" : isError ? "Failed to load KYC." : "No KYC applications."}
      columns={[
        { key: "id", label: "ID", className: "font-mono text-xs", render: (r) => String(r.id).slice(0, 8) },
        { key: "entity", label: "Entity", render: (r) => <span className="font-medium">{r.entity}</span> },
        { key: "type", label: "Type" },
        { key: "submitted", label: "Submitted" },
        {
          key: "documents",
          label: "Documents",
          render: (r) => {
            const docs = (r.documents as KycDoc[]) || [];
            if (!docs.length) {
              return <span className="text-xs text-muted-foreground">No documents</span>;
            }
            return (
              <div className="flex flex-col gap-1 max-w-[220px]">
                {docs.map((d, i) =>
                  d.url ? (
                    <a
                      key={`${d.type}-${i}`}
                      href={d.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      <span className="truncate">{d.type.replace(/_/g, " ")}</span>
                    </a>
                  ) : (
                    <span key={`${d.type}-${i}`} className="text-xs text-muted-foreground truncate">
                      {d.type.replace(/_/g, " ")} (no URL)
                    </span>
                  ),
                )}
              </div>
            );
          },
        },
        {
          key: "priority",
          label: "Priority",
          render: (r) => (
            <span
              className={cn(
                "text-xs font-medium",
                r.priority === "high"
                  ? "text-destructive"
                  : r.priority === "medium"
                    ? "text-warning"
                    : "text-muted-foreground",
              )}
            >
              {r.priority}
            </span>
          ),
        },
        { key: "reviewer", label: "Reviewer" },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
      onUpdate={async (id, data, row) => {
        const status = String(data.status || "");
        const docs = (row?.documents as KycDoc[]) || [];
        if (status === "approved") {
          if (!docs.length) {
            throw new Error("Open documents first — approve only after reviewing uploaded files");
          }
          await approveKyc(id, data.notes ? String(data.notes) : undefined);
        } else if (status === "rejected") {
          const notes = String(data.notes || "").trim();
          if (!notes) throw new Error("Notes are required to reject KYC");
          await rejectKyc(id, notes);
        } else {
          throw new Error("Set status to approved or rejected to update KYC");
        }
        await queryClient.invalidateQueries({ queryKey: ["kyc", "applications"] });
        return { id, status, entity: data.entity, notes: data.notes };
      }}
    />
  );
}
