import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { Flag } from "lucide-react";
import { fetchList } from "@/lib/api/resources";
import { api, str } from "@/lib/api/client";

export const Route = createFileRoute("/_admin/org-reports")({
  head: () => ({ meta: [{ title: "Org reports — ScopsK" }] }),
  component: OrgReportsPage,
});

function evidenceLinks(r: any): { name: string; url: string }[] {
  const list = Array.isArray(r.evidence) ? r.evidence : [];
  return list
    .map((ev: any) => {
      const file = ev?.file ?? ev;
      const url = str(file?.cdnUrl, "");
      if (!url) return null;
      return {
        name: str(file?.originalName, "Evidence"),
        url,
      };
    })
    .filter(Boolean) as { name: string; url: string }[];
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
  const {
    data: rows = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin", "organization-reports"],
    queryFn: async () => {
      const list = await fetchList("/organization-reports");
      return list.map(mapReport);
    },
  });

  const open = rows.filter((r) =>
    ["submitted", "acknowledged", "investigating", "awaiting_response"].includes(r.status),
  ).length;

  return (
    <DataPage
      title="Organization reports"
      description="Peer reports from restaurants and suppliers. Evidence files are stored on DigitalOcean Spaces — open the CDN URL from the report."
      icon={<Flag className="h-5 w-5 text-primary" />}
      entityName="Report"
      hideView={false}
      kpis={[
        { label: "Total", value: String(rows.length) },
        { label: "Open", value: String(open), tone: "warning" },
      ]}
      rows={rows}
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
                {r.evidence.map((ev: { name: string; url: string }) => (
                  <a
                    key={ev.url}
                    href={ev.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary text-xs font-medium hover:underline"
                  >
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
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
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
                {/\.(png|jpe?g|gif|webp)(\?|$)/i.test(ev.url) || /\.(png|jpe?g|gif|webp)$/i.test(ev.name) ? (
                  <img src={ev.url} alt={ev.name} className="max-h-64 rounded-lg border border-border" />
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
      ]}
      onUpdate={async (id, data) => {
        const status = String(data.status || "acknowledged");
        if (status === "submitted") {
          throw new Error("Pick a decision status other than submitted");
        }
        const updated = await api.post(`/organization-reports/${id}/decide`, {
          status,
          adminNotes: data.adminNotes || undefined,
          resolution: data.resolution || undefined,
        });
        await qc.invalidateQueries({ queryKey: ["admin", "organization-reports"] });
        return mapReport(updated);
      }}
    />
  );
}
