import {
  LayoutDashboard, Store, Truck, ShieldCheck, FileText, Quote, ClipboardList,
  PackageCheck, Receipt, CreditCard, Percent, Boxes, FolderTree, Brain,
  AlertTriangle, MessageSquare, LifeBuoy, BookOpen, BadgeCheck, Megaphone,
  BarChart3, ScrollText, UsersRound, Settings, Bell, FolderOpen, Code2,
  Activity, UtensilsCrossed, Award, CheckSquare, Warehouse,
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
  { group: "Marketplace", title: "KYC Queue", to: "/kyc", icon: ShieldCheck },

  { group: "Trade", title: "RFQs", to: "/rfqs", icon: FileText },
  { group: "Trade", title: "Quotations", to: "/quotations", icon: Quote },
  { group: "Trade", title: "Purchase Orders", to: "/purchase-orders", icon: ClipboardList },
  { group: "Trade", title: "Approvals", to: "/approvals", icon: CheckSquare },
  { group: "Trade", title: "Deliveries", to: "/deliveries", icon: PackageCheck },

  { group: "Finance", title: "Invoices", to: "/invoices", icon: Receipt },
  { group: "Finance", title: "Payments", to: "/payments", icon: CreditCard },
  { group: "Finance", title: "Commissions", to: "/commissions", icon: Percent },

  { group: "Catalog", title: "Product Catalog", to: "/catalog", icon: Boxes },
  { group: "Catalog", title: "Categories", to: "/categories", icon: FolderTree },
  { group: "Catalog", title: "Cuisines", to: "/cuisines", icon: UtensilsCrossed },
  { group: "Catalog", title: "Qualities", to: "/qualities", icon: Award },
  { group: "Catalog", title: "Restaurant Inventory", to: "/inventory", icon: Warehouse },

  { group: "Intelligence", title: "AI Control Center", to: "/ai-center", icon: Brain },
  { group: "Intelligence", title: "Fraud Detection", to: "/fraud", icon: AlertTriangle },
  { group: "Intelligence", title: "Reports & BI", to: "/reports", icon: BarChart3 },

  { group: "Engagement", title: "Communications", to: "/communications", icon: MessageSquare },
  { group: "Engagement", title: "Support", to: "/support", icon: LifeBuoy },
  { group: "Engagement", title: "Marketing", to: "/marketing", icon: Megaphone },
  { group: "Engagement", title: "Notifications", to: "/notifications", icon: Bell },

  { group: "Platform", title: "CMS", to: "/cms", icon: BookOpen },
  { group: "Platform", title: "Subscriptions", to: "/subscriptions", icon: BadgeCheck },
  { group: "Platform", title: "Files", to: "/files", icon: FolderOpen },
  { group: "Platform", title: "API Management", to: "/api", icon: Code2 },

  { group: "System", title: "Audit Logs", to: "/audit-logs", icon: ScrollText },
  { group: "System", title: "Roles & Permissions", to: "/roles", icon: UsersRound },
  { group: "System", title: "Settings", to: "/settings", icon: Settings },
];

export const groupedNav = navItems.reduce<Record<string, NavItem[]>>((acc, item) => {
  (acc[item.group] ??= []).push(item);
  return acc;
}, {});
