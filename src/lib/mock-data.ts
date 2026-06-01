// Centralized mock data for the Prime Plate Procurement admin panel.
// This is intentionally rich so every screen feels real.

export const kpis = {
  totalRestaurants: 2847,
  totalSuppliers: 1293,
  activeRfqs: 184,
  activeQuotations: 921,
  approvedPOs: 612,
  marketplaceRevenue: 4_820_000,
  transactionVolume: 28_400_000,
  aiRecommendations: 14_280,
  avgSavings: 18.4,
  supplierSuccessRate: 87.2,
};

export const rfqTrend = [
  { month: "Jan", rfqs: 120, quotations: 410 },
  { month: "Feb", rfqs: 142, quotations: 488 },
  { month: "Mar", rfqs: 168, quotations: 540 },
  { month: "Apr", rfqs: 155, quotations: 521 },
  { month: "May", rfqs: 198, quotations: 670 },
  { month: "Jun", rfqs: 221, quotations: 742 },
  { month: "Jul", rfqs: 246, quotations: 820 },
  { month: "Aug", rfqs: 268, quotations: 901 },
  { month: "Sep", rfqs: 284, quotations: 960 },
];

export const revenueTrend = [
  { month: "Jan", revenue: 280_000, commission: 32_000 },
  { month: "Feb", revenue: 340_000, commission: 38_000 },
  { month: "Mar", revenue: 410_000, commission: 46_000 },
  { month: "Apr", revenue: 388_000, commission: 44_000 },
  { month: "May", revenue: 462_000, commission: 52_000 },
  { month: "Jun", revenue: 528_000, commission: 60_000 },
  { month: "Jul", revenue: 604_000, commission: 68_000 },
  { month: "Aug", revenue: 672_000, commission: 76_000 },
  { month: "Sep", revenue: 736_000, commission: 84_000 },
];

export const supplierPerformance = [
  { name: "Fresh", winRate: 72, rating: 4.8 },
  { name: "Quality", winRate: 65, rating: 4.6 },
  { name: "Delivery", winRate: 81, rating: 4.7 },
  { name: "Pricing", winRate: 58, rating: 4.4 },
  { name: "Service", winRate: 76, rating: 4.5 },
];

export const restaurants = [
  { id: "r-1024", name: "Saffron Bistro", status: "active", branches: 4, rfqs: 38, orders: 26, spend: 184_200, region: "Dubai", industry: "Fine Dining", registered: "2024-03-12" },
  { id: "r-1025", name: "Olive Grove", status: "pending", branches: 2, rfqs: 12, orders: 4, spend: 22_500, region: "Abu Dhabi", industry: "Mediterranean", registered: "2024-08-02" },
  { id: "r-1026", name: "Smoke & Sear", status: "active", branches: 8, rfqs: 64, orders: 52, spend: 412_000, region: "Riyadh", industry: "Steakhouse", registered: "2023-11-21" },
  { id: "r-1027", name: "Pearl Sushi", status: "suspended", branches: 3, rfqs: 21, orders: 14, spend: 96_800, region: "Doha", industry: "Japanese", registered: "2024-01-08" },
  { id: "r-1028", name: "Cedar & Vine", status: "active", branches: 5, rfqs: 47, orders: 38, spend: 268_400, region: "Dubai", industry: "Levantine", registered: "2023-09-14" },
  { id: "r-1029", name: "Harbor Catch", status: "verified", branches: 6, rfqs: 55, orders: 41, spend: 312_900, region: "Jeddah", industry: "Seafood", registered: "2023-07-30" },
  { id: "r-1030", name: "Verde Kitchen", status: "active", branches: 2, rfqs: 18, orders: 11, spend: 54_700, region: "Sharjah", industry: "Vegan", registered: "2024-05-19" },
  { id: "r-1031", name: "Crown Hospitality Group", status: "active", branches: 22, rfqs: 184, orders: 142, spend: 1_240_000, region: "Dubai", industry: "Hotel Group", registered: "2022-12-04" },
];

export const suppliers = [
  { id: "s-3001", name: "Gulf Premium Foods", categories: ["Produce", "Dairy"], revenue: 980_000, winRate: 72, rating: 4.8, status: "verified" },
  { id: "s-3002", name: "Atlas Meat Co.", categories: ["Meat", "Poultry"], revenue: 1_240_000, winRate: 68, rating: 4.6, status: "verified" },
  { id: "s-3003", name: "Blue Ocean Seafood", categories: ["Seafood"], revenue: 612_000, winRate: 81, rating: 4.7, status: "pending" },
  { id: "s-3004", name: "Saffron Spice House", categories: ["Spices", "Dry Goods"], revenue: 244_000, winRate: 54, rating: 4.3, status: "verified" },
  { id: "s-3005", name: "Verde Organic Farms", categories: ["Produce", "Organic"], revenue: 388_000, winRate: 63, rating: 4.5, status: "suspended" },
  { id: "s-3006", name: "Crystal Beverage Co.", categories: ["Beverages"], revenue: 502_000, winRate: 70, rating: 4.4, status: "verified" },
  { id: "s-3007", name: "Pearl Bakery Supply", categories: ["Bakery", "Flour"], revenue: 178_000, winRate: 58, rating: 4.2, status: "pending" },
];

