import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AED, DetailSection, DetailTable, StatusBadge, formatStatusLabel } from "@/components/admin/DataPage";
import { Button } from "@/components/ui/button";
import { api, asArray, num, str } from "@/lib/api/client";
import { organizationStreet, reviewKycDocument } from "@/lib/api/resources";
import { computeQuotationAiScore, extractFinanceBreakdown } from "@/lib/admin-export";

function iso(v: unknown) {
  if (!v) return "—";
  return String(v).replace("T", " ").slice(0, 16);
}

function money(v: unknown) {
  return AED(num(v));
}

function statusCell(value: unknown) {
  const label = str(value, "—");
  if (!label || label === "—") return "—";
  return <StatusBadge status={label} />;
}

/** Admin-only financial summary: actual value, VAT %, VAT amount, commission, grand total. */
export function FinanceBreakdownSection({
  detail,
  title = "Pricing & marketplace fees",
}: {
  detail: any;
  title?: string;
}) {
  if (!detail) return null;
  const f = extractFinanceBreakdown(detail);
  if (!(f.subtotal > 0 || f.total > 0 || f.tax > 0 || f.commission > 0)) return null;

  return (
    <DetailSection title={title}>
      <div className="grid gap-3 sm:grid-cols-2 text-sm">
        <div>
          <span className="text-muted-foreground">Actual order value (subtotal): </span>
          {AED(f.subtotal)}
        </div>
        <div>
          <span className="text-muted-foreground">VAT rate: </span>
          {f.vatRate > 0 ? `${f.vatRate}%` : "—"}
        </div>
        <div>
          <span className="text-muted-foreground">VAT amount: </span>
          {AED(f.tax)}
        </div>
        {f.shipping > 0 ? (
          <div>
            <span className="text-muted-foreground">Shipping: </span>
            {AED(f.shipping)}
          </div>
        ) : null}
        <div>
          <span className="text-muted-foreground">Commission (platform): </span>
          {AED(f.commission)}
        </div>
        {(f.supplierCommission > 0 || f.restaurantCommission > 0) && (
          <>
            <div>
              <span className="text-muted-foreground">
                Supplier commission{f.supplierRate ? ` (${f.supplierRate}%)` : ""}:{" "}
              </span>
              {AED(f.supplierCommission)}
            </div>
            <div>
              <span className="text-muted-foreground">
                Restaurant commission{f.restaurantRate ? ` (${f.restaurantRate}%)` : ""}:{" "}
              </span>
              {AED(f.restaurantCommission)}
            </div>
          </>
        )}
        <div className="sm:col-span-2 font-medium">
          <span className="text-muted-foreground">Total (incl. VAT): </span>
          {AED(f.total)}
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Commission is platform-internal and is not shown on customer invoices. Totals above include VAT from Settings.
      </p>
    </DetailSection>
  );
}

function hopLabel(row: any) {
  // Prefer API enum `leg` — never trust list-row display strings stored as `hop`
  const raw = row?.leg ?? row?.phase ?? row?.fulfillmentPhase ?? "";
  const hop = String(raw).toLowerCase().replace(/\s+/g, "_");
  const notes = String(row?.notes || "").toLowerCase();
  const displayHint = String(row?.hopDisplay || row?.hop || "").toLowerCase();
  if (
    hop === "to_warehouse"
    || hop === "inbound"
    || hop === "warehouse"
    || hop === "1"
    || hop.includes("warehouse")
    || notes.includes("hop 1")
    || notes.includes("to warehouse")
    || displayHint.includes("warehouse")
  ) {
    return "Hop 1 · To warehouse";
  }
  if (
    hop === "to_restaurant"
    || hop === "outbound"
    || hop === "restaurant"
    || hop === "2"
    || hop.includes("restaurant")
    || notes.includes("hop 2")
    || notes.includes("to restaurant")
    || displayHint.includes("restaurant")
  ) {
    return "Hop 2 · To restaurant";
  }
  // Default when leg missing but delivery exists
  if (row?.status || row?.number) return "Hop 2 · To restaurant";
  return "—";
}

function deliveryItemQty(r: any) {
  const expected = num(r.qtyExpected ?? r.qty_expected ?? r.quantity ?? r.qty);
  const delivered = num(r.qtyDelivered ?? r.qty_delivered ?? r.deliveredQty);
  if (delivered > 0 && expected > 0 && delivered !== expected) {
    return `${delivered} / ${expected}`;
  }
  if (delivered > 0) return String(delivered);
  if (expected > 0) return String(expected);
  const poQty = num(r.poItem?.quantity ?? r.po_item?.quantity);
  return poQty > 0 ? String(poQty) : "—";
}

function deliveryItemStatus(r: any, deliveryStatus?: string) {
  const damaged = num(r.qtyDamaged ?? r.qty_damaged);
  if (damaged > 0) return `damaged (${damaged})`;
  const delivered = num(r.qtyDelivered ?? r.qty_delivered);
  const expected = num(r.qtyExpected ?? r.qty_expected ?? r.quantity);
  if (delivered > 0 && expected > 0 && delivered < expected) return "partial";
  if (delivered > 0 || String(deliveryStatus).toLowerCase() === "delivered") return "delivered";
  return str(r.status ?? deliveryStatus, "pending");
}

function approvalTypeLabel(type: string) {
  const t = String(type || "").toLowerCase();
  if (t === "purchase_order" || t === "po") return "Purchase Order";
  if (t === "rfq") return "Request";
  if (t === "quotation" || t === "quote") return "Request";
  return type || "—";
}

function productName(item: any) {
  return str(item?.product?.name ?? item?.productName ?? item?.name ?? item?.description, "—");
}

function formatCkUnit(raw: unknown): string {
  const u = str(raw, "—");
  if (u === "—") return u;
  const lower = u.toLowerCase();
  if (lower === "portion" || lower === "portions") return "portion (1 serving)";
  return u;
}

function formatCkTimelineEvent(raw: unknown): string {
  const ev = str(raw, "—");
  if (ev === "suppliers_matched" || ev === "cloud_kitchen_queued") {
    return "Queued for admin fulfillment (no suppliers)";
  }
  if (ev === "cloud_kitchen_served") {
    return "Served by admin";
  }
  return formatStatusLabel(ev);
}

function timelineDetail(row: any, kind: "rfq" | "delivery" | "kyc"): string | null {
  const parts: string[] = [];
  const note = row.note ?? row.notes ?? row.message ?? row.comment;
  if (note) parts.push(String(note));
  if (kind === "rfq") {
    const event = String(row.event ?? row.action ?? row.type ?? "");
    if (event === "suppliers_matched" || event === "cloud_kitchen_queued") {
      parts.push("Shown on admin CK queue only");
    }
    const meta = row.meta || row.metadata || {};
    if (meta.poNumber) parts.push(`PO ${meta.poNumber}`);
    if (meta.awardedQty != null) parts.push(`Awarded ${meta.awardedQty}`);
    if (meta.remainingBefore != null) parts.push(`Remaining before ${meta.remainingBefore}`);
    if (meta.remainingAfter != null) parts.push(`Remaining after ${meta.remainingAfter}`);
  }
  const actor = row.actor?.email ?? row.user?.email ?? row.reviewer?.email;
  if (actor) parts.push(String(actor));
  const unique = [...new Set(parts.map((part) => part.trim()).filter(Boolean))];
  return unique.length ? unique.join(" · ") : null;
}

