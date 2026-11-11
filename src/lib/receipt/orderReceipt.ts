import JsBarcode from "jsbarcode";
import {
  RECEIPT_BRAND_TAGLINE,
  RECEIPT_BRAND_TITLE,
  RECEIPT_FOOTER_NAME,
  RECEIPT_LOGO_URL,
  RECEIPT_TERMS,
  RECEIPT_TERMS_SIGN,
  RECEIPT_TERMS_TITLE,
} from "@/constants/receiptBrand";

export type OrderReceiptItem = {
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
};

export type OrderPayload = {
  order_id: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  public_id: string | null;
  branch_name: string;
  branch_code: string;
  trn: string;
  items: OrderReceiptItem[];
  subtotal_amount: number;
  discount_amount: number;
  discount_percent?: number;
  vat_amount: number;
  vat_percent?: number;
  delivery_fee: number;
  total_amount: number;
  currency: string;
  payment_method: string;
  staff_name?: string;
};

export class PopupBlockedError extends Error {
  code = "POPUP_BLOCKED";
  constructor() {
    super("POPUP_BLOCKED");
  }
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function text(value: unknown, fallback = ""): string {
  const s = String(value ?? "").trim();
  return s || fallback;
}

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function money(amount: number, currency: string): string {
  const formatted = amount.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currency} ${formatted}`;
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso || "—";
  const day = date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const time = date
    .toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true })
    .toLowerCase();
  return `${day}, ${time}`;
}

function paymentLabel(raw: string): string {
  const key = raw.toLowerCase();
  if (key === "cash" || key === "bank_transfer" || key === "bank transfer") return "BANK TRANSFER";
  if (key === "credit") return "CREDIT";
  if (key === "cash_and_credit") return "BANK TRANSFER & CREDIT";
  return (raw || "UNPAID").toUpperCase();
}

function shortCode(publicId: string): string {
  return publicId.replace(/^CUS_/i, "");
}

function itemName(row: Record<string, unknown>): string {
  const product = row.product as { name?: string } | undefined;
  return text(product?.name ?? row.productName ?? row.name ?? row.description, "Item");
}

function findTrn(detail: Record<string, any>, items: any[]): string {
  const meta = (detail.metadata || {}) as Record<string, unknown>;
  const supplier = detail.supplierOrg || {};
  const supplierMeta = (supplier.metadata || {}) as Record<string, unknown>;
  const fromItem = items
    .map((item) => item?.product?.trn ?? item?.product?.taxNumber ?? item?.trn)
    .find((value) => text(value));
  return text(fromItem ?? supplierMeta.trn ?? supplier.trn ?? meta.trn ?? detail.trn);
}

export function buildStaffReceiptPayload(detail: Record<string, any>): OrderPayload {
  const meta = (detail.metadata || {}) as Record<string, unknown>;
  const items = Array.isArray(detail.items) ? detail.items : [];
  const currency = text(detail.currency, "AED");
  const buyer = detail.buyerOrg || {};
  const supplier = detail.supplierOrg || {};
  const publicId = text(buyer.publicCode || buyer.public_id || meta.customerPublicId);
  const staff = text(
    meta.staffName ??
      meta.cashierName ??
      detail.placedBy?.name ??
      [detail.createdBy?.firstName, detail.createdBy?.lastName].filter(Boolean).join(" "),
  );
  const subtotal = num(detail.subtotal);
  const vat = num(detail.tax ?? detail.vat);
  const discount = num(meta.discountAmount ?? detail.discount);
  const delivery = num(meta.deliveryFee ?? detail.deliveryFee);
  const total = num(detail.total ?? subtotal + vat - discount + delivery);
  const vatRate = num(meta.vatRate) || (subtotal > 0 && vat > 0 ? Math.round((vat / subtotal) * 1000) / 10 : 0);
  const discountPercent = num(meta.discountPercent);

  return {
    order_id: text(detail.number ?? detail.id, "—"),
    created_at: text(detail.createdAt),
    customer_name: text(buyer.name, "Restaurant"),
    customer_phone: text(buyer.phone),
    public_id: publicId || null,
    branch_name: text(supplier.name, "Supplier"),
    branch_code: text(supplier.publicCode),
    trn: findTrn(detail, items),
    items: items.map((item) => {
      const quantity = num(item.quantity) || 0;
      const unit = num(item.unitPrice);
      const line = num(item.lineTotal ?? item.total) || unit * quantity;
      return {
        name: itemName(item),
        quantity,
        unit_price: unit,
        total_price: line,
      };
    }),
    subtotal_amount: subtotal,
    discount_amount: discount,
    discount_percent: discountPercent > 0 ? discountPercent : undefined,
    vat_amount: vat,
    vat_percent: vatRate > 0 ? vatRate : undefined,
    delivery_fee: delivery,
    total_amount: total,
    currency,
    payment_method: paymentLabel(text(meta.paymentMethod ?? detail.paymentMethod)),
    staff_name: staff || undefined,
  };
}

function barcodeSvg(value: string): string {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  JsBarcode(svg, value, {
    format: "CODE128",
    displayValue: false,
    margin: 0,
    height: 56,
    width: 1.6,
  });
  return svg.outerHTML;
}

function receiptHtml(order: OrderPayload): string {
  const currency = order.currency || "AED";
  const rows = order.items
    .map((item) => {
      const unit =
        item.unit_price > 0
          ? `<div class="unit">${esc(money(item.unit_price, currency))} each</div>`
          : "";
      return `<tr>
        <td>${esc(item.name)}${unit}</td>
        <td class="qty">${esc(item.quantity)}</td>
        <td class="amt">${esc(money(item.total_price, currency))}</td>
      </tr>`;
    })
    .join("");
  const discount =
    order.discount_amount > 0
      ? `<div class="line"><span>Discount${order.discount_percent ? ` (${esc(order.discount_percent)}%)` : ""}</span><span>- ${esc(money(order.discount_amount, currency))}</span></div>`
      : "";
  const vat =
    order.vat_amount > 0
      ? `<div class="line"><span>VAT${order.vat_percent ? ` ${esc(order.vat_percent)}%` : ""}</span><span>${esc(money(order.vat_amount, currency))}</span></div>`
      : "";
  const delivery =
    order.delivery_fee > 0
      ? `<div class="line"><span>Delivery</span><span>${esc(money(order.delivery_fee, currency))}</span></div>`
      : "";
  const barcode = order.public_id
    ? `<section class="block center">
        <div class="kicker">CUSTOMER ID</div>
        <div class="barcode">${barcodeSvg(order.public_id)}</div>
        <div class="code">${esc(shortCode(order.public_id))}</div>
      </section>`
    : "";
  const terms = RECEIPT_TERMS.map((clause, index) => `<p>${index + 1}. ${esc(clause)}</p>`).join("");
  const sign = RECEIPT_TERMS_SIGN.map((line) => `<div>${esc(line)}</div>`).join("");
  const phone = order.customer_phone ? `<div>Phone: ${esc(order.customer_phone)}</div>` : "";
  const staff = order.staff_name ? `<div>Staff: ${esc(order.staff_name)}</div>` : "";
  const trn = order.trn ? `<div>TRN ${esc(order.trn)}</div>` : "";
  const branchCode = order.branch_code ? `<div class="muted">${esc(order.branch_code)}</div>` : "";

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Receipt ${esc(order.order_id)}</title>
  <style>
    @page { size: 80mm auto; margin: 4mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #000; background: #fff; font: 12px/1.35 Arial, Helvetica, sans-serif; }
    .receipt { width: 72mm; margin: 0 auto; }
    .center { text-align: center; }
    img.logo { display: block; margin: 0 auto 6px; max-width: 42mm; max-height: 16mm; object-fit: contain; }
    h1 { margin: 0; font-size: 16px; letter-spacing: 0.04em; }
    .tag { margin: 2px 0 8px; font-size: 11px; }
    .rule { border: 0; border-top: 1px dashed #000; margin: 8px 0; }
    .kicker { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; }
    .muted { font-size: 11px; }
    table { width: 100%; border-collapse: collapse; }
    td { vertical-align: top; padding: 3px 0; }
    .qty, .amt { text-align: right; white-space: nowrap; }
    .qty { width: 8mm; }
    .unit { font-size: 10px; }
    .line, .total { display: flex; justify-content: space-between; gap: 8px; }
    .total { font-size: 14px; font-weight: 700; margin-top: 4px; }
    .barcode svg { width: 64mm; height: 16mm; }
    .code { font-size: 11px; letter-spacing: 0.08em; margin-top: 2px; }
    .terms { font-size: 9px; line-height: 1.3; }
    .terms h2 { font-size: 11px; margin: 0 0 4px; text-align: center; }
    .terms p { margin: 0 0 4px; }
    .sign { text-align: center; margin-top: 6px; font-size: 10px; }
    .footer { text-align: center; font-size: 11px; margin-top: 8px; }
  </style>
</head>
<body>
  <main class="receipt">
    <img class="logo" src="${esc(RECEIPT_LOGO_URL)}" alt="${esc(RECEIPT_BRAND_TITLE)}" />
    <div class="center">
      <h1>${esc(RECEIPT_BRAND_TITLE)}</h1>
      <div class="tag">${esc(RECEIPT_BRAND_TAGLINE)}</div>
      <div>${esc(order.branch_name)}</div>
      ${branchCode}
    </div>
    <hr class="rule" />
    <div class="center">
      ${trn}
      <div class="kicker">TAX INVOICE</div>
    </div>
    <hr class="rule" />
    <div><strong>${esc(order.order_id)}</strong></div>
    <div class="muted">${esc(formatWhen(order.created_at))}</div>
    <hr class="rule" />
    <div>${esc(order.customer_name)}</div>
    ${phone}
    ${staff}
    <hr class="rule" />
    <table>
      <tbody>${rows || `<tr><td colspan="3">No items</td></tr>`}</tbody>
    </table>
    <hr class="rule" />
    <div class="line"><span>Subtotal</span><span>${esc(money(order.subtotal_amount, currency))}</span></div>
    ${discount}
    ${vat}
    ${delivery}
    <div class="total"><span>TOTAL</span><span>${esc(money(order.total_amount, currency))}</span></div>
    <hr class="rule" />
    <div class="kicker">${esc(order.payment_method)}</div>
    ${barcode}
    <hr class="rule" />
    <section class="terms">
      <h2>${esc(RECEIPT_TERMS_TITLE)}</h2>
      ${terms}
      <div class="sign">${sign}</div>
    </section>
    <div class="footer">Thank you for choosing ${esc(RECEIPT_FOOTER_NAME)}</div>
  </main>
  <script>
    function go() {
      var img = document.querySelector("img.logo");
      var print = function () {
        window.print();
        window.addEventListener("afterprint", function () { window.close(); });
        setTimeout(function () { window.close(); }, 1500);
      };
      if (!img || img.complete) print();
      else {
        img.addEventListener("load", print);
        img.addEventListener("error", print);
      }
    }
    window.addEventListener("load", go);
  </script>
</body>
</html>`;
}

export function printOrderReceipt(order: OrderPayload) {
  const win = window.open("", "_blank", "width=420,height=800");
  if (!win) throw new PopupBlockedError();
  win.document.open();
  win.document.write(receiptHtml(order));
  win.document.close();
}
