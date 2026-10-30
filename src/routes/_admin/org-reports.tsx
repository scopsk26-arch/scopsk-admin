import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { pagedListProps, usePagedList } from "@/hooks/usePagedList";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { Flag } from "lucide-react";
import { api, str } from "@/lib/api/client";

export const Route = createFileRoute("/_admin/org-reports")({
  head: () => ({ meta: [{ title: "Complaints — ScopsK" }] }),
  component: OrgReportsPage,
});

function isImageEvidence(ev: { name: string; url: string; mime?: string }) {
  if (ev.mime && ev.mime.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|heic)(\?|$)/i.test(ev.url) || /\.(png|jpe?g|gif|webp|heic)$/i.test(ev.name);
}

function evidenceLinks(r: any): { name: string; url: string; mime?: string }[] {
  const list = Array.isArray(r.evidence) ? r.evidence : [];
  return list
    .map((ev: any) => {
      const file = ev?.file ?? ev;
      const url = str(file?.cdnUrl || file?.url || file?.publicUrl, "");
      if (!url) return null;
      return {
        name: str(file?.originalName || file?.name, "Evidence"),
        url,
        mime: str(file?.mimeType || file?.contentType, ""),
      };
    })
    .filter(Boolean) as { name: string; url: string; mime?: string }[];
}

function mapReport(r: any) {
  const links = evidenceLinks(r);
  return {
    id: str(r.id),
    number: str(r.number, "—"),
    reporter: str(r.reporterOrg?.name ?? r.reporterOrg?.publicCode, "—"),
    reported: str(r.reportedOrg?.name ?? r.reportedOrg?.publicCode, "—"),
    reason: str(r.reason, "—"),
    comments: str(r.comments, "—"),
    status: str(r.status, "submitted"),
    evidenceCount: links.length,
    evidenceLabel: links.length ? `${links.length} file${links.length === 1 ? "" : "s"}` : "—",
    evidence: links,
    createdAt: r.createdAt ? String(r.createdAt).slice(0, 16).replace("T", " ") : "—",
    adminNotes: str(r.adminNotes, ""),
    resolution: str(r.resolution, ""),
  };
}

function OrgReportsPage() {
  const qc = useQueryClient();
  const list = usePagedList({
    queryKey: ["admin", "organization-reports"],
    path: "/organization-reports",
    map: mapReport,
  });
  const rows = list.rows;
  const isLoading = list.isLoading;
  const isError = list.isError;

  const open = rows.filter((r) =>
    ["submitted", "acknowledged", "investigating", "awaiting_response"].includes(r.status),
  ).length;

  return (
    <DataPage
      title="Complaints"
      description="One business reporting another. This is not a sales report."
      icon={<Flag className="h-5 w-5 text-primary" />}
      entityName="Report"
      hideView={false}
      kpis={[
        { label: "Total", value: String(list.total) },
        { label: "Open", value: String(open), tone: "warning" },
      ]}
      rows={rows}
      serverPagination={pagedListProps(list)}
      idKey="id"
      searchKeys={["number", "reporter", "reported", "reason", "status"]}
      emptyHint={
        isLoading
          ? "Loading reports…"
          : isError
            ? "Failed to load reports."
            : "No organization reports yet."
      }
      columns={[
        { key: "number", label: "Report", className: "font-mono text-xs whitespace-nowrap" },
        { key: "reporter", label: "Reporter", className: "whitespace-nowrap font-medium" },
        { key: "reported", label: "Reported", className: "whitespace-nowrap" },
        { key: "reason", label: "Reason" },
        {
          key: "evidenceLabel",
          label: "Evidence",
          render: (r) =>
            r.evidence?.length ? (
              <div className="flex flex-col gap-1">
                {r.evidence.map((ev: { name: string; url: string; mime?: string }) => (
                  <a
                    key={ev.url}
                    href={ev.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-primary text-xs font-medium hover:underline"
                  >
                    {isImageEvidence(ev) ? (
                      <img
                        src={ev.url}
                        alt=""
                        className="h-10 w-10 rounded object-cover border border-border"
                      />
                    ) : null}
                    {ev.name}
                  </a>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground">—</span>
            ),
        },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
        { key: "createdAt", label: "Created", className: "whitespace-nowrap text-xs" },
      ]}
      viewFields={[
        { key: "number", label: "Report" },
        { key: "reporter", label: "Reporter" },
        { key: "reported", label: "Reported" },
        { key: "reason", label: "Reason" },
        { key: "comments", label: "Comments" },
        { key: "status", label: "Status" },
        { key: "createdAt", label: "Created" },
      ]}
      renderView={(detail) => {
        const links = Array.isArray(detail.evidence) ? detail.evidence : [];
        if (!links.length) {
          return <p className="text-sm text-muted-foreground">No evidence attached.</p>;
        }
        return (
          <div className="space-y-3">
            <div className="text-xs font-semibold text-muted-foreground">
              Evidence
            </div>
            {links.map((ev: { name: string; url: string }) => (
              <div key={ev.url} className="space-y-2">
                <a
                  href={ev.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {ev.name}
                </a>
                {isImageEvidence(ev) ? (
                  <img src={ev.url} alt={ev.name} className="max-h-72 w-full rounded-lg border border-border object-contain bg-muted/30" />
                ) : null}
              </div>
            ))}
          </div>
        );
      }}
      formFields={[
        {
          key: "status",
          label: "Status",
          required: true,
          type: "select",
          options: [
            "submitted",
            "acknowledged",
            "investigating",
            "awaiting_response",
            "resolved",
            "rejected",
          ],
        },
        { key: "adminNotes", label: "Admin notes", type: "textarea" },
        { key: "resolution", label: "Resolution", type: "textarea" },
        {
          key: "blockForReporter",
          label: "Block for reporter",
          type: "select",
          options: ["no", "yes"],
        },
      ]}
      onUpdate={async (id, data) => {
        const status = String(data.status || "acknowledged");
        if (status === "submitted") {
          throw new Error("Pick a decision status other than submitted");
        }
        const blockYes = String(data.blockForReporter || "no").toLowerCase() === "yes";
        const updated = await api.post(`/organization-reports/${id}/decide`, {
          status,
          adminNotes: data.adminNotes || undefined,
          resolution: data.resolution || undefined,
          blockForReporter: blockYes,
        }, { toastOnSuccess: true });
        await qc.invalidateQueries({ queryKey: ["admin", "organization-reports"] });
        await qc.invalidateQueries({ queryKey: ["support"] });
        return mapReport(updated);
      }}
    />
  );
}
