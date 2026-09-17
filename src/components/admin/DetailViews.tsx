import { AED, DetailSection, DetailTable } from "@/components/admin/DataPage";
import { num, str } from "@/lib/api/client";
import { computeQuotationAiScore, extractFinanceBreakdown } from "@/lib/admin-export";

function iso(v: unknown) {
  if (!v) return "—";
  return String(v).replace("T", " ").slice(0, 16);
}

function money(v: unknown) {
  return AED(num(v));
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
  if (t === "rfq") return "RFQ";
  if (t === "quotation" || t === "quote") return "Quotation";
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
  return ev;
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
              Fulfillment: Admin serves this request directly — suppliers are not invited, so quotes and purchase orders stay at 0.
            </div>
          ) : (
            <>
              <div><span className="text-muted-foreground">Quotes: </span>{str(detail.quotationCount, "—")}</div>
              <div><span className="text-muted-foreground">Purchase orders: </span>{str(detail.purchaseOrderCount ?? purchaseOrders.length, "—")}</div>
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
              { key: "status", label: "Status", render: (r) => str(r.status, "—") },
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
              { key: "status", label: "Status", render: (r) => str(r.status, "—") },
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
          <DetailTable
            rows={timeline}
            columns={[
              { key: "at", label: "When", render: (r) => iso(r.createdAt) },
              {
                key: "event",
                label: "Event",
                render: (r) =>
                  isCk
                    ? formatCkTimelineEvent(r.event ?? r.action ?? r.type)
                    : str(r.event ?? r.action ?? r.type, "—"),
              },
              {
                key: "meta",
                label: isCk ? "Note" : "Award / PO",
                render: (r) => {
                  if (isCk) {
                    const ev = String(r.event ?? r.action ?? r.type ?? "");
                    if (ev === "suppliers_matched" || ev === "cloud_kitchen_queued") {
                      return "Shown on admin CK queue only";
                    }
                    return "—";
                  }
                  const m = r.meta || r.metadata || {};
                  const bits = [
                    m.poNumber ? `PO ${m.poNumber}` : null,
                    m.awardedQty != null ? `Awarded ${m.awardedQty}` : null,
                    m.remainingBefore != null ? `Rem before ${m.remainingBefore}` : null,
                    m.remainingAfter != null ? `Rem after ${m.remainingAfter}` : null,
                  ].filter(Boolean);
                  return bits.length ? bits.join(" · ") : "—";
                },
              },
              { key: "actor", label: "Actor", render: (r) => str(r.actor?.email ?? r.user?.email, "—") },
            ]}
          />
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
          <div><span className="text-muted-foreground">Status: </span>{str(detail.displayStatus ?? detail.status, "—")}</div>
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
            <div><span className="text-muted-foreground">Approval status: </span>{str(approval.status, "—")}</div>
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

  return (
    <>
      <DetailSection title="Parties & links">
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <div><span className="text-muted-foreground">Buyer: </span>{str(detail.buyerOrg?.name, "—")}</div>
          <div><span className="text-muted-foreground">Supplier: </span>{str(detail.supplierOrg?.name, "—")}</div>
          <div><span className="text-muted-foreground">RFQ: </span>{str(detail.rfq?.number ?? detail.rfqId, "—")}</div>
          <div><span className="text-muted-foreground">Quotation: </span>{str(detail.quotation?.number ?? detail.quotationId, "—")}</div>
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
              { key: "status", label: "Status", render: (r) => str(r.status, "—") },
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
              { key: "status", label: "Status", render: (r) => str(r.status, "—") },
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
          <div><span className="text-muted-foreground">Status: </span>{str(detail.status, "—")}</div>
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
            { key: "status", label: "Status", render: (r) => deliveryItemStatus(r, detail.status) },
          ]}
        />
      </DetailSection>
      {timeline.length > 0 && (
        <DetailSection title="Timeline">
          <DetailTable
            rows={timeline}
            columns={[
              { key: "at", label: "When", render: (r) => iso(r.createdAt) },
              { key: "event", label: "Event", render: (r) => str(r.event ?? r.status ?? r.action, "—") },
              { key: "actor", label: "Actor", render: (r) => str(r.actor?.email, "—") },
            ]}
          />
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
              { key: "status", label: "Status", render: (r) => str(r.status, "—") },
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
          <div><span className="text-muted-foreground">Status: </span>{str(detail.status, "—")}</div>
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
            { key: "decision", label: "Decision", render: (r) => str(r.decision ?? r.action ?? r.status, "—") },
            { key: "actor", label: "Actor", render: (r) => str(r.actor?.email ?? r.user?.email, "—") },
            { key: "notes", label: "Notes", render: (r) => str(r.notes ?? r.reason, "—") },
          ]}
        />
      </DetailSection>
    </>
  );
}

