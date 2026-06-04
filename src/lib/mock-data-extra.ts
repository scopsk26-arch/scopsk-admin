// Extended mock datasets for every admin page.

export const deliveries = [
  { id: "DLV-7701", po: "PO-5512", restaurant: "Smoke & Sear", supplier: "Atlas Meat Co.", driver: "Ahmed Al-Maktoum", eta: "2025-06-04 14:20", status: "delivered" },
  { id: "DLV-7702", po: "PO-5513", restaurant: "Pearl Sushi", supplier: "Blue Ocean Seafood", driver: "Rashid Khan", eta: "2025-06-04 16:00", status: "dispatched" },
  { id: "DLV-7703", po: "PO-5514", restaurant: "Cedar & Vine", supplier: "Gulf Premium Foods", driver: "Omar Saleh", eta: "2025-06-05 09:30", status: "processing" },
  { id: "DLV-7704", po: "PO-5515", restaurant: "Crown Hospitality", supplier: "Crystal Beverage Co.", driver: "Yousef Ibrahim", eta: "2025-06-05 11:15", status: "ready" },
  { id: "DLV-7705", po: "PO-5516", restaurant: "Harbor Catch", supplier: "Blue Ocean Seafood", driver: "Karim Hassan", eta: "2025-06-04 18:45", status: "delayed" },
  { id: "DLV-7706", po: "PO-5517", restaurant: "Saffron Bistro", supplier: "Saffron Spice House", driver: "Tariq Aziz", eta: "2025-06-06 08:00", status: "scheduled" },
];

export const invoices = [
  { id: "INV-9001", po: "PO-5512", party: "Atlas Meat Co.", amount: 78400, vat: 3920, status: "paid", due: "2025-05-30" },
  { id: "INV-9002", po: "PO-5513", party: "Blue Ocean Seafood", amount: 33200, vat: 1660, status: "pending", due: "2025-06-08" },
  { id: "INV-9003", po: "PO-5514", party: "Gulf Premium Foods", amount: 4620, vat: 231, status: "overdue", due: "2025-05-28" },
  { id: "INV-9004", po: "PO-5515", party: "Crystal Beverage Co.", amount: 59800, vat: 2990, status: "approved", due: "2025-06-12" },
  { id: "INV-9005", po: "PO-5516", party: "Blue Ocean Seafood", amount: 22100, vat: 1105, status: "pending", due: "2025-06-15" },
  { id: "INV-9006", po: "PO-5511", party: "Saffron Spice House", amount: 12480, vat: 624, status: "paid", due: "2025-05-21" },
];

export const payments = [
  { id: "PAY-4401", invoice: "INV-9001", method: "Bank Transfer", amount: 82320, status: "completed", date: "2025-05-29" },
  { id: "PAY-4402", invoice: "INV-9006", method: "Credit Card", amount: 13104, status: "completed", date: "2025-05-21" },
  { id: "PAY-4403", invoice: "INV-9002", method: "Bank Transfer", amount: 34860, status: "processing", date: "2025-06-03" },
  { id: "PAY-4404", invoice: "INV-9003", method: "Bank Transfer", amount: 4851, status: "failed", date: "2025-06-01" },
  { id: "PAY-4405", invoice: "INV-9004", method: "Wallet", amount: 62790, status: "pending", date: "2025-06-04" },
];

export const commissions = [
  { id: "COM-2201", po: "PO-5512", supplier: "Atlas Meat Co.", gross: 78400, rate: "4.5%", commission: 3528, status: "paid" },
  { id: "COM-2202", po: "PO-5513", supplier: "Blue Ocean Seafood", gross: 33200, rate: "5.0%", commission: 1660, status: "pending" },
  { id: "COM-2203", po: "PO-5514", supplier: "Gulf Premium Foods", gross: 4620, rate: "5.0%", commission: 231, status: "pending" },
  { id: "COM-2204", po: "PO-5515", supplier: "Crystal Beverage Co.", gross: 59800, rate: "4.0%", commission: 2392, status: "approved" },
  { id: "COM-2205", po: "PO-5516", supplier: "Blue Ocean Seafood", gross: 22100, rate: "5.0%", commission: 1105, status: "paid" },
];

