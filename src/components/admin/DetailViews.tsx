import { AED, DetailSection, DetailTable } from "@/components/admin/DataPage";
import { num, str } from "@/lib/api/client";

function iso(v: unknown) {
  if (!v) return "—";
  return String(v).replace("T", " ").slice(0, 16);
}

function money(v: unknown) {
  return AED(num(v));
}

function productName(item: any) {
  return str(item?.product?.name ?? item?.productName ?? item?.name ?? item?.description, "—");
}

export function RfqDetailView({ detail }: { detail: any }) {
  const items = Array.isArray(detail?.items) ? detail.items : [];
  const invitations = Array.isArray(detail?.invitations) ? detail.invitations : [];
  const attachments = Array.isArray(detail?.attachments) ? detail.attachments : [];
  const timeline = Array.isArray(detail?.timeline) ? detail.timeline : [];
  const purchaseOrders = Array.isArray(detail?.purchaseOrders) ? detail.purchaseOrders : [];
  const requestedQty = num(detail?.requestedQty);
  const awardedQty = num(detail?.fulfilledQty ?? detail?.awardedQty);
  const remainingQty = num(detail?.remainingQty);

  return (
    <>
      <DetailSection title="Summary">
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <div><span className="text-muted-foreground">Title: </span>{str(detail.title, "—")}</div>
          <div><span className="text-muted-foreground">Delivery: </span>{iso(detail.deliveryDate ?? detail.neededBy)}</div>
          <div className="sm:col-span-2"><span className="text-muted-foreground">Notes: </span>{str(detail.notes ?? detail.description, "—")}</div>
          <div><span className="text-muted-foreground">Creator: </span>{str(detail.creator?.email ?? [detail.creator?.firstName, detail.creator?.lastName].filter(Boolean).join(" "), "—")}</div>
          <div><span className="text-muted-foreground">Org: </span>{str(detail.organization?.name, "—")}</div>
          <div><span className="text-muted-foreground">Quotes: </span>{str(detail.quotationCount, "—")}</div>
          <div><span className="text-muted-foreground">Purchase orders: </span>{str(detail.purchaseOrderCount ?? purchaseOrders.length, "—")}</div>
        </div>
      </DetailSection>
      <DetailSection title="Fulfillment">
        <div className="grid gap-3 sm:grid-cols-3 text-sm">
          <div><span className="text-muted-foreground">Requested: </span>{requestedQty || "—"}</div>
          <div><span className="text-muted-foreground">Awarded: </span>{awardedQty || "—"}</div>
          <div><span className="text-muted-foreground">Remaining: </span>{remainingQty || "—"}</div>
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
              label: "Awarded",
              render: (r) => str(r.awardedQty ?? r.awarded_qty, "0"),
            },
            {
              key: "remaining",
              label: "Remaining",
              render: (r) => {
                const qty = num(r.quantity ?? r.qty);
                const awarded = num(r.awardedQty ?? r.awarded_qty);
                const rem =
                  r.remainingQty != null || r.remaining_qty != null
                    ? num(r.remainingQty ?? r.remaining_qty)
                    : Math.max(0, qty - awarded);
                return str(rem, "—");
              },
            },
            { key: "unit", label: "Unit", render: (r) => str(r.unit?.symbol ?? r.unit?.name ?? r.unit, "—") },
            { key: "notes", label: "Notes", render: (r) => str(r.notes, "—") },
          ]}
        />
      </DetailSection>
      {purchaseOrders.length > 0 && (
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
      {invitations.length > 0 && (
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
              { key: "event", label: "Event", render: (r) => str(r.event ?? r.action ?? r.type, "—") },
              {
                key: "meta",
                label: "Award / PO",
                render: (r) => {
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

  return (
    <>
      <DetailSection title="Summary">
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <div><span className="text-muted-foreground">RFQ: </span>{str(detail.rfq?.number ?? detail.rfqId, "—")}</div>
          <div><span className="text-muted-foreground">Supplier: </span>{str(detail.supplierOrg?.name, "—")}</div>
          <div><span className="text-muted-foreground">Buyer: </span>{str(detail.rfq?.organization?.name, "—")}</div>
          <div><span className="text-muted-foreground">Total: </span>{money(detail.total ?? detail.subtotal)}</div>
          <div><span className="text-muted-foreground">Valid until: </span>{iso(detail.validUntil ?? detail.validityDate)}</div>
          <div><span className="text-muted-foreground">Fulfillment: </span>{str(detail.fulfillmentType, "—")}</div>
          <div className="sm:col-span-2"><span className="text-muted-foreground">Terms: </span>{str(detail.terms ?? detail.notes, "—")}</div>
        </div>
      </DetailSection>
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
          <div><span className="text-muted-foreground">Total: </span>{money(detail.total)}</div>
        </div>
      </DetailSection>
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
          <DetailTable
            rows={deliveries}
            columns={[
              { key: "number", label: "Delivery", render: (r) => str(r.number, "—") },
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
  const proofUrl = detail?.proofFile?.cdnUrl ?? detail?.proofFile?.url ?? detail?.proofUrl;

  return (
    <>
      <DetailSection title="Summary">
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <div><span className="text-muted-foreground">PO: </span>{str(detail.purchaseOrder?.number ?? detail.purchaseOrderId, "—")}</div>
          <div><span className="text-muted-foreground">Buyer: </span>{str(detail.purchaseOrder?.buyerOrg?.name, "—")}</div>
          <div><span className="text-muted-foreground">Supplier: </span>{str(detail.purchaseOrder?.supplierOrg?.name, "—")}</div>
          <div><span className="text-muted-foreground">Driver: </span>{str(detail.driverName ?? detail.driver?.name, "—")}</div>
          <div><span className="text-muted-foreground">Scheduled: </span>{iso(detail.scheduledAt)}</div>
          <div><span className="text-muted-foreground">ETA: </span>{iso(detail.etaAt)}</div>
          <div className="sm:col-span-2">
            <span className="text-muted-foreground">Proof: </span>
            {proofUrl ? (
              <a href={String(proofUrl)} target="_blank" rel="noreferrer" className="text-primary hover:underline">Open POD</a>
            ) : "—"}
          </div>
        </div>
      </DetailSection>
      <DetailSection title="Items">
        <DetailTable
          rows={items}
          columns={[
            { key: "product", label: "Product", render: (r) => productName(r.poItem ?? r) },
            { key: "qty", label: "Qty", render: (r) => str(r.quantity ?? r.deliveredQty, "—") },
            { key: "status", label: "Status", render: (r) => str(r.status, "—") },
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
          <div><span className="text-muted-foreground">Tax: </span>{money(detail.tax ?? detail.vat)}</div>
          <div><span className="text-muted-foreground">Total: </span>{money(detail.total)}</div>
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

export function ApprovalDetailView({ detail }: { detail: any }) {
  const actions = Array.isArray(detail?.actions) ? detail.actions : [];
  const entity = detail?.entity ?? detail?.entitySnapshot ?? null;

  return (
    <>
      <DetailSection title="Request">
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <div><span className="text-muted-foreground">Organization: </span>{str(detail.organization?.name, "—")}</div>
          <div><span className="text-muted-foreground">Entity type: </span>{str(detail.entityType, "—")}</div>
          <div><span className="text-muted-foreground">Entity ID: </span><span className="font-mono text-xs">{str(detail.entityId, "—")}</span></div>
          <div><span className="text-muted-foreground">Entity #: </span>{str(entity?.number ?? detail.entityNumber, "—")}</div>
          <div><span className="text-muted-foreground">Level: </span>{`${num(detail.currentLevel)} / ${num(detail.requiredLevels)}`}</div>
          <div><span className="text-muted-foreground">Requested by: </span>{str(detail.requester?.email ?? detail.requestedBy, "—")}</div>
          <div><span className="text-muted-foreground">Created: </span>{iso(detail.createdAt)}</div>
          <div><span className="text-muted-foreground">Notes: </span>{str(detail.notes, "—")}</div>
          {entity?.total != null && (
            <div><span className="text-muted-foreground">Entity total: </span>{money(entity.total)}</div>
          )}
        </div>
      </DetailSection>
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
          <div><span className="text-muted-foreground">Owner: </span>{str(profile.ownerName ?? detail.ownerName, "—")}</div>
          <div><span className="text-muted-foreground">Trade license: </span>{str(profile.tradeLicenseNumber ?? detail.tradeLicenseNumber, "—")}</div>
          <div><span className="text-muted-foreground">VAT: </span>{str(profile.vatRegistrationNumber ?? detail.vatRegistrationNumber, "—")}</div>
          <div><span className="text-muted-foreground">Food license: </span>{str(profile.foodLicenseNumber ?? detail.foodLicenseNumber, "—")}</div>
          <div><span className="text-muted-foreground">PO approval levels: </span>{str(settings.poApprovalLevels, "—")}</div>
          <div><span className="text-muted-foreground">Min RFQ (AED): </span>{str(settings.minRfqValueAed, "—")}</div>
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
        <DetailSection title="Addresses">
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
          <div><span className="text-muted-foreground">SKU: </span>{str(detail.sku, "—")}</div>
          <div><span className="text-muted-foreground">Category: </span>{str(detail.category?.name, "—")}</div>
          <div><span className="text-muted-foreground">Brand: </span>{str(detail.brand?.name, "—")}</div>
          <div><span className="text-muted-foreground">Unit: </span>{str(detail.unit?.name ?? detail.unit?.symbol, "—")}</div>
          <div><span className="text-muted-foreground">Org: </span>{str(detail.organization?.name, "—")}</div>
          <div><span className="text-muted-foreground">Price: </span>{money(detail.price ?? detail.unitPrice)}</div>
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