export function OrganizationDetailView({ detail }: { detail: any }) {
  const docs = Array.isArray(detail?.documents) ? detail.documents : [];
  const members = Array.isArray(detail?.members) ? detail.members : [];
  const addresses = Array.isArray(detail?.addresses)
    ? detail.addresses
    : [detail?.profile?.businessAddress, detail?.profile?.receivingAddress, detail?.profile?.warehouseAddress]
        .filter(Boolean);
  const profile = detail?.profile ?? {};
  const settings = detail?.settings ?? detail?.orgSettings ?? {};

  return (
    <>
      <DetailSection title="Profile & settings">
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <div><span className="text-muted-foreground">Legal name: </span>{str(detail.legalName, "—")}</div>
          <div><span className="text-muted-foreground">Email: </span>{str(detail.email, "—")}</div>
          <div><span className="text-muted-foreground">Phone: </span>{str(detail.phone, "—")}</div>
          <div><span className="text-muted-foreground">Location: </span>{[detail.city, detail.country].filter(Boolean).join(", ") || "—"}</div>
          <div>
            <span className="text-muted-foreground">Cuisines: </span>
            {str(
              Array.isArray(detail.cuisines)
                ? detail.cuisines.map((c: any) => c?.name ?? c).filter(Boolean).join(", ")
                : detail.cuisineNames?.join?.(", ") ?? detail.cuisines,
              "—",
            )}
          </div>
          <div><span className="text-muted-foreground">Owner: </span>{str(profile.ownerName ?? detail.ownerName, "—")}</div>
          <div><span className="text-muted-foreground">Trade license: </span>{str(profile.tradeLicenseNumber ?? detail.tradeLicenseNumber, "—")}</div>
          <div><span className="text-muted-foreground">VAT: </span>{str(profile.vatRegistrationNumber ?? detail.vatRegistrationNumber, "—")}</div>
          <div><span className="text-muted-foreground">Food license: </span>{str(profile.foodLicenseNumber ?? detail.foodLicenseNumber, "—")}</div>
          <div>
            <span className="text-muted-foreground">Rating: </span>
            {(() => {
              const r = num(detail.rating ?? detail.metadata?.rating);
              return r > 0 ? `${r} / 5` : "—";
            })()}
          </div>
          <div><span className="text-muted-foreground">PO approval levels: </span>{str(settings.poApprovalLevels, "—")}</div>
          <div><span className="text-muted-foreground">Min RFQ (AED): </span>{str(settings.minRfqValueAed, "—")}</div>
          <div><span className="text-muted-foreground">Delivery fee: </span>{str(settings.deliveryFeeMode, "none")} · {money(settings.deliveryFeeValue)}</div>
          <div><span className="text-muted-foreground">Credit limit: </span>{money(settings.creditLimit)}</div>
          <div><span className="text-muted-foreground">Payment terms (days): </span>{str(settings.paymentTermsDays, "—")}</div>
          <div><span className="text-muted-foreground">Discount: </span>{str(settings.discountMode, "none")} · {money(settings.discountValue)}</div>
          <div><span className="text-muted-foreground">RFQ intake: </span>{str(settings.rfqIntakeMode, "manual")}</div>
          <div><span className="text-muted-foreground">Verification: </span>{str(detail.verificationStatus, "—")}</div>
          <div><span className="text-muted-foreground">KYC: </span>{str(detail.kycApplication?.status, "—")}</div>
        </div>
      </DetailSection>
      {members.length > 0 && (
        <DetailSection title="Members">
          <DetailTable
            rows={members}
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
              { key: "status", label: "Status", render: (r) => str(r.status, "—") },
            ]}
          />
        </DetailSection>
      )}
      {addresses.length > 0 && (
        <DetailSection title="Address">
          <DetailTable
            rows={addresses.map((a: any, i: number) => (typeof a === "object" ? { ...a, _i: i } : { label: a, _i: i }))}
            columns={[
              { key: "label", label: "Label", render: (r) => str(r.label ?? r.type ?? r.name, "—") },
              {
                key: "line",
                label: "Address",
                render: (r) =>
                  str(
                    r.line1
                      ?? r.addressLine1
                      ?? [r.street, r.city, r.state, r.emirate, r.country].filter(Boolean).join(", "),
                    "—",
                  ),
              },
            ]}
          />
        </DetailSection>
      )}
      {docs.length > 0 && (
        <DetailSection title="Documents">
          <DetailTable
            rows={docs}
            columns={[
              { key: "type", label: "Type", render: (r) => str(r.documentType ?? r.type, "—") },
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
      )}
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
            { key: "type", label: "Type", render: (r) => str(r.documentType ?? r.type, "—") },
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
          <DetailTable
            rows={timeline}
            columns={[
              { key: "at", label: "When", render: (r) => iso(r.createdAt) },
              { key: "event", label: "Event", render: (r) => str(r.event ?? r.action, "—") },
              { key: "actor", label: "Actor", render: (r) => str(r.actor?.email, "—") },
            ]}
          />
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
        <DetailSection title="Inventory">
          <DetailTable
            rows={inventory}
            columns={[
              { key: "qty", label: "Qty", render: (r) => str(r.quantity ?? r.onHand, "—") },
              { key: "warehouse", label: "Warehouse", render: (r) => str(r.warehouse?.name ?? r.location, "—") },
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