/** Vertical event rail used by RFQ, delivery, and KYC detail. */
export function EventTimeline({
  rows,
  kind = "delivery",
}: {
  rows: any[];
  kind?: "rfq" | "delivery" | "kyc";
}) {
  const ordered = [...rows].sort((a, b) => {
    const left = new Date(a?.createdAt || 0).getTime();
    const right = new Date(b?.createdAt || 0).getTime();
    return (Number.isNaN(left) ? 0 : left) - (Number.isNaN(right) ? 0 : right);
  });

  return (
    <ol className="m-0 list-none p-0">
      {ordered.map((row, index) => {
        const current = index === ordered.length - 1;
        const raw = row.event ?? row.action ?? row.type ?? row.status;
        const title =
          kind === "rfq"
            ? formatCkTimelineEvent(raw)
            : formatStatusLabel(str(raw, "Update"));
        const detail = timelineDetail(row, kind);
        return (
          <li key={String(row.id ?? index)} className="flex gap-3">
            <div className="flex w-4 shrink-0 flex-col items-center">
              <span
                className={
                  current
                    ? "mt-1 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-primary/15"
                    : "mt-1.5 h-2 w-2 rounded-full bg-muted-foreground/40"
                }
              />
              {current ? null : <span className="mt-1 w-px flex-1 bg-border" />}
            </div>
            <div className={current ? "min-w-0 flex-1" : "min-w-0 flex-1 pb-4"}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-semibold leading-5">{title}</p>
                <time className="shrink-0 text-xs text-muted-foreground">{iso(row.createdAt)}</time>
              </div>
              {detail ? <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{detail}</p> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function RfqDetailView({
  detail,
  cloudKitchen = false,
}: {
  detail: any;
  /** Cloud Kitchen RFQs skip supplier quotes/POs — admin fulfills directly. */
  cloudKitchen?: boolean;
}) {
  const items = Array.isArray(detail?.items) ? detail.items : [];
  const invitations = Array.isArray(detail?.invitations) ? detail.invitations : [];
  const attachments = Array.isArray(detail?.attachments) ? detail.attachments : [];
  const timeline = Array.isArray(detail?.timeline) ? detail.timeline : [];
  const purchaseOrders = Array.isArray(detail?.purchaseOrders) ? detail.purchaseOrders : [];
  const requestedQty = num(detail?.requestedQty);
  const awardedQtyRaw = num(detail?.fulfilledQty ?? detail?.awardedQty);
  const remainingQtyRaw = num(detail?.remainingQty);
  const isCk =
    cloudKitchen ||
    detail?.channel === "cloud_kitchen" ||
    detail?.channel === "ck" ||
    detail?.metadata?.channel === "cloud_kitchen";
  const statusLower = String(detail?.status || "").toLowerCase();
  const isCkServed = isCk && statusLower === "awarded";
  const awardedQty =
    isCkServed && awardedQtyRaw <= 0 && requestedQty > 0 ? requestedQty : awardedQtyRaw;
  const remainingQty = isCkServed && awardedQtyRaw <= 0 ? 0 : remainingQtyRaw;

  return (
    <>
      <DetailSection title="Summary">
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <div><span className="text-muted-foreground">Title: </span>{str(detail.title, "—")}</div>
          <div><span className="text-muted-foreground">Delivery: </span>{iso(detail.deliveryDate ?? detail.neededBy)}</div>
          <div className="sm:col-span-2"><span className="text-muted-foreground">Notes: </span>{str(detail.notes ?? detail.description, "—")}</div>
          <div><span className="text-muted-foreground">Creator: </span>{str(detail.creator?.email ?? [detail.creator?.firstName, detail.creator?.lastName].filter(Boolean).join(" "), "—")}</div>
          <div><span className="text-muted-foreground">Org: </span>{str(detail.organization?.name, "—")}</div>
          {isCk ? (
            <div className="sm:col-span-2 text-muted-foreground">
              Fulfillment: Admin serves this request directly — suppliers are not invited.
            </div>
          ) : (
            <>
              <div><span className="text-muted-foreground">Orders: </span>{str(detail.purchaseOrderCount ?? purchaseOrders.length, "—")}</div>
            </>
          )}
        </div>
      </DetailSection>
      <DetailSection title="Fulfillment">
        <div className="grid gap-3 sm:grid-cols-3 text-sm">
          <div><span className="text-muted-foreground">Requested: </span>{requestedQty || "—"}</div>
          <div><span className="text-muted-foreground">{isCk ? "Served: " : "Awarded: "}</span>{awardedQty || "—"}</div>
          <div><span className="text-muted-foreground">Remaining: </span>{isCkServed ? 0 : remainingQty || "—"}</div>
        </div>
      </DetailSection>
      <DetailSection title="Line items">
        <DetailTable
          rows={items}
          columns={[
            { key: "product", label: "Product", render: (r) => productName(r) },
            { key: "qty", label: "Requested", render: (r) => str(r.quantity ?? r.qty, "—") },
            {
              key: "awarded",
              label: isCk ? "Served" : "Awarded",
              render: (r) => {
                const qty = num(r.quantity ?? r.qty);
                const awarded = num(r.awardedQty ?? r.awarded_qty);
                if (isCkServed && awarded <= 0 && qty > 0) return str(qty, "0");
                return str(awarded, "0");
              },
            },
            {
              key: "remaining",
              label: "Remaining",
              render: (r) => {
                if (isCkServed) return "0";
                const qty = num(r.quantity ?? r.qty);
                const awarded = num(r.awardedQty ?? r.awarded_qty);
                const rem =
                  r.remainingQty != null || r.remaining_qty != null
                    ? num(r.remainingQty ?? r.remaining_qty)
                    : Math.max(0, qty - awarded);
                return str(rem, "—");
              },
            },
            {
              key: "unit",
              label: "Unit",
              render: (r) =>
                isCk
                  ? formatCkUnit(r.unit?.symbol ?? r.unit?.name ?? r.unit)
                  : str(r.unit?.symbol ?? r.unit?.name ?? r.unit, "—"),
            },
            { key: "notes", label: "Notes", render: (r) => str(r.notes, "—") },
          ]}
        />
      </DetailSection>
      {!isCk && purchaseOrders.length > 0 && (
        <DetailSection title="Purchase orders">
          <DetailTable
            rows={purchaseOrders}
            columns={[
              { key: "number", label: "PO", render: (r) => str(r.number, "—") },
              { key: "qty", label: "Qty", render: (r) => str(r.quantity, "—") },
              { key: "status", label: "Status", render: (r) => statusCell(r.status) },
              { key: "total", label: "Total", render: (r) => money(r.total) },
              { key: "created", label: "Created", render: (r) => iso(r.createdAt) },
            ]}
          />
        </DetailSection>
      )}
      {!isCk && invitations.length > 0 && (
        <DetailSection title="Invited suppliers">
          <DetailTable
            rows={invitations}
            columns={[
              { key: "supplier", label: "Supplier", render: (r) => str(r.supplierOrg?.name ?? r.organization?.name, "—") },
              { key: "status", label: "Status", render: (r) => statusCell(r.status) },
            ]}
          />
        </DetailSection>
      )}
      {attachments.length > 0 && (
        <DetailSection title="Attachments">
          <DetailTable
            rows={attachments}
            columns={[
              { key: "name", label: "File", render: (r) => str(r.file?.originalName ?? r.fileName ?? r.label, "—") },
              {
                key: "url",
                label: "Link",
                render: (r) => {
                  const url = r.file?.cdnUrl ?? r.file?.url ?? r.url;
                  return url ? (
                    <a href={String(url)} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs">Open</a>
                  ) : "—";
                },
              },
            ]}
          />
        </DetailSection>
      )}
      {timeline.length > 0 && (
        <DetailSection title="Timeline">
          <EventTimeline rows={timeline} kind="rfq" />
        </DetailSection>
      )}
    </>
  );
}

export function QuotationDetailView({ detail }: { detail: any }) {
  const items = Array.isArray(detail?.items) ? detail.items : [];
  const attachments = Array.isArray(detail?.attachments) ? detail.attachments : [];
  const approval = detail?.approvalRequest ?? null;
  const steps = Array.isArray(approval?.metadata?.steps) ? approval.metadata.steps : [];
  const actions = Array.isArray(approval?.actions) ? approval.actions : [];
  const currentLevel = Number(approval?.currentLevel || 0);
  const po = detail?.purchaseOrder ?? detail?.purchaseOrders?.[0];

  return (
    <>
      <DetailSection title="Summary">
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <div><span className="text-muted-foreground">Quote: </span>{str(detail.number, "—")}</div>
          <div><span className="text-muted-foreground">RFQ: </span>{str(detail.rfq?.number ?? detail.rfqId, "—")}</div>
          <div><span className="text-muted-foreground">Supplier: </span>{str(detail.supplierOrg?.name, "—")}</div>
          <div><span className="text-muted-foreground">Buyer: </span>{str(detail.rfq?.organization?.name, "—")}</div>
          <div><span className="text-muted-foreground">Status: </span>{statusCell(detail.displayStatus ?? detail.status)}</div>
          <div><span className="text-muted-foreground">Total: </span>{money(detail.total ?? detail.subtotal)}</div>
          <div><span className="text-muted-foreground">AI score: </span>{computeQuotationAiScore(detail)}</div>
          <div><span className="text-muted-foreground">Valid until: </span>{iso(detail.validUntil ?? detail.validityDate)}</div>
          <div><span className="text-muted-foreground">Fulfillment: </span>{str(detail.fulfillmentType, "—")}</div>
          <div className="sm:col-span-2"><span className="text-muted-foreground">Terms: </span>{str(detail.terms ?? detail.notes, "—")}</div>
        </div>
      </DetailSection>
      {approval ? (
        <DetailSection title="Quote approval workflow">
          <div className="grid gap-3 sm:grid-cols-2 text-sm mb-3">
            <div><span className="text-muted-foreground">Approval status: </span>{statusCell(approval.status)}</div>
            <div>
              <span className="text-muted-foreground">Progress: </span>
              {`${currentLevel} / ${num(approval.requiredLevels)}`}
            </div>
            <div>
              <span className="text-muted-foreground">Current approver: </span>
              {str(
                steps.find((s: any) => Number(s.level) === currentLevel + 1)?.assigneeName
                  ?? steps.find((s: any) => Number(s.level) === currentLevel + 1)?.assigneeEmail,
                approval.status === "pending" ? "—" : "Complete",
              )}
            </div>
            <div><span className="text-muted-foreground">PO: </span>{str(po?.number ?? detail.purchaseOrderId, "—")}</div>
          </div>
          <DetailTable
            rows={steps}
            empty="No approval steps"
            columns={[
              { key: "level", label: "Step", render: (r) => str(r.level, "—") },
              {
                key: "who",
                label: "Approver",
                render: (r) => str(r.assigneeName ?? r.assigneeEmail ?? r.assigneeUserId, "—"),
              },
              {
                key: "state",
                label: "State",
                render: (r) => {
                  const level = num(r.level);
                  if (currentLevel >= level) return "Approved";
                  if (approval.status === "rejected" && currentLevel + 1 === level) return "Rejected";
                  if (approval.status === "pending" && currentLevel + 1 === level) return "Pending";
                  return "Waiting";
                },
              },
            ]}
          />
          {actions.length > 0 ? (
            <div className="mt-3">
              <DetailTable
                rows={actions}
                empty="No actions"
                columns={[
                  { key: "at", label: "When", render: (r) => iso(r.createdAt) },
                  { key: "decision", label: "Decision", render: (r) => str(r.action ?? r.decision, "—") },
                  { key: "actor", label: "Actor", render: (r) => str(r.actor?.email ?? r.actorId, "—") },
                  { key: "notes", label: "Notes", render: (r) => str(r.notes, "—") },
                ]}
              />
            </div>
          ) : null}
        </DetailSection>
      ) : null}
      <DetailSection title="Line items">
        <DetailTable
          rows={items}
          columns={[
            { key: "product", label: "Product", render: (r) => productName(r) },
            { key: "qty", label: "Qty", render: (r) => str(r.quantity ?? r.qty, "—") },
            { key: "price", label: "Unit price", render: (r) => money(r.unitPrice ?? r.price) },
            { key: "total", label: "Line total", render: (r) => money(r.lineTotal ?? r.total) },
          ]}
        />
      </DetailSection>
      {attachments.length > 0 && (
        <DetailSection title="Attachments">
          <DetailTable
            rows={attachments}
            columns={[
              { key: "name", label: "File", render: (r) => str(r.file?.originalName ?? r.fileName, "—") },
              {
                key: "url",
                label: "Link",
                render: (r) => {
                  const url = r.file?.cdnUrl ?? r.file?.url ?? r.url;
                  return url ? (
                    <a href={String(url)} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs">Open</a>
                  ) : "—";
                },
              },
            ]}
          />
        </DetailSection>
      )}
    </>
  );
}

export function PurchaseOrderDetailView({ detail }: { detail: any }) {
  const items = Array.isArray(detail?.items) ? detail.items : [];
  const deliveries = Array.isArray(detail?.deliveries) ? detail.deliveries : [];
  const invoices = Array.isArray(detail?.invoices) ? detail.invoices : [];
  const firstDelivery = deliveries[0];
  const firstInvoice = invoices[0];
  const paymentId = firstInvoice?.payments?.[0]?.id ?? firstInvoice?.payment?.id;
  const steps = [
    { name: "Quote request", to: "/rfqs" as const, id: detail?.rfqId ?? detail?.rfq?.id },
    { name: "Order", to: "/purchase-orders" as const, id: detail?.id },
    { name: "Delivery", to: "/deliveries" as const, id: firstDelivery?.id },
    { name: "Invoice", to: "/invoices" as const, id: firstInvoice?.id },
    { name: "Payment", to: "/payments" as const, id: paymentId },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center gap-1 text-sm">
        {steps.map((step, index) => (
          <span key={step.name} className="inline-flex items-center gap-1">
            {index > 0 ? <span className="text-muted-foreground">→</span> : null}
            <Link
              to={step.to}
              title={step.id ? `Open ${step.name}` : step.name}
              className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium hover:bg-muted"
            >
              {step.name}
            </Link>
          </span>
        ))}
      </div>
      <DetailSection title="Parties & links">
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <div><span className="text-muted-foreground">Buyer: </span>{str(detail.buyerOrg?.name, "—")}</div>
          <div><span className="text-muted-foreground">Supplier: </span>{str(detail.supplierOrg?.name, "—")}</div>
          <div><span className="text-muted-foreground">Request: </span>{str(detail.rfq?.number ?? detail.rfqId, "—")}</div>
          <div><span className="text-muted-foreground">Currency: </span>{str(detail.currency, "AED")}</div>
          <div><span className="text-muted-foreground">Total (incl. VAT): </span>{money(detail.total)}</div>
        </div>
      </DetailSection>
      <FinanceBreakdownSection detail={detail} />
      <DetailSection title="Line items">
        <DetailTable
          rows={items}
          columns={[
            { key: "product", label: "Product", render: (r) => productName(r) },
            { key: "qty", label: "Qty", render: (r) => str(r.quantity, "—") },
            { key: "price", label: "Unit price", render: (r) => money(r.unitPrice) },
            { key: "total", label: "Line total", render: (r) => money(r.lineTotal ?? r.total) },
          ]}
        />
      </DetailSection>
      {deliveries.length > 0 && (
        <DetailSection title="Deliveries">
          <p className="text-xs text-muted-foreground mb-2">
            Each purchase order has two hops: supplier → warehouse, then warehouse → restaurant.
          </p>
          <DetailTable
            rows={deliveries}
            columns={[
              { key: "number", label: "Delivery", render: (r) => str(r.number, "—") },
              { key: "hop", label: "Hop", render: (r) => hopLabel(r) },
              { key: "status", label: "Status", render: (r) => statusCell(r.status) },
              { key: "eta", label: "ETA", render: (r) => iso(r.etaAt ?? r.scheduledAt) },
            ]}
          />
        </DetailSection>
      )}
      {invoices.length > 0 && (
        <DetailSection title="Invoices">
          <DetailTable
            rows={invoices}
            columns={[
              { key: "number", label: "Invoice", render: (r) => str(r.number, "—") },
              { key: "subtotal", label: "Subtotal", render: (r) => money(r.subtotal) },
              { key: "vat", label: "VAT", render: (r) => money(r.tax ?? r.vat) },
              { key: "total", label: "Total", render: (r) => money(r.total ?? r.subtotal) },
              { key: "status", label: "Status", render: (r) => statusCell(r.status) },
            ]}
          />
        </DetailSection>
      )}
    </>
  );
}

export function DeliveryDetailView({ detail }: { detail: any }) {
  const items = Array.isArray(detail?.items) ? detail.items : [];
  const timeline = Array.isArray(detail?.timeline) ? detail.timeline : [];
  const proofUrl =
    detail?.proofFile?.cdnUrl
    ?? detail?.proofFile?.url
    ?? detail?.proofUrl
    ?? detail?.signatureFile?.cdnUrl;
  const po = detail?.purchaseOrder;

  return (
    <>
      <DetailSection title="Summary">
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <div><span className="text-muted-foreground">Delivery: </span>{str(detail.number, "—")}</div>
          <div><span className="text-muted-foreground">Status: </span>{statusCell(detail.status)}</div>
          <div><span className="text-muted-foreground">PO: </span>{str(po?.number ?? detail.purchaseOrderId, "—")}</div>
          <div><span className="text-muted-foreground">Buyer: </span>{str(po?.buyerOrg?.name, "—")}</div>
          <div><span className="text-muted-foreground">Supplier: </span>{str(po?.supplierOrg?.name, "—")}</div>
          <div><span className="text-muted-foreground">Driver: </span>{str(detail.driverName ?? ([detail.driver?.firstName, detail.driver?.lastName].filter(Boolean).join(" ") || detail.driver?.email), "—")}</div>
          <div><span className="text-muted-foreground">Scheduled: </span>{iso(detail.scheduledAt)}</div>
          <div><span className="text-muted-foreground">ETA: </span>{iso(detail.etaAt ?? detail.scheduledAt ?? detail.deliveredAt)}</div>
          <div><span className="text-muted-foreground">Hop: </span>{hopLabel(detail)}</div>
          <div><span className="text-muted-foreground">Address: </span>{str(detail.address, "—")}</div>
          <div className="sm:col-span-2">
            <span className="text-muted-foreground">Proof: </span>
            { proofUrl ? (
              <a href={String(proofUrl)} target="_blank" rel="noreferrer" className="text-primary hover:underline">Open POD</a>
            ) : detail.proofFileId ? (
              "Attached (file)"
            ) : (
              "Not uploaded"
            )}
          </div>
          {detail.notes ? (
            <div className="sm:col-span-2"><span className="text-muted-foreground">Notes: </span>{str(detail.notes)}</div>
          ) : null}
        </div>
      </DetailSection>
      {po ? <FinanceBreakdownSection detail={po} title="Linked order pricing (VAT & commission)" /> : null}
      <DetailSection title="Items">
        <DetailTable
          rows={items}
          columns={[
            { key: "product", label: "Product", render: (r) => productName(r.poItem ?? r) },
            { key: "qty", label: "Qty", render: (r) => deliveryItemQty(r) },
            { key: "status", label: "Status", render: (r) => statusCell(deliveryItemStatus(r, detail.status)) },
          ]}
        />
      </DetailSection>
      {timeline.length > 0 && (
        <DetailSection title="Timeline">
          <EventTimeline rows={timeline} kind="delivery" />
        </DetailSection>
      )}
    </>
  );
}

export function InvoiceDetailView({ detail }: { detail: any }) {
  const payments = Array.isArray(detail?.payments) ? detail.payments : [];
  const poItems = Array.isArray(detail?.purchaseOrder?.items) ? detail.purchaseOrder.items : [];
  const pdfUrl = detail?.pdfFile?.cdnUrl ?? detail?.pdfFile?.url ?? detail?.pdfUrl;

  return (
    <>
      <DetailSection title="Summary">
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <div><span className="text-muted-foreground">Issuer: </span>{str(detail.issuerOrg?.name ?? detail.organization?.name, "—")}</div>
          <div><span className="text-muted-foreground">Counterparty: </span>{str(detail.counterpartyOrg?.name, "—")}</div>
          <div><span className="text-muted-foreground">PO: </span>{str(detail.purchaseOrder?.number ?? detail.purchaseOrderId, "—")}</div>
          <div><span className="text-muted-foreground">Subtotal: </span>{money(detail.subtotal)}</div>
          <div><span className="text-muted-foreground">VAT: </span>{money(detail.tax ?? detail.vat)}</div>
          <div><span className="text-muted-foreground">Total (incl. VAT): </span>{money(detail.total)}</div>
          <div><span className="text-muted-foreground">Due: </span>{iso(detail.dueDate)}</div>
          <div><span className="text-muted-foreground">Paid at: </span>{iso(detail.paidAt)}</div>
          <div className="sm:col-span-2">
            <span className="text-muted-foreground">PDF: </span>
            {pdfUrl ? (
              <a href={String(pdfUrl)} target="_blank" rel="noreferrer" className="text-primary hover:underline">Open</a>
            ) : "—"}
          </div>
        </div>
      </DetailSection>
      <FinanceBreakdownSection detail={detail.purchaseOrder ? { ...detail.purchaseOrder, tax: detail.tax, subtotal: detail.subtotal, total: detail.total } : detail} />
      {payments.length > 0 && (
        <DetailSection title="Payments">
          <DetailTable
            rows={payments}
            columns={[
              { key: "amount", label: "Amount", render: (r) => money(r.amount) },
              { key: "method", label: "Method", render: (r) => str(r.method, "—") },
              { key: "at", label: "When", render: (r) => iso(r.paidAt ?? r.createdAt) },
              { key: "status", label: "Status", render: (r) => statusCell(r.status) },
            ]}
          />
        </DetailSection>
      )}
      {poItems.length > 0 && (
        <DetailSection title="PO line items">
          <DetailTable
            rows={poItems}
            columns={[
              { key: "product", label: "Product", render: (r) => productName(r) },
              { key: "qty", label: "Qty", render: (r) => str(r.quantity, "—") },
              { key: "total", label: "Total", render: (r) => money(r.lineTotal ?? r.total) },
            ]}
          />
        </DetailSection>
      )}
    </>
  );
}

export function PaymentDetailView({ detail }: { detail: any }) {
  const inv = detail?.invoiceDetail || detail?.invoice || {};
  const po = detail?.purchaseOrder || inv?.purchaseOrder || null;
  const financeSource = po
    ? { ...po, tax: inv.tax ?? po.tax, subtotal: inv.subtotal ?? po.subtotal, total: inv.total ?? po.total }
    : inv?.id
      ? inv
      : detail;

  return (
    <>
      <DetailSection title="Payment">
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <div><span className="text-muted-foreground">Payment ID: </span>{str(detail.id, "—")}</div>
          <div><span className="text-muted-foreground">Provider ref: </span>{str(detail.providerRef, "—")}</div>
          <div><span className="text-muted-foreground">Invoice: </span>{str(inv.number ?? detail.invoice, "—")}</div>
          <div><span className="text-muted-foreground">Method: </span>{str(detail.method, "—")}</div>
          <div><span className="text-muted-foreground">Paid amount: </span>{money(detail.amount)}</div>
          {num(detail.fee) > 0 ? (
            <div><span className="text-muted-foreground">Fee: </span>{money(detail.fee)}</div>
          ) : null}
          {detail.provider && detail.provider !== "—" ? (
            <div><span className="text-muted-foreground">Provider: </span>{str(detail.provider)}</div>
          ) : null}
          <div><span className="text-muted-foreground">Organization: </span>{str(detail.organization, "—")}</div>
          <div><span className="text-muted-foreground">Paid at: </span>{str(detail.paidAt, "—")}</div>
          <div><span className="text-muted-foreground">Status: </span>{statusCell(detail.status)}</div>
        </div>
      </DetailSection>
      <FinanceBreakdownSection detail={financeSource} title="Linked invoice pricing (VAT & commission)" />
    </>
  );
}

export function ApprovalDetailView({ detail }: { detail: any }) {
  const actions = Array.isArray(detail?.actions) ? detail.actions : [];
  const entity =
    detail?.entity
    ?? detail?.entitySnapshot
    ?? detail?.purchaseOrder
    ?? detail?.rfq
    ?? detail?.quotation
    ?? null;
  const rawMeta = detail?.metadata;
  const metadata =
    typeof rawMeta === "string"
      ? (() => {
          try {
            return JSON.parse(rawMeta);
          } catch {
            return {};
          }
        })()
      : rawMeta && typeof rawMeta === "object"
        ? rawMeta
        : {};
  const steps = Array.isArray(metadata?.steps) ? metadata.steps : [];
  const currentLevel = num(detail?.currentLevel);
  const requiredLevels = num(detail?.requiredLevels ?? detail?.requiredLevels);

  return (
    <>
      <DetailSection title="Request">
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <div><span className="text-muted-foreground">Organization: </span>{str(detail.organization?.name, "—")}</div>
          <div><span className="text-muted-foreground">Entity type: </span>{approvalTypeLabel(str(detail.entityType, ""))}</div>
          <div><span className="text-muted-foreground">Entity ID: </span><span className="font-mono text-xs">{str(detail.entityId, "—")}</span></div>
          <div><span className="text-muted-foreground">Entity #: </span>{str(entity?.number ?? detail.entityNumber, "—")}</div>
          <div><span className="text-muted-foreground">Level: </span>{`${currentLevel} / ${requiredLevels}`}</div>
          <div><span className="text-muted-foreground">Requested by: </span>{str(detail.requester?.email ?? detail.requestedBy, "—")}</div>
          <div><span className="text-muted-foreground">Created: </span>{iso(detail.createdAt)}</div>
          <div><span className="text-muted-foreground">Notes: </span>{str(detail.notes, "—")}</div>
          {entity?.total != null && (
            <div><span className="text-muted-foreground">Entity total: </span>{money(entity.total)}</div>
          )}
        </div>
      </DetailSection>
      {steps.length > 0 ? (
        <DetailSection title="Approval steps">
          <DetailTable
            rows={steps}
            columns={[
              { key: "level", label: "Step", render: (r) => str(r.level, "—") },
              {
                key: "who",
                label: "Approver",
                render: (r) => str(r.assigneeName ?? r.assigneeEmail ?? r.assigneeUserId, "—"),
              },
              {
                key: "state",
                label: "State",
                render: (r) => {
                  const level = num(r.level);
                  if (currentLevel >= level) return "Approved";
                  if (detail.status === "rejected" && currentLevel + 1 === level) return "Rejected";
                  if (detail.status === "pending" && currentLevel + 1 === level) return "Pending";
                  return "Waiting";
                },
              },
            ]}
          />
        </DetailSection>
      ) : null}
      <DetailSection title="Action history">
        <DetailTable
          rows={actions}
          empty="No actions yet"
          columns={[
            { key: "at", label: "When", render: (r) => iso(r.createdAt) },
            { key: "decision", label: "Decision", render: (r) => statusCell(r.decision ?? r.action ?? r.status) },
            { key: "actor", label: "Actor", render: (r) => str(r.actor?.email ?? r.user?.email, "—") },
            { key: "notes", label: "Notes", render: (r) => str(r.notes ?? r.reason, "—") },
          ]}
        />
      </DetailSection>
    </>
  );
}

function namesOf(value: unknown): string {
  if (Array.isArray(value)) {
    const names = value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const row = item as { name?: string; cuisineType?: { name?: string }; label?: string };
          return row.cuisineType?.name || row.name || row.label || "";
        }
        return "";
      })
      .map((name) => name.trim())
      .filter((name) => name && name !== "—");
    return names.length ? [...new Set(names)].join(", ") : "—";
  }
  if (typeof value === "string" && value.trim() && value.trim() !== "—") return value.trim();
  return "—";
}

function OrgDocumentsTable({ documents }: { documents: any[] }) {
  const [docs, setDocs] = useState(documents);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    setDocs(documents);
  }, [documents]);

  const review = async (id: string, status: "approved" | "rejected") => {
    let notes: string | undefined;
    if (status === "rejected") {
      const reason = window.prompt("Reason for rejecting this document");
      if (reason == null) return;
      notes = reason.trim();
      if (!notes) {
        toast.error("A reason is required to reject a document");
        return;
      }
    }
    setBusyId(id);
    try {
      await reviewKycDocument(id, status, notes);
      setDocs((current) => current.map((doc) => (String(doc.id) === id ? { ...doc, status } : doc)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the document");
    } finally {
      setBusyId(null);
    }
  };

  const showReview = docs.some((doc) => {
    const id = str(doc.id, "");
    return Boolean(id) && String(doc.status || "pending").toLowerCase() === "pending";
  });

  return (
    <DetailTable
      rows={docs}
      empty="No documents"
      columns={[
        {
          key: "type",
          label: "Type",
          render: (r) => kycDocTypeLabel(r.documentType ?? r.type),
        },
        { key: "name", label: "File", render: (r) => str(r.fileName ?? r.file?.originalName, "—") },
        { key: "status", label: "Status", render: (r) => statusCell(r.status || "pending") },
        {
          key: "url",
          label: "Link",
          render: (r) => {
            const url = r.url ?? r.file?.cdnUrl ?? r.file?.url;
            return url ? (
              <a href={String(url)} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs">Open</a>
            ) : "—";
          },
        },
        ...(showReview
          ? [{
              key: "review",
              label: "Review",
              render: (r: any) => {
                const id = str(r.id, "");
                const status = String(r.status || "pending").toLowerCase();
                if (!id || status !== "pending") return <span className="text-xs text-muted-foreground">—</span>;
                const busy = busyId === id;
                return (
                  <div className="flex gap-1.5">
                    <Button type="button" size="sm" className="h-7 px-2" disabled={busy} onClick={() => review(id, "approved")}>
                      Approve
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="h-7 px-2" disabled={busy} onClick={() => review(id, "rejected")}>
                      Reject
                    </Button>
                  </div>
                );
              },
            }]
          : []),
      ]}
    />
  );
}

function commerceTermsLabel(value: unknown) {
  const key = String(value || "").toLowerCase();
  if (key === "cash_only") return "Cash on Delivery";
  if (key === "credit_only") return "Credit Terms";
  if (key === "cash_or_credit") return "Both Cash & Credit";
  return str(value, "—");
}

function workingHoursLabel(value: unknown) {
  if (!value || typeof value !== "object") return "—";
  const hours = value as { days?: unknown; open?: unknown; close?: unknown };
  const days = Array.isArray(hours.days)
    ? hours.days.map((d) => String(d)).join(", ")
    : "";
  const open = str(hours.open, "");
  const close = str(hours.close, "");
  const span = open && close ? `${open}–${close}` : open || close;
  return [days, span].filter(Boolean).join(" · ") || "—";
}

function kycDocTypeLabel(value: unknown) {
  const key = String(value || "").toLowerCase();
  if (key === "trade_license") return "Trade license";
  if (key === "food_license") return "Food establishment license";
  if (key === "food_handling" || key === "food_handling_certificate") {
    return "Food trading / food safety license";
  }
  if (key === "vat_certificate" || key === "vat_registration") return "VAT certificate";
  if (key === "bank_proof") return "Bank proof";
  return formatStatusLabel(str(value, "—"));
}

function feeLabel(mode: unknown, value: unknown) {
  const kind = String(mode || "none");
  if (kind === "percent") return `${num(value)}%`;
  if (kind === "fixed") return money(value);
  return "None";
}

export function OrganizationDetailView({ detail, row }: { detail: any; row?: any }) {
  const docs = Array.isArray(detail?.documents) ? detail.documents : [];
  const members = Array.isArray(detail?.members) ? detail.members : [];
  const branches = Array.isArray(detail?.branches) ? detail.branches : [];
  const addresses = Array.isArray(detail?.addresses)
    ? detail.addresses
    : [detail?.profile?.businessAddress, detail?.profile?.receivingAddress, detail?.profile?.warehouseAddress]
        .filter(Boolean);
  const profile = detail?.profile ?? {};
  const settings = detail?.settings ?? detail?.orgSettings ?? {};
  const type = String(detail?.type || row?.type || "");
  const isSupplier = type === "supplier";
  const cuisines = namesOf(detail?.cuisines ?? detail?.cuisineNames ?? row?.cuisines);
  const categories = namesOf(detail?.metadata?.categories ?? row?.categories);
  const deliveryOptions = namesOf(settings.deliveryOptions);
  const rating = num(detail?.rating ?? detail?.metadata?.rating ?? row?.rating);
  const anonymous = settings.anonymousMarketplace !== false;
  const meta = {
    ...((detail?.metadata && typeof detail.metadata === "object" ? detail.metadata : {}) as Record<string, unknown>),
    ...((settings.metadata && typeof settings.metadata === "object" ? settings.metadata : {}) as Record<string, unknown>),
  };
  const coverage = namesOf(meta.coverageAreas ?? row?.coverageAreas);
  const area = str(meta.dubaiArea ?? meta.neighborhood ?? row?.dubaiArea, "—");
  const street = str(organizationStreet(detail) || organizationStreet(row) || row?.address, "—");
  const purchasingTerms = str(meta.purchasingTerms ?? row?.purchasingTerms, "");
  const sellingTerms = str(meta.sellingTerms ?? row?.sellingTerms, "");
  const requestedCredit = num(meta.requestedCreditLimit ?? row?.requestedCreditLimit);
  const termsDays = num(settings.paymentTermsDays ?? row?.paymentTermsDays);
  const hours = workingHoursLabel(meta.workingHours ?? row?.workingHours);
  const { data: platformSettings = [] } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: async () => asArray(await api.get("/admin/settings", { query: { scope: "platform" } })),
  });
  const platformMinRfq = useMemo(() => {
    const setting = platformSettings.find((s: { key?: string }) => s.key === "min_rfq_value_aed");
    const raw = setting?.value;
    const n = Number(raw && typeof raw === "object" && "value" in raw ? raw.value : raw);
    return Number.isFinite(n) ? n : null;
  }, [platformSettings]);
  const minRfqShown = meta.minRfqValueExplicit === true
    ? num(settings.minRfqValueAed)
    : (platformMinRfq ?? num(row?.minRfqValueAed ?? settings.minRfqValueAed));
  const branchName = str(
    branches[0]?.name ?? row?.branchName ?? detail?.branches?.[0]?.name,
    "—",
  );

  return (
    <>
      <DetailSection title="Registration">
        <div className="grid gap-3 sm:grid-cols-2">
          {(isSupplier
            ? [
                ["Legal name", str(detail.legalName ?? row?.legalName, "—")],
                ["Owner", str(profile.ownerName ?? detail.ownerName ?? row?.ownerName, "—")],
                ["Phone", str(detail.phone ?? row?.phone, "—")],
                ["Product categories", categories],
                ["Area", area],
                ["Street", street],
                ["City", str(detail.city ?? row?.city, "—")],
                ["Country", str(detail.country ?? row?.country, "—")],
                ["Coverage", coverage],
                ["Working hours", hours],
                ["Payment method", commerceTermsLabel(sellingTerms || (termsDays > 0 ? "cash_or_credit" : "cash_only"))],
                [
                  "Requested credit",
                  requestedCredit > 0
                    ? `${money(requestedCredit)}${termsDays > 0 ? ` · ${termsDays} days` : ""}`
                    : "Cash only",
                ],
                ["Bank", str(profile.bankName ?? detail.bankName ?? row?.bankName, "—")],
                ["Account holder", str(profile.bankAccountName ?? row?.bankAccountName, "—")],
                ["Account number", str(profile.bankAccountNumber ?? row?.bankAccountNumber, "—")],
                ["IBAN", str(profile.bankIban ?? detail.bankIban ?? row?.bankIban, "—")],
              ]
            : [
                ["Legal name", str(detail.legalName ?? row?.legalName, "—")],
                ["Owner", str(profile.ownerName ?? detail.ownerName ?? row?.ownerName, "—")],
                ["Phone", str(detail.phone ?? row?.phone, "—")],
                ["Branch", branchName],
                ["Area", area],
                ["Street", street],
                ["City", str(detail.city ?? row?.city, "—")],
                ["Country", str(detail.country ?? row?.country, "—")],
                ["Cuisines", cuisines],
                ["Payment method", commerceTermsLabel(purchasingTerms || (termsDays > 0 ? "cash_or_credit" : "cash_only"))],
                [
                  "Requested credit",
                  requestedCredit > 0
                    ? `${money(requestedCredit)}${termsDays > 0 ? ` · ${termsDays} days` : ""}`
                    : "Cash only",
                ],
                ["Approved credit limit", money(settings.creditLimit ?? row?.creditLimit)],
                ["Bank", str(profile.bankName ?? detail.bankName ?? row?.bankName, "—")],
                ["Account holder", str(profile.bankAccountName ?? row?.bankAccountName, "—")],
                ["Account number", str(profile.bankAccountNumber ?? row?.bankAccountNumber, "—")],
                ["IBAN", str(profile.bankIban ?? detail.bankIban ?? row?.bankIban, "—")],
              ]
          ).map(([label, value]) => (
            <div key={label} className="rounded-xl border border-border bg-muted/40 px-3 py-2.5">
              <div className="text-xs font-medium text-muted-foreground">{label}</div>
              <div className="mt-1 text-sm font-medium break-words">{value}</div>
            </div>
          ))}
        </div>
      </DetailSection>

      <DetailSection title="Operations">
        <div className="grid gap-3 sm:grid-cols-2">
          {(isSupplier
            ? [
                ["Product categories", categories !== "—" ? categories : cuisines],
                ["RFQ intake", str(settings.rfqIntakeMode ?? row?.rfqIntakeMode, "manual")],
                ["PO approval levels", str(settings.poApprovalLevels ?? row?.poApprovalLevels, "0")],
                ["Minimum RFQ", money(minRfqShown)],
                ["Stock match minimum", `${num(settings.matchingMinStockPct)}%`],
                ["Delivery options", deliveryOptions],
                ["Anonymous marketplace", anonymous ? "On" : "Off"],
                ["Win rate", row?.winRate != null ? `${num(row.winRate)}%` : "—"],
                ["Revenue (90d)", row?.revenue != null ? money(row.revenue) : "—"],
              ]
            : [
                ["Cuisines", cuisines],
                ["PO approval levels", str(settings.poApprovalLevels ?? row?.poApprovalLevels, "0")],
                ["Minimum RFQ", money(minRfqShown)],
                ["Delivery fee", feeLabel(settings.deliveryFeeMode ?? row?.deliveryFeeMode, settings.deliveryFeeValue ?? row?.deliveryFeeValue)],
                ["Credit limit", money(settings.creditLimit ?? row?.creditLimit)],
                ["Payment terms", `${num(settings.paymentTermsDays ?? row?.paymentTermsDays)} days`],
                ["Discount", feeLabel(settings.discountMode ?? row?.discountMode, settings.discountValue ?? row?.discountValue)],
                ["Anonymous marketplace", anonymous ? "On" : "Off"],
                ["Rating", rating > 0 ? `${rating} / 5` : "—"],
                ["Branches", String(branches.length)],
              ]
          ).map(([label, value]) => (
            <div key={label} className="rounded-xl border border-border bg-muted/40 px-3 py-2.5">
              <div className="text-xs font-medium text-muted-foreground">{label}</div>
              <div className="mt-1 text-sm font-medium capitalize break-words">{value}</div>
            </div>
          ))}
        </div>
      </DetailSection>

      <DetailSection title="Compliance">
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <div><span className="text-muted-foreground">Owner: </span>{str(profile.ownerName ?? detail.ownerName ?? row?.ownerName, "—")}</div>
          <div><span className="text-muted-foreground">Trade licence: </span>{str(profile.tradeLicenseNumber ?? row?.tradeLicenseNumber, "—")}</div>
          <div><span className="text-muted-foreground">Food licence: </span>{str(profile.foodLicenseNumber ?? row?.foodLicenseNumber, "—")}</div>
          <div><span className="text-muted-foreground">VAT / TRN: </span>{str(profile.vatRegistrationNumber ?? row?.vatRegistrationNumber, "—")}</div>
          <div><span className="text-muted-foreground">KYC: </span>{statusCell(detail.verificationStatus ?? row?.verificationStatus)}</div>
          <div><span className="text-muted-foreground">KYC application: </span>{statusCell(detail.kycApplication?.status)}</div>
        </div>
      </DetailSection>

      <DetailSection title="Branches">
        <DetailTable
          rows={branches}
          empty="No branches"
          columns={[
            { key: "name", label: "Name", render: (r) => str(r.name, "—") },
            { key: "code", label: "Code", render: (r) => str(r.code, "—") },
            { key: "city", label: "City", render: (r) => str(r.city, "—") },
            { key: "status", label: "Status", render: (r) => statusCell(r.status) },
          ]}
        />
      </DetailSection>

      <DetailSection title="Members">
        <DetailTable
          rows={members}
          empty="No members"
          columns={[
            {
              key: "user",
              label: "User",
              render: (r) =>
                str(
                  r.user?.email
                    ?? [r.user?.firstName, r.user?.lastName].filter(Boolean).join(" ")
                    ?? r.email,
                  "—",
                ),
            },
            { key: "role", label: "Role", render: (r) => str(r.role?.name ?? r.role ?? r.title, "—") },
            { key: "status", label: "Status", render: (r) => statusCell(r.status) },
          ]}
        />
      </DetailSection>

      <DetailSection title="Addresses">
        <DetailTable
          rows={addresses.map((a: any, i: number) => (typeof a === "object" ? { ...a, _i: i } : { label: a, _i: i }))}
          empty="No addresses"
          columns={[
            { key: "label", label: "Label", render: (r) => str(r.label ?? r.type ?? r.name, "—") },
            {
              key: "line",
              label: "Address",
              render: (r) =>
                str(
                  [r.line1, r.line2, r.city, r.state, r.country, r.postalCode].filter(Boolean).join(", ")
                    || r.addressLine1,
                  "—",
                ),
            },
          ]}
        />
      </DetailSection>

      <DetailSection title="Documents">
        <OrgDocumentsTable documents={docs} />
      </DetailSection>
    </>
  );
}

export function KycDetailView({ detail }: { detail: any }) {
  const docs = Array.isArray(detail?.documents) ? detail.documents : [];
  const timeline = Array.isArray(detail?.timeline) ? detail.timeline : [];

  return (
    <>
      <DetailSection title="Application">
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <div><span className="text-muted-foreground">Entity: </span>{str(detail.organization?.name, "—")}</div>
          <div><span className="text-muted-foreground">Type: </span>{str(detail.organization?.type ?? detail.type, "—")}</div>
          <div><span className="text-muted-foreground">Email: </span>{str(detail.organization?.email, "—")}</div>
          <div><span className="text-muted-foreground">Priority: </span>{str(detail.priority, "—")}</div>
          <div>
            <span className="text-muted-foreground">Reviewer: </span>
            {(() => {
              const u = detail.reviewer;
              if (!u) return "—";
              const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
              return name || str(u.email, "—");
            })()}
          </div>
          <div><span className="text-muted-foreground">Submitted: </span>{iso(detail.submittedAt ?? detail.createdAt)}</div>
          <div className="sm:col-span-2"><span className="text-muted-foreground">Notes: </span>{str(detail.notes, "—")}</div>
        </div>
      </DetailSection>
      <DetailSection title="Documents">
        <DetailTable
          rows={docs}
          columns={[
            { key: "type", label: "Type", render: (r) => kycDocTypeLabel(r.documentType ?? r.type) },
            { key: "name", label: "File", render: (r) => str(r.fileName ?? r.file?.originalName, "—") },
            {
              key: "url",
              label: "Link",
              render: (r) => {
                const url = r.url ?? r.file?.cdnUrl ?? r.file?.url;
                return url ? (
                  <a href={String(url)} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs">Open</a>
                ) : "—";
              },
            },
          ]}
        />
      </DetailSection>
      {timeline.length > 0 && (
        <DetailSection title="Timeline">
          <EventTimeline rows={timeline} kind="kyc" />
        </DetailSection>
      )}
    </>
  );
}

export function ProductDetailView({ detail }: { detail: any }) {
  const variants = Array.isArray(detail?.variants) ? detail.variants : [];
  const images = Array.isArray(detail?.images) ? detail.images : [];
  const inventory = Array.isArray(detail?.inventoryItems) ? detail.inventoryItems : [];

  return (
    <>
      <DetailSection title="Catalog">
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <div><span className="text-muted-foreground">Item code: </span>{str(detail.sku ?? detail.productCode, "—")}</div>
          <div><span className="text-muted-foreground">Category: </span>{str(detail.category?.name, "—")}</div>
          <div><span className="text-muted-foreground">Brand: </span>{str(detail.brand?.name, "—")}</div>
          <div><span className="text-muted-foreground">Unit: </span>{str(detail.unit?.name ?? detail.unit?.symbol, "—")}</div>
          <div><span className="text-muted-foreground">Org: </span>{str(detail.organization?.name, "—")}</div>
          <div><span className="text-muted-foreground">Price: </span>{money(detail.price ?? detail.unitPrice)}</div>
          <div><span className="text-muted-foreground">Excise applicable: </span>{detail.exciseApplicable ? "Yes" : "No"}</div>
          <div><span className="text-muted-foreground">Picture: </span>
            {(() => {
              const url =
                detail.images?.[0]?.file?.cdnUrl ||
                detail.images?.[0]?.cdnUrl ||
                detail.imageUrl;
              if (!url) return "—";
              return (
                <span className="inline-flex items-center gap-3 align-middle">
                  <img src={String(url)} alt="" className="h-16 w-16 rounded object-cover border border-border" />
                  <a href={String(url)} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline truncate">
                    Open CDN URL
                  </a>
                </span>
              );
            })()}
          </div>
          <div className="sm:col-span-2"><span className="text-muted-foreground">Description: </span>{str(detail.description, "—")}</div>
        </div>
      </DetailSection>
      {variants.length > 0 && (
        <DetailSection title="Variants">
          <DetailTable
            rows={variants}
            columns={[
              { key: "name", label: "Name", render: (r) => str(r.name, "—") },
              { key: "sku", label: "SKU", render: (r) => str(r.sku, "—") },
              { key: "price", label: "Price", render: (r) => money(r.price) },
            ]}
          />
        </DetailSection>
      )}
      {images.length > 0 && (
        <DetailSection title="Images">
          <DetailTable
            rows={images}
            columns={[
              { key: "name", label: "File", render: (r) => str(r.file?.originalName ?? r.alt, "—") },
              {
                key: "url",
                label: "Link",
                render: (r) => {
                  const url = r.file?.cdnUrl ?? r.file?.url ?? r.url;
                  return url ? (
                    <a href={String(url)} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs">Open</a>
                  ) : "—";
                },
              },
            ]}
          />
        </DetailSection>
      )}
      {inventory.length > 0 && (
        <DetailSection title="Supplier stock">
          <DetailTable
            rows={[...inventory].sort((a, b) => num(b.stock) - num(a.stock))}
            columns={[
              {
                key: "org",
                label: "Organization",
                render: (r) =>
                  str(
                    r.organizationName ??
                      r.organization?.name ??
                      r.Organization?.name ??
                      r.orgName,
                    "—",
                  ),
              },
              {
                key: "type",
                label: "Type",
                render: (r) => str(r.organization?.type ?? r.Organization?.type, "—"),
              },
              {
                key: "stock",
                label: "Stock",
                render: (r) => str(r.stock ?? r.quantity ?? r.onHand, "—"),
              },
              {
                key: "unit",
                label: "Unit",
                render: (r) => str(r.unit, "—"),
              },
              {
                key: "unitPrice",
                label: "Price",
                render: (r) => money(r.unitPrice),
              },
              {
                key: "warehouse",
                label: "Warehouse",
                render: (r) =>
                  str(r.warehouseName ?? r.warehouse?.name ?? r.location, "—"),
              },
              {
                key: "status",
                label: "Status",
                render: (r) => statusCell(r.status),
              },
            ]}
          />
        </DetailSection>
      )}
    </>
  );
}

export function GenericJsonDetailView({ detail, omitKeys = ["id"] }: { detail: any; omitKeys?: string[] }) {
  const entries = Object.entries(detail || {}).filter(([k, v]) => {
    if (omitKeys.includes(k)) return false;
    if (v == null) return false;
    if (typeof v === "object") return true;
    return true;
  });

  const scalars = entries.filter(([, v]) => v == null || typeof v !== "object");
  const nested = entries.filter(([, v]) => v != null && typeof v === "object");

  return (
    <>
      {scalars.length > 0 && (
        <DetailSection title="Fields">
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            {scalars.map(([k, v]) => (
              <div key={k}>
                <span className="text-muted-foreground">{k}: </span>
                {String(v)}
              </div>
            ))}
          </div>
        </DetailSection>
      )}
      {nested.map(([k, v]) => (
        <DetailSection key={k} title={k}>
          {Array.isArray(v) ? (
            <DetailTable
              rows={v as any[]}
              columns={
                v.length && typeof v[0] === "object"
                  ? Object.keys(v[0] as object)
                      .slice(0, 6)
                      .map((ck) => ({
                        key: ck,
                        label: ck,
                        render: (r: any) => {
                          const val = r[ck];
                          if (val == null) return "—";
                          if (typeof val === "object") return JSON.stringify(val).slice(0, 80);
                          return String(val);
                        },
                      }))
                  : [{ key: "value", label: "Value", render: (r: any) => String(r) }]
              }
            />
          ) : (
            <pre className="text-xs bg-muted/40 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(v, null, 2)}
            </pre>
          )}
        </DetailSection>
      ))}
    </>
  );
}
