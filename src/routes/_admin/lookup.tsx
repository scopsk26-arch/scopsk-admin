import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Search, Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EventTimeline } from "@/components/admin/DetailViews";
import { fetchLookup } from "@/lib/api/resources";
import { ApiError } from "@/lib/api/client";

export const Route = createFileRoute("/_admin/lookup")({
  head: () => ({ meta: [{ title: "Find a record — ScopsK" }] }),
  component: LookupPage,
});

function str(v: unknown) {
  if (v == null) return "—";
  return String(v);
}

function orgLabel(org: any) {
  if (!org) return "—";
  return `${org.name || "Org"} · ${org.publicCode || org.id?.slice?.(0, 8) || ""}`;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-2">{children}</CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 justify-between border-b border-border/40 py-1.5 last:border-0">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right break-all">{value}</span>
    </div>
  );
}

function InvestigationView({ result }: { result: any }) {
  const trail = result.quantityTrail;
  const rfq = result.rfq;
  const po = result.purchaseOrder;
  const order = result.order;
  const shipments = result.deliveries || (result.shipment ? [result.shipment] : []);
  const invoices = result.invoices || (result.invoice ? [result.invoice] : []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-mono">{str(result.query)}</CardTitle>
          <CardDescription className="flex flex-wrap gap-2 items-center">
            <Badge variant="secondary">{str(result.entityType)}</Badge>
            <span className="font-mono text-xs">{str(result.entityId)}</span>
            {result.investigationReady ? (
              <Badge>Investigation ready</Badge>
            ) : null}
          </CardDescription>
        </CardHeader>
      </Card>

      {trail ? (
        <Section title="Quantities">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <div className="text-xs text-muted-foreground">Requested</div>
              <div className="text-lg font-semibold">{str(trail.requestedQty)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Awarded</div>
              <div className="text-lg font-semibold">{str(trail.awardedQty)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Remaining</div>
              <div className="text-lg font-semibold">{str(trail.remainingQty)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">PO qty</div>
              <div className="text-lg font-semibold">{str(trail.poQty)}</div>
            </div>
          </div>
          {Array.isArray(trail.lines) && trail.lines.length > 0 ? (
            <div className="mt-3 space-y-1">
              {trail.lines.map((line: any) => (
                <div key={line.id} className="text-xs font-mono text-muted-foreground">
                  {line.name}
                  {line.sku ? ` [${line.sku}]` : ""} · req {line.requested} · awarded{" "}
                  {line.awarded} · rem {line.remaining}
                </div>
              ))}
            </div>
          ) : null}
        </Section>
      ) : null}

      {result.organization ? (
        <Section title="Account">
          <Row label="Name" value={result.organization.name} />
          <Row label="Code" value={result.organization.publicCode || "—"} />
          <Row label="Type" value={result.organization.type} />
          <Row label="Email" value={result.organization.email || "—"} />
        </Section>
      ) : null}

      {result.supportTicket ? (
        <Section title="Support ticket">
          <Row label="Number" value={result.supportTicket.number} />
          <Row label="Subject" value={result.supportTicket.subject} />
          <Row label="Status" value={result.supportTicket.status} />
          <Row label="Related code" value={result.supportTicket.relatedCode || "—"} />
          <div className="pt-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/support">Open Support</Link>
            </Button>
          </div>
        </Section>
      ) : null}

      {rfq ? (
        <Section title="Quote request">
          <Row label="Number" value={rfq.number} />
          <Row label="Title" value={rfq.title} />
          <Row label="Status" value={rfq.status} />
          <Row label="Restaurant" value={orgLabel(rfq.organization)} />
          <div className="pt-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/rfqs">RFQs list</Link>
            </Button>
          </div>
        </Section>
      ) : null}

      {po ? (
        <Section title="Order">
          <Row label="Number" value={po.number} />
          <Row label="Status" value={po.status} />
          <Row label="Buyer" value={orgLabel(po.buyerOrg)} />
          <Row label="Supplier" value={orgLabel(po.supplierOrg)} />
          <Row label="Total" value={`${po.currency || "AED"} ${po.total ?? "—"}`} />
          <div className="pt-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/purchase-orders">POs</Link>
            </Button>
          </div>
        </Section>
      ) : null}

      {order ? (
        <Section title="Fulfillment">
          <Row label="Number" value={order.number} />
          <Row label="Status" value={order.status} />
          <Row label="Accepted at" value={order.acceptedAt || "—"} />
        </Section>
      ) : null}

      {Array.isArray(shipments) && shipments.length > 0 ? (
        <Section title="Deliveries">
          {shipments.map((d: any) => (
            <Row
              key={d.id}
              label={d.number || d.id?.slice?.(0, 8)}
              value={`${d.leg || "—"} · ${d.status || "—"}`}
            />
          ))}
          <div className="pt-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/deliveries">Deliveries</Link>
            </Button>
          </div>
        </Section>
      ) : null}

      {Array.isArray(invoices) && invoices.length > 0 ? (
        <Section title="Invoices">
          {invoices.map((inv: any) => (
            <Row
              key={inv.id}
              label={inv.number}
              value={`${inv.status} · ${inv.currency || "AED"} ${inv.total ?? "—"} · payments ${
                Array.isArray(inv.payments) ? inv.payments.length : 0
              }`}
            />
          ))}
          <div className="pt-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/invoices">Invoices</Link>
            </Button>
          </div>
        </Section>
      ) : null}

      {Array.isArray(result.rfqTimeline) && result.rfqTimeline.length > 0 ? (
        <Section title="Request timeline">
          <EventTimeline rows={result.rfqTimeline} kind="rfq" />
        </Section>
      ) : null}

      {Array.isArray(result.auditLogs) && result.auditLogs.length > 0 ? (
        <Section title="Activity">
          <div className="max-h-48 overflow-auto space-y-2">
            {result.auditLogs.slice(0, 20).map((log: any) => (
              <div key={log.id} className="text-xs">
                <span className="font-medium">{log.action}</span>
                <span className="text-muted-foreground">
                  {" "}
                  · {log.actor?.email || "system"} ·{" "}
                  {log.createdAt ? new Date(log.createdAt).toLocaleString() : ""}
                </span>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {result.linkedInvestigation ? (
        <Section title="Linked ticket">
          <InvestigationView result={result.linkedInvestigation} />
        </Section>
      ) : null}

      <details className="rounded-md border bg-muted/30 p-3">
        <summary className="cursor-pointer text-sm font-medium">Raw JSON</summary>
        <pre className="text-xs leading-relaxed overflow-auto max-h-[40vh] mt-3">
          {JSON.stringify(result, null, 2)}
        </pre>
      </details>
    </div>
  );
}

function LookupPage() {
  const [q, setQ] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (code: string) => fetchLookup(code),
    onSuccess: (data) => {
      setResult(data);
      setError(null);
    },
    onError: (err) => {
      setResult(null);
      setError(err instanceof ApiError ? err.message : "Lookup failed");
    },
  });

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const code = q.trim();
    if (code.length < 3) {
      setError("Type at least 3 characters of the number.");
      return;
    }
    mutation.mutate(code);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center">
          <Fingerprint className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Find a record</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Type the number from a quote request, order, delivery, invoice, or support ticket.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Search</CardTitle>
          <CardDescription>
            Look for the number on the request, order, delivery, invoice, or ticket. It usually starts with letters, such as RFQ, PO, or TCK.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSearch} className="flex flex-col sm:flex-row gap-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Example: TCK-2026-000047"
              className="font-mono"
              autoFocus
            />
            <Button type="submit" disabled={mutation.isPending} className="shrink-0 gap-2">
              <Search className="h-4 w-4" />
              {mutation.isPending ? "Searching…" : "Search"}
            </Button>
          </form>
          {error && <p className="text-sm text-destructive mt-3">{error}</p>}
        </CardContent>
      </Card>

      {result ? <InvestigationView result={result} /> : null}
    </div>
  );
}
