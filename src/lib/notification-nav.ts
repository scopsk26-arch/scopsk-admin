export type AdminListPath =
  | "/rfqs"
  | "/purchase-orders"
  | "/deliveries"
  | "/invoices"
  | "/outstanding"
  | "/payments"
  | "/wallets"
  | "/rewards"
  | "/referrals"
  | "/catalog"
  | "/inventory"
  | "/support"
  | "/disputes"
  | "/product-requests"
  | "/kyc"
  | "/org-reports"
  | "/approvals"
  | "/ck-orders"
  | "/restaurants"
  | "/suppliers";

export type NotificationNavTarget = {
  to: AdminListPath;
  search?: { open: string };
};

export function notificationPayload(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  return typeof raw === "object" ? (raw as Record<string, unknown>) : {};
}

function payloadId(data: Record<string, unknown>, key: string) {
  const value = data[key];
  return value != null && String(value).trim() ? String(value) : "";
}

export function notificationNavTarget(input: {
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
}): NotificationNavTarget | null {
  const data = input.data ?? {};
  const type = String(data.type || "").toLowerCase();
  const kind = String(data.kind || "").toLowerCase();
  const orgType = String(data.organizationType || data.orgType || "").toLowerCase();
  const orgId = payloadId(data, "organizationId");
  const text = `${type} ${input.title || ""} ${input.body || ""}`.toLowerCase();

  if (type === "org_registration" || type.includes("registration")) {
    const path: AdminListPath = orgType === "supplier" || text.includes("supplier") ? "/suppliers" : "/restaurants";
    return orgId ? { to: path, search: { open: orgId } } : { to: path };
  }

  if (type.includes("pending_approval")) return { to: "/approvals" };
  if (payloadId(data, "deliveryId")) return { to: "/deliveries" };
  if (payloadId(data, "invoiceId")) {
    return {
      to: kind === "overdue" || type.includes("outstanding") ? "/outstanding" : "/invoices",
    };
  }
  if (payloadId(data, "paymentId")) return { to: "/payments" };
  if (payloadId(data, "ckOrderId")) return { to: "/ck-orders" };
  if (payloadId(data, "purchaseOrderId")) return { to: "/purchase-orders" };
  if (payloadId(data, "quotationId") || payloadId(data, "rfqId")) return { to: "/rfqs" };
  if (payloadId(data, "reportId")) return { to: "/org-reports" };
  if (payloadId(data, "kycApplicationId") || payloadId(data, "documentId")) return { to: "/kyc" };
  if (payloadId(data, "inventoryItemId")) return { to: "/inventory" };
  if (payloadId(data, "rewardId")) return { to: "/rewards" };
  if (payloadId(data, "productRequestId")) return { to: "/product-requests" };
  if (payloadId(data, "disputeId")) return { to: "/disputes" };
  if (payloadId(data, "ticketId") || payloadId(data, "supportTicketId")) return { to: "/support" };
  if (payloadId(data, "walletId") || payloadId(data, "withdrawalId")) return { to: "/wallets" };
  if (payloadId(data, "referralId")) return { to: "/referrals" };

  if (orgId && (orgType === "supplier" || text.includes("supplier"))) {
    return { to: "/suppliers", search: { open: orgId } };
  }
  if (orgId && (orgType === "restaurant" || text.includes("restaurant"))) {
    return { to: "/restaurants", search: { open: orgId } };
  }

  if (/invoice|outstanding|overdue/.test(text)) {
    return { to: text.includes("outstanding") || text.includes("overdue") ? "/outstanding" : "/invoices" };
  }
  if (/payment/.test(text)) return { to: "/payments" };
  if (/deliver/.test(text)) return { to: "/deliveries" };
  if (/purchase order|\bpo\b|po_/.test(text)) return { to: "/purchase-orders" };
  if (/quot|rfq|purchase request/.test(text)) return { to: "/rfqs" };
  if (/cloud kitchen order|ck_order/.test(text)) return { to: "/ck-orders" };
  if (/inventory|low stock|out of stock/.test(text)) return { to: "/inventory" };
  if (/kyc|trade license/.test(text)) return { to: "/kyc" };
  if (/report/.test(text)) return { to: "/org-reports" };
  if (/product request/.test(text)) return { to: "/product-requests" };
  if (/catalog/.test(text)) return { to: "/catalog" };
  if (/dispute/.test(text)) return { to: "/disputes" };
  if (/support|ticket/.test(text)) return { to: "/support" };
  if (/wallet|withdraw/.test(text)) return { to: "/wallets" };
  if (/reward/.test(text)) return { to: "/rewards" };
  if (/referral/.test(text)) return { to: "/referrals" };
  if (/approval/.test(text)) return { to: "/approvals" };
  if (/supplier/.test(text)) return { to: "/suppliers" };
  if (/restaurant/.test(text)) return { to: "/restaurants" };
  return null;
}
