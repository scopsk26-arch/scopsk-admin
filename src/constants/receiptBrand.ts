/** Fixed copy on the admin thermal receipt. Order data stays dynamic. */
export const RECEIPT_BRAND_TITLE = "ScopsK";
export const RECEIPT_BRAND_TAGLINE = "Restaurant supply, in one place";
export const RECEIPT_FOOTER_NAME = "ScopsK";
export const RECEIPT_TERMS_TITLE = "TERMS & CONDITIONS";

export const RECEIPT_TERMS: string[] = [
  "This receipt records a marketplace order between the restaurant and the supplier. ScopsK is the platform that records the order, payment, and delivery.",
  "Prices are in the currency shown. VAT is included only when an amount is printed in the tax line.",
  "Credit orders stay payable to ScopsK under the approved credit terms. Bank transfer orders are settled from the restaurant wallet.",
  "The supplier must deliver the items and quantities on this receipt. Shortages, damage, or a wrong item must be raised as a dispute on the order.",
  "A cancelled order is refunded to the same wallet or credit balance used to pay it. A delivered order is complete once the restaurant accepts the delivery.",
  "Keep this receipt with the order number. It is the record of what was ordered, what was charged, and how it was paid.",
];

export const RECEIPT_TERMS_SIGN: string[] = [
  "ScopsK",
  "B2B procurement marketplace",
];

/** Print-safe wordmark. Absolute URL so the print window can load it. */
export const RECEIPT_LOGO_URL =
  "https://hazziassets.blr1.cdn.digitaloceanspaces.com/scopsk/brand/logo-on-light.png";