export const categories = [
  { id: "CAT-01", name: "Produce", parent: "—", products: 482, suppliers: 64, status: "active" },
  { id: "CAT-02", name: "Meat & Poultry", parent: "—", products: 318, suppliers: 41, status: "active" },
  { id: "CAT-03", name: "Seafood", parent: "—", products: 196, suppliers: 22, status: "active" },
  { id: "CAT-04", name: "Dairy", parent: "—", products: 142, suppliers: 28, status: "active" },
  { id: "CAT-05", name: "Bakery & Flour", parent: "—", products: 88, suppliers: 19, status: "active" },
  { id: "CAT-06", name: "Beverages", parent: "—", products: 264, suppliers: 35, status: "active" },
  { id: "CAT-07", name: "Spices & Dry Goods", parent: "—", products: 210, suppliers: 24, status: "active" },
  { id: "CAT-08", name: "Organic Produce", parent: "Produce", products: 96, suppliers: 14, status: "active" },
  { id: "CAT-09", name: "Frozen", parent: "—", products: 124, suppliers: 17, status: "draft" },
];

export const catalog = [
  { sku: "PRD-10044", name: "Wagyu Ribeye A5", category: "Meat", unit: "kg", price: 720, supplier: "Atlas Meat Co.", stock: 86, status: "active" },
  { sku: "PRD-10092", name: "Atlantic Salmon Fillet", category: "Seafood", unit: "kg", price: 84, supplier: "Blue Ocean Seafood", stock: 240, status: "active" },
  { sku: "PRD-10117", name: "Organic Baby Spinach", category: "Produce", unit: "kg", price: 22, supplier: "Verde Organic Farms", stock: 320, status: "active" },
  { sku: "PRD-10183", name: "Saffron Threads (Premium)", category: "Spices", unit: "g", price: 18, supplier: "Saffron Spice House", stock: 1800, status: "active" },
  { sku: "PRD-10221", name: "Full-cream Milk", category: "Dairy", unit: "L", price: 6.4, supplier: "Gulf Premium Foods", stock: 1240, status: "active" },
  { sku: "PRD-10307", name: "Sparkling Water 750ml", category: "Beverages", unit: "case", price: 64, supplier: "Crystal Beverage Co.", stock: 480, status: "active" },
  { sku: "PRD-10412", name: "Sourdough Loaf 500g", category: "Bakery", unit: "ea", price: 14, supplier: "Pearl Bakery Supply", stock: 220, status: "active" },
  { sku: "PRD-10519", name: "Black Truffle (Fresh)", category: "Produce", unit: "g", price: 12, supplier: "Gulf Premium Foods", stock: 80, status: "low" },
];

export const kycQueue = [
  { id: "KYC-1", entity: "Olive Grove", type: "Restaurant", submitted: "2025-06-02", priority: "high", reviewer: "Sara M.", status: "pending" },
  { id: "KYC-2", entity: "Pearl Bakery Supply", type: "Supplier", submitted: "2025-06-02", priority: "medium", reviewer: "Omar K.", status: "review" },
  { id: "KYC-3", entity: "Verde Kitchen", type: "Restaurant", submitted: "2025-06-01", priority: "medium", reviewer: "Sara M.", status: "pending" },
  { id: "KYC-4", entity: "Crystal Beverage Co.", type: "Supplier", submitted: "2025-05-30", priority: "low", reviewer: "Layla B.", status: "approved" },
  { id: "KYC-5", entity: "Smoke & Sear (new branch)", type: "Restaurant", submitted: "2025-05-29", priority: "high", reviewer: "Omar K.", status: "review" },
  { id: "KYC-6", entity: "Atlas Meat Co.", type: "Supplier", submitted: "2025-05-28", priority: "low", reviewer: "Sara M.", status: "approved" },
];

export const fraudAlerts = [
  { id: "FR-501", subject: "RFQ-2902", reason: "3 quotations with identical pricing", severity: "high", model: "PriceClusterV3", status: "open" },
  { id: "FR-502", subject: "Supplier s-3005", reason: "Login from unusual region (PK)", severity: "medium", model: "GeoBaseline", status: "review" },
  { id: "FR-503", subject: "RFQ-2906", reason: "Unusual bid pattern detected", severity: "high", model: "BidAnomaly", status: "open" },
  { id: "FR-504", subject: "INV-9003", reason: "Invoice amount > 3σ from PO", severity: "medium", model: "InvoiceGuard", status: "resolved" },
  { id: "FR-505", subject: "User u-8821", reason: "10 failed login attempts", severity: "low", model: "AuthGuard", status: "resolved" },
];

