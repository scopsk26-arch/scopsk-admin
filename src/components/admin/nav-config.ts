import {
  LayoutDashboard, Store, Truck, ShieldCheck, FileText, Quote, ClipboardList,
  PackageCheck, Receipt, CreditCard, Percent, Boxes, FolderTree, Brain,
  AlertTriangle, MessageSquare, LifeBuoy, BarChart3, ScrollText, UsersRound,
  Settings, Activity, UtensilsCrossed, Award, CheckSquare, Warehouse, Search,
  Wallet, Upload, ChefHat, BadgeCheck, Share2, Gift, SlidersHorizontal, Soup,
  // Megaphone, Bell, BookOpen, FolderOpen, Code2 — used by commented nav items
} from "lucide-react";

export type NavItem = {
  title: string;
  to: string;
  icon: typeof LayoutDashboard;
  group: string;
  badge?: string;
};

export const navItems: NavItem[] = [
  { group: "Overview", title: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { group: "Overview", title: "Activity Feed", to: "/activity", icon: Activity, badge: "live" },

  { group: "Marketplace", title: "Restaurants", to: "/restaurants", icon: Store },
  { group: "Marketplace", title: "Suppliers", to: "/suppliers", icon: Truck },
  { group: "Marketplace", title: "Restaurant Approvals", to: "/restaurant-approvals", icon: BadgeCheck },
  { group: "Marketplace", title: "Supplier Approvals", to: "/supplier-approvals", icon: BadgeCheck },
  { group: "Marketplace", title: "KYC Queue", to: "/kyc", icon: ShieldCheck },

  { group: "Trade", title: "RFQs", to: "/rfqs", icon: FileText },
  { group: "Trade", title: "Quotations", to: "/quotations", icon: Quote },
  { group: "Trade", title: "POs", to: "/purchase-orders", icon: ClipboardList },
  { group: "Trade", title: "Approvals", to: "/approvals", icon: CheckSquare },
  { group: "Trade", title: "Deliveries", to: "/deliveries", icon: PackageCheck },

  { group: "Finance", title: "Invoices", to: "/invoices", icon: Receipt },
  { group: "Finance", title: "Payments", to: "/payments", icon: CreditCard },
  // Admin-only commission ledger (hidden from app / invoices)
  { group: "Finance", title: "Commissions", to: "/commissions", icon: Percent },
  { group: "Finance", title: "Category Commissions", to: "/category-commissions", icon: Percent },
  { group: "Finance", title: "Wallets", to: "/wallets", icon: Wallet },
  { group: "Finance", title: "Referrals", to: "/referrals", icon: Share2 },
  { group: "Finance", title: "Rewards", to: "/rewards", icon: Gift },
  { group: "Finance", title: "Referral Settings", to: "/referral-settings", icon: SlidersHorizontal },

  { group: "Catalog", title: "Product Catalog", to: "/catalog", icon: Boxes },
  { group: "Catalog", title: "Categories", to: "/categories", icon: FolderTree },
  { group: "Catalog", title: "Cuisines", to: "/cuisines", icon: UtensilsCrossed },
  { group: "Catalog", title: "Qualities", to: "/qualities", icon: Award },
  { group: "Catalog", title: "Restaurant Inventory", to: "/inventory", icon: Warehouse },

  { group: "Cloud Kitchen", title: "CK Dishes", to: "/ck-dishes", icon: Soup },
  { group: "Cloud Kitchen", title: "CK Requests", to: "/ck-requests", icon: ChefHat },
  { group: "Cloud Kitchen", title: "CK Bulk Import", to: "/ck-import", icon: Upload },
  { group: "Cloud Kitchen", title: "CK Production", to: "/ck-production", icon: ChefHat },

  { group: "Intelligence", title: "AI Control Center", to: "/ai-center", icon: Brain },
  { group: "Intelligence", title: "Fraud Detection", to: "/fraud", icon: AlertTriangle },
  { group: "Intelligence", title: "Reports & BI", to: "/reports", icon: BarChart3 },

  { group: "Engagement", title: "Communications", to: "/communications", icon: MessageSquare },
  { group: "Engagement", title: "Support", to: "/support", icon: LifeBuoy },
  // { group: "Engagement", title: "Marketing", to: "/marketing", icon: Megaphone },
  // { group: "Engagement", title: "Notifications", to: "/notifications", icon: Bell },

  // { group: "Platform", title: "CMS", to: "/cms", icon: BookOpen },
  // { group: "Platform", title: "Subscriptions", to: "/subscriptions", icon: BadgeCheck },
  // { group: "Platform", title: "Files", to: "/files", icon: FolderOpen },
  // { group: "Platform", title: "API Management", to: "/api", icon: Code2 },

  { group: "System", title: "Code Lookup", to: "/lookup", icon: Search },
  { group: "System", title: "Audit Logs", to: "/audit-logs", icon: ScrollText },
  { group: "System", title: "Roles & Permissions", to: "/roles", icon: UsersRound },
  { group: "System", title: "Settings", to: "/settings", icon: Settings },
];

export const groupedNav = navItems.reduce<Record<string, NavItem[]>>((acc, item) => {
  (acc[item.group] ??= []).push(item);
  return acc;
}, {});
