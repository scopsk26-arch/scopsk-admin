import {
  LayoutDashboard, Store, Truck, FileText, ClipboardList,
  PackageCheck, Receipt, CreditCard, Percent, Boxes, FolderTree, PackagePlus,
  Landmark, LifeBuoy, Scale, ScrollText, Settings, UtensilsCrossed,
  Warehouse, Search, Share2, Images, Wallet, Flag, BadgeCheck,
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

  { group: "Orders", title: "Quote requests", to: "/rfqs", icon: FileText },
  { group: "Orders", title: "Orders", to: "/purchase-orders", icon: ClipboardList },
  { group: "Orders", title: "Deliveries", to: "/deliveries", icon: PackageCheck },

  { group: "Finance", title: "Invoices", to: "/invoices", icon: Receipt },
  { group: "Finance", title: "Unpaid invoices", to: "/outstanding", icon: Landmark },
  { group: "Finance", title: "Payments", to: "/payments", icon: CreditCard },
  { group: "Finance", title: "Commissions", to: "/commissions", icon: Percent },
  { group: "Finance", title: "Wallets", to: "/wallets", icon: Wallet },
  { group: "Finance", title: "Subscriptions", to: "/subscriptions", icon: BadgeCheck },
  { group: "Finance", title: "Referrals", to: "/referrals", icon: Share2 },

  { group: "Catalog", title: "Products", to: "/catalog", icon: Boxes },
  { group: "Catalog", title: "Product requests", to: "/product-requests", icon: PackagePlus },
  { group: "Catalog", title: "Categories", to: "/categories", icon: FolderTree },
  { group: "Catalog", title: "Cuisines", to: "/cuisines", icon: UtensilsCrossed },
  { group: "Catalog", title: "Stock", to: "/inventory", icon: Warehouse },

  { group: "Help", title: "Support", to: "/support", icon: LifeBuoy },
  { group: "Help", title: "Reports", to: "/org-reports", icon: Flag },
  { group: "Help", title: "Disputes", to: "/disputes", icon: Scale },

  { group: "Admin", title: "Find a record", to: "/lookup", icon: Search },
  { group: "Admin", title: "Activity log", to: "/audit-logs", icon: ScrollText },
  { group: "Admin", title: "Settings", to: "/settings", icon: Settings },
  { group: "Admin", title: "Files", to: "/media", icon: Images },
];

export const groupedNav = navItems.reduce<Record<string, NavItem[]>>((acc, item) => {
  (acc[item.group] ??= []).push(item);
  return acc;
}, {});