export const aiModels = [
  { id: "AI-M1", name: "Quotation Score V4", type: "Ranking", status: "active", accuracy: "94.2%", lastTrained: "2025-05-31" },
  { id: "AI-M2", name: "Fraud Bid Anomaly", type: "Anomaly Detection", status: "active", accuracy: "91.6%", lastTrained: "2025-05-28" },
  { id: "AI-M3", name: "Demand Forecast", type: "Forecasting", status: "active", accuracy: "88.9%", lastTrained: "2025-05-25" },
  { id: "AI-M4", name: "Supplier Match", type: "Recommendation", status: "review", accuracy: "82.1%", lastTrained: "2025-05-19" },
  { id: "AI-M5", name: "Price Cluster V3", type: "Clustering", status: "active", accuracy: "90.4%", lastTrained: "2025-05-30" },
];

export const supportTickets = [
  { id: "TKT-7701", subject: "Cannot upload trade license", requester: "Olive Grove", priority: "high", agent: "Sara M.", sla: "2h", status: "open" },
  { id: "TKT-7702", subject: "Payment not reflecting", requester: "Atlas Meat Co.", priority: "high", agent: "Omar K.", sla: "1h", status: "review" },
  { id: "TKT-7703", subject: "Need to update bank details", requester: "Blue Ocean Seafood", priority: "medium", agent: "Layla B.", sla: "4h", status: "pending" },
  { id: "TKT-7704", subject: "Question about commission tier", requester: "Crown Hospitality", priority: "low", agent: "Sara M.", sla: "24h", status: "resolved" },
  { id: "TKT-7705", subject: "Cannot publish new RFQ", requester: "Cedar & Vine", priority: "high", agent: "Omar K.", sla: "1h", status: "open" },
];

export const communications = [
  { id: "MSG-3301", channel: "Email", subject: "New quotation received — RFQ-2901", from: "Gulf Premium Foods", to: "Saffron Bistro", status: "delivered", time: "2m ago" },
  { id: "MSG-3302", channel: "In-app", subject: "PO approved by buyer", from: "System", to: "Atlas Meat Co.", status: "delivered", time: "9m ago" },
  { id: "MSG-3303", channel: "SMS", subject: "Delivery dispatched", from: "Prime Plate", to: "Pearl Sushi", status: "delivered", time: "18m ago" },
  { id: "MSG-3304", channel: "Email", subject: "Invoice overdue reminder", from: "Finance", to: "Cedar & Vine", status: "sent", time: "1h ago" },
  { id: "MSG-3305", channel: "Push", subject: "AI insight: re-price 14 RFQs", from: "Copilot", to: "Admin", status: "delivered", time: "2h ago" },
];

export const marketingCampaigns = [
  { id: "CMP-501", name: "Ramadan Spring Activation", channel: "Email", audience: "Restaurants — UAE", sent: 2840, opens: 1612, clicks: 482, conv: 124, status: "active" },
  { id: "CMP-502", name: "Supplier Onboarding Boost", channel: "Email + SMS", audience: "Suppliers — pending", sent: 612, opens: 388, clicks: 142, conv: 38, status: "active" },
  { id: "CMP-503", name: "Re-engage idle accounts", channel: "Push", audience: "Idle 21+ days", sent: 488, opens: 220, clicks: 64, conv: 18, status: "scheduled" },
  { id: "CMP-504", name: "Q3 Subscription Upsell", channel: "Email", audience: "Trial users", sent: 1240, opens: 720, clicks: 244, conv: 76, status: "completed" },
];

export const notifications = [
  { id: "N-1", category: "Approval", title: "KYC awaiting review", body: "Olive Grove submitted documents", time: "4m ago", read: false },
  { id: "N-2", category: "Fraud", title: "High-severity alert", body: "RFQ-2902 flagged by AI", time: "18m ago", read: false },
  { id: "N-3", category: "Finance", title: "Payment failed", body: "INV-9003 (Gulf Premium Foods)", time: "1h ago", read: false },
  { id: "N-4", category: "System", title: "Nightly model retrain complete", body: "Quotation Score V4 — 94.2%", time: "3h ago", read: true },
  { id: "N-5", category: "Trade", title: "12 new quotations", body: "RFQ-2902 received bids", time: "5h ago", read: true },
];