export const rfqs = [
  { id: "RFQ-2901", restaurant: "Saffron Bistro", category: "Produce", quantity: "240 kg", status: "open", quotations: 8, created: "2025-05-22", budget: 12_400 },
  { id: "RFQ-2902", restaurant: "Smoke & Sear", category: "Meat", quantity: "1.2 t", status: "open", quotations: 12, created: "2025-05-23", budget: 84_000 },
  { id: "RFQ-2903", restaurant: "Pearl Sushi", category: "Seafood", quantity: "180 kg", status: "closed", quotations: 6, created: "2025-05-19", budget: 36_000 },
  { id: "RFQ-2904", restaurant: "Cedar & Vine", category: "Dairy", quantity: "320 L", status: "open", quotations: 9, created: "2025-05-24", budget: 4_800 },
  { id: "RFQ-2905", restaurant: "Verde Kitchen", category: "Organic Produce", quantity: "140 kg", status: "draft", quotations: 0, created: "2025-05-25", budget: 7_200 },
  { id: "RFQ-2906", restaurant: "Crown Hospitality", category: "Beverages", quantity: "4,800 units", status: "open", quotations: 14, created: "2025-05-25", budget: 62_000 },
];

export const quotations = [
  { id: "Q-8821", rfq: "RFQ-2901", supplier: "Gulf Premium Foods", restaurant: "Saffron Bistro", amount: 11_240, status: "pending", aiScore: 92 },
  { id: "Q-8822", rfq: "RFQ-2901", supplier: "Verde Organic Farms", restaurant: "Saffron Bistro", amount: 11_980, status: "pending", aiScore: 88 },
  { id: "Q-8823", rfq: "RFQ-2902", supplier: "Atlas Meat Co.", restaurant: "Smoke & Sear", amount: 78_400, status: "approved", aiScore: 95 },
  { id: "Q-8824", rfq: "RFQ-2903", supplier: "Blue Ocean Seafood", restaurant: "Pearl Sushi", amount: 33_200, status: "approved", aiScore: 91 },
  { id: "Q-8825", rfq: "RFQ-2904", supplier: "Gulf Premium Foods", restaurant: "Cedar & Vine", amount: 4_620, status: "flagged", aiScore: 64 },
  { id: "Q-8826", rfq: "RFQ-2906", supplier: "Crystal Beverage Co.", restaurant: "Crown Hospitality", amount: 59_800, status: "pending", aiScore: 89 },
];

export const purchaseOrders = [
  { id: "PO-5512", restaurant: "Smoke & Sear", supplier: "Atlas Meat Co.", amount: 78_400, status: "delivered" },
  { id: "PO-5513", restaurant: "Pearl Sushi", supplier: "Blue Ocean Seafood", amount: 33_200, status: "dispatched" },
  { id: "PO-5514", restaurant: "Cedar & Vine", supplier: "Gulf Premium Foods", amount: 4_620, status: "processing" },
  { id: "PO-5515", restaurant: "Crown Hospitality", supplier: "Crystal Beverage Co.", amount: 59_800, status: "ready" },
  { id: "PO-5516", restaurant: "Harbor Catch", supplier: "Blue Ocean Seafood", amount: 22_100, status: "delayed" },
];

export const pendingApprovals = [
  { id: "APR-1", type: "KYC", subject: "Olive Grove", priority: "high", time: "4m ago" },
  { id: "APR-2", type: "Quotation", subject: "Q-8825 flagged by AI", priority: "high", time: "18m ago" },
  { id: "APR-3", type: "Refund", subject: "PO-5501 partial refund", priority: "medium", time: "1h ago" },
  { id: "APR-4", type: "Supplier", subject: "Pearl Bakery Supply verification", priority: "medium", time: "3h ago" },
];

export const suspiciousActivity = [
  { id: "S-1", text: "3 quotations with identical pricing on RFQ-2902", severity: "high", time: "12m ago" },
  { id: "S-2", text: "Supplier s-3005 logged in from new region", severity: "medium", time: "1h ago" },
  { id: "S-3", text: "Unusual bid pattern detected on RFQ-2906", severity: "high", time: "2h ago" },
];

export const aiInsights = [
  { id: "AI-1", title: "Avg. produce prices in Dubai rose 6.2%", detail: "Recommend re-pricing 14 active RFQs." },
  { id: "AI-2", title: "Atlas Meat Co. win-rate at 95% in steakhouse category", detail: "Consider featured-supplier promotion." },
  { id: "AI-3", title: "47 restaurants idle for 21+ days", detail: "Trigger re-engagement campaign." },
];

export const heatmap = Array.from({ length: 7 }, (_, d) =>
  Array.from({ length: 24 }, (_, h) => ({
    day: d,
    hour: h,
    value: Math.round(Math.random() * 100),
  }))
).flat();

export type Status = "active" | "pending" | "suspended" | "verified" | "draft" | "open" | "closed" | "approved" | "flagged" | "delivered" | "dispatched" | "processing" | "ready" | "delayed";
