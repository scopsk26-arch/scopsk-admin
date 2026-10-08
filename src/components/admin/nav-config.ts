import {
  LayoutDashboard, Store, Truck, FileText, Quote, ClipboardList,
  PackageCheck, Receipt, CreditCard, Percent, Boxes, FolderTree,
  Landmark, LifeBuoy, ScrollText, UsersRound, Settings, UtensilsCrossed,
  Warehouse, Search, Share2, Megaphone, Images, Wallet,
} from "lucide-react";

export type NavItem = {
  title: string;
  to: string;
  icon: typeof LayoutDashboard;
  group: string;
  badge?: string;
};

/**
 * Target admin sidebar — 7 groups, flat items (~28).
 * Layout: left sidebar (~256px / mobile sheet) + sticky topbar + DataPage lists.
 */
export const navItems: NavItem[] = [
  { group: "Overview", title: "Dashboard", to: "/dashboard", icon: LayoutDashboard },

  { group: "Marketplace", title: "Restaurants", to: "/restaurants", icon: Store },
  { group: "Marketplace", title: "Suppliers", to: "/suppliers", icon: Truck },

  { group: "Trade", title: "RFQs", to: "/rfqs", icon: FileText },
  { group: "Trade", title: "Quotations", to: "/quotations", icon: Quote },
  { group: "Trade", title: "POs", to: "/purchase-orders", icon: ClipboardList },
  { group: "Trade", title: "Deliveries", to: "/deliveries", icon: PackageCheck },

  { group: "Finance", title: "Invoices", to: "/invoices", icon: Receipt },
  { group: "Finance", title: "Outstanding", to: "/outstanding", icon: Landmark },
  { group: "Finance", title: "Payments", to: "/payments", icon: CreditCard },
  { group: "Finance", title: "Commissions", to: "/commissions", icon: Percent },
  { group: "Finance", title: "Wallets", to: "/wallets", icon: Wallet },
  { group: "Finance", title: "Referrals", to: "/referrals", icon: Share2 },

  { group: "Catalog", title: "Product Catalog", to: "/catalog", icon: Boxes },
  { group: "Catalog", title: "Categories", to: "/categories", icon: FolderTree },
  { group: "Catalog", title: "Cuisines", to: "/cuisines", icon: UtensilsCrossed },
  { group: "Catalog", title: "Restaurant Inventory", to: "/inventory", icon: Warehouse },

  // Cloud Kitchen — temporarily hidden from sidebar
  // { group: "Cloud Kitchen", title: "CK Dishes", to: "/ck-dishes", icon: Soup },
  // { group: "Cloud Kitchen", title: "CK Orders", to: "/ck-orders", icon: ChefHat },
  // { group: "Cloud Kitchen", title: "CK Bulk Import", to: "/ck-import", icon: Upload },
  // { group: "Cloud Kitchen", title: "CK Production", to: "/ck-production", icon: ChefHat },

  { group: "Engagement", title: "Support", to: "/support", icon: LifeBuoy },
  { group: "Engagement", title: "Banners", to: "/banners", icon: Megaphone },

  { group: "System", title: "Code Lookup", to: "/lookup", icon: Search },
  { group: "System", title: "Audit Logs", to: "/audit-logs", icon: ScrollText },
  { group: "System", title: "Roles & Permissions", to: "/roles", icon: UsersRound },
  { group: "System", title: "Settings", to: "/settings", icon: Settings },
  { group: "System", title: "Media Library", to: "/media", icon: Images },
];

export const groupedNav = navItems.reduce<Record<string, NavItem[]>>((acc, item) => {
  (acc[item.group] ??= []).push(item);
  return acc;
}, {});