export const cmsPages = [
  { id: "CMS-1", title: "Landing — Restaurants", slug: "/for-restaurants", status: "published", updated: "2025-05-30", author: "Sara M." },
  { id: "CMS-2", title: "Landing — Suppliers", slug: "/for-suppliers", status: "published", updated: "2025-05-28", author: "Omar K." },
  { id: "CMS-3", title: "FAQ", slug: "/faq", status: "published", updated: "2025-05-22", author: "Layla B." },
  { id: "CMS-4", title: "Terms of Service", slug: "/terms", status: "published", updated: "2025-04-12", author: "Legal" },
  { id: "CMS-5", title: "Privacy Policy", slug: "/privacy", status: "published", updated: "2025-04-12", author: "Legal" },
  { id: "CMS-6", title: "Help — Getting started", slug: "/help/getting-started", status: "draft", updated: "2025-06-02", author: "Sara M." },
];

export const subscriptions = [
  { id: "SUB-1", customer: "Crown Hospitality Group", plan: "Enterprise Annual", mrr: 4800, renews: "2026-01-04", status: "active" },
  { id: "SUB-2", customer: "Smoke & Sear", plan: "Pro Monthly", mrr: 690, renews: "2025-06-22", status: "active" },
  { id: "SUB-3", customer: "Olive Grove", plan: "Trial", mrr: 0, renews: "2025-06-12", status: "pending" },
  { id: "SUB-4", customer: "Atlas Meat Co.", plan: "Supplier Pro", mrr: 420, renews: "2025-07-01", status: "active" },
  { id: "SUB-5", customer: "Pearl Sushi", plan: "Standard Monthly", mrr: 290, renews: "2025-06-09", status: "suspended" },
];

export const files = [
  { id: "F-1", name: "trade-license-atlas.pdf", owner: "Atlas Meat Co.", type: "Trade License", size: "1.2 MB", uploaded: "2025-04-19", status: "verified" },
  { id: "F-2", name: "vat-cert-blue-ocean.pdf", owner: "Blue Ocean Seafood", type: "VAT Certificate", size: "640 KB", uploaded: "2025-05-02", status: "verified" },
  { id: "F-3", name: "contract-saffron-2025.pdf", owner: "Saffron Bistro", type: "Contract", size: "2.4 MB", uploaded: "2025-05-22", status: "active" },
  { id: "F-4", name: "kyc-olive-grove.zip", owner: "Olive Grove", type: "KYC Bundle", size: "8.1 MB", uploaded: "2025-06-02", status: "pending" },
  { id: "F-5", name: "invoice-batch-may.csv", owner: "Finance", type: "Export", size: "320 KB", uploaded: "2025-06-01", status: "active" },
];

export const apiKeys = [
  { id: "KEY-1", label: "Production — Web", scope: "read:catalog write:rfq", lastUsed: "2m ago", calls24h: 42180, status: "active" },
  { id: "KEY-2", label: "Mobile — iOS", scope: "read:* write:order", lastUsed: "9m ago", calls24h: 18420, status: "active" },
  { id: "KEY-3", label: "Partner — Logistics", scope: "read:delivery write:status", lastUsed: "1h ago", calls24h: 2840, status: "active" },
  { id: "KEY-4", label: "Sandbox", scope: "read:*", lastUsed: "3d ago", calls24h: 12, status: "pending" },
  { id: "KEY-5", label: "Legacy v1", scope: "read:catalog", lastUsed: "12d ago", calls24h: 0, status: "suspended" },
];

