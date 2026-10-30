/** Matches restaurant/supplier app registration options. */

export const DUBAI_AREAS = [
  "Al Barsha",
  "Al Quoz",
  "Business Bay",
  "Deira",
  "Discovery Gardens",
  "Downtown Dubai",
  "Dubai Hills",
  "Dubai Internet City",
  "Dubai Marina",
  "Dubai Silicon Oasis",
  "Jebel Ali",
  "Jumeirah",
  "Jumeirah Lake Towers",
  "Jumeirah Village Circle",
  "Karama",
  "Mirdif",
  "Motor City",
  "Palm Jumeirah",
  "Sheikh Zayed Road",
  "Sports City",
  "Trade Centre",
];

export const PRODUCT_CATEGORIES = [
  "Fresh Vegetables & Fruits",
  "Meat & Poultry",
  "Fish & Seafood",
  "Dairy & Eggs",
  "Rice, Flour & Grains",
  "Spices & Condiments",
  "Frozen Foods",
  "Beverages",
  "Bakery Products",
  "Packaging & Disposables",
  "Cleaning & Hygiene",
  "Other",
];

export const WEEKDAY_OPTIONS = [
  { value: "mon", label: "Mon" },
  { value: "tue", label: "Tue" },
  { value: "wed", label: "Wed" },
  { value: "thu", label: "Thu" },
  { value: "fri", label: "Fri" },
  { value: "sat", label: "Sat" },
  { value: "sun", label: "Sun" },
];

export const PAYMENT_TERM_OPTIONS = ["cash_only", "credit_only", "cash_or_credit"];

/** Supplier signup only asks whether they offer credit. Older accounts may still be credit_only. */
export const SUPPLIER_SELLING_TERM_OPTIONS = [
  { value: "cash_only", label: "Cash on Delivery" },
  { value: "credit_only", label: "Credit Terms" },
  { value: "cash_or_credit", label: "Both Cash & Credit" },
];

export function supplierSellingTermsLabel(value: unknown): string {
  const key = String(value || "").toLowerCase();
  return SUPPLIER_SELLING_TERM_OPTIONS.find((option) => option.value === key)?.label || "—";
}

export function areaOptions() {
  return DUBAI_AREAS.map((value) => ({ value, label: value }));
}

export function categoryOptions() {
  return PRODUCT_CATEGORIES.map((value) => ({ value, label: value }));
}