export const auditLogs = [
  { id: "LOG-1", actor: "sara.m@primeplate.ae", action: "approved KYC", target: "Olive Grove", ip: "94.200.12.4", time: "2m ago" },
  { id: "LOG-2", actor: "omar.k@primeplate.ae", action: "updated commission rate", target: "Atlas Meat Co. (4.5%)", ip: "94.200.12.7", time: "14m ago" },
  { id: "LOG-3", actor: "system", action: "auto-flagged quotation", target: "Q-8825", ip: "—", time: "22m ago" },
  { id: "LOG-4", actor: "layla.b@primeplate.ae", action: "exported invoices CSV", target: "May 2025 batch", ip: "94.200.12.9", time: "1h ago" },
  { id: "LOG-5", actor: "omar.k@primeplate.ae", action: "suspended supplier", target: "Verde Organic Farms", ip: "94.200.12.7", time: "3h ago" },
  { id: "LOG-6", actor: "sara.m@primeplate.ae", action: "edited CMS page", target: "/for-restaurants", ip: "94.200.12.4", time: "5h ago" },
];

export const roles = [
  { id: "ROLE-1", name: "Super Admin", users: 3, scope: "All modules", builtin: true, status: "active" },
  { id: "ROLE-2", name: "Operations Manager", users: 8, scope: "Trade, Finance, Logistics", builtin: true, status: "active" },
  { id: "ROLE-3", name: "KYC Reviewer", users: 5, scope: "KYC, Files", builtin: true, status: "active" },
  { id: "ROLE-4", name: "Finance", users: 6, scope: "Invoices, Payments, Commissions", builtin: true, status: "active" },
  { id: "ROLE-5", name: "Support Agent", users: 12, scope: "Support, Communications", builtin: true, status: "active" },
  { id: "ROLE-6", name: "Marketing", users: 4, scope: "Marketing, CMS, Notifications", builtin: false, status: "active" },
  { id: "ROLE-7", name: "Read-only Analyst", users: 9, scope: "Reports, BI (read)", builtin: false, status: "active" },
];

export const reports = [
  { id: "RPT-1", name: "GMV by Region", category: "Finance", schedule: "Daily", lastRun: "08:00", owner: "Finance" },
  { id: "RPT-2", name: "Supplier Win-Rate", category: "Marketplace", schedule: "Weekly", lastRun: "Mon 09:00", owner: "Ops" },
  { id: "RPT-3", name: "Restaurant Spend Cohort", category: "Marketplace", schedule: "Monthly", lastRun: "1st 06:00", owner: "Growth" },
  { id: "RPT-4", name: "Fraud Incident Summary", category: "Risk", schedule: "Weekly", lastRun: "Mon 10:00", owner: "Risk" },
  { id: "RPT-5", name: "Commission Payouts", category: "Finance", schedule: "Monthly", lastRun: "1st 06:00", owner: "Finance" },
  { id: "RPT-6", name: "AI Model Performance", category: "Intelligence", schedule: "Weekly", lastRun: "Sun 23:00", owner: "Data" },
];

export const activityFeed = [
  { id: "AC-1", type: "rfq.created", actor: "Saffron Bistro", text: "created RFQ-2906 for Beverages (4,800 units)", time: "just now" },
  { id: "AC-2", type: "quotation.received", actor: "Atlas Meat Co.", text: "submitted Q-8823 (AED 78,400) on RFQ-2902", time: "2m ago" },
  { id: "AC-3", type: "kyc.submitted", actor: "Olive Grove", text: "submitted KYC documents for review", time: "4m ago" },
  { id: "AC-4", type: "po.approved", actor: "Smoke & Sear", text: "approved PO-5512 for AED 78,400", time: "12m ago" },
  { id: "AC-5", type: "fraud.flag", actor: "AI Copilot", text: "flagged Q-8825 for review (score 64)", time: "18m ago" },
  { id: "AC-6", type: "payment.completed", actor: "Finance", text: "marked PAY-4401 as completed (AED 82,320)", time: "26m ago" },
  { id: "AC-7", type: "delivery.dispatched", actor: "Blue Ocean Seafood", text: "dispatched DLV-7702 to Pearl Sushi", time: "41m ago" },
  { id: "AC-8", type: "model.retrained", actor: "System", text: "Quotation Score V4 retrained — 94.2% accuracy", time: "3h ago" },
  { id: "AC-9", type: "supplier.suspended", actor: "Omar K.", text: "suspended Verde Organic Farms pending review", time: "3h ago" },
  { id: "AC-10", type: "cms.updated", actor: "Sara M.", text: "edited /for-restaurants landing page", time: "5h ago" },
];
