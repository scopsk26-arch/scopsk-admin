import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { pagedListProps, usePagedList } from "@/hooks/usePagedList";
import { DataPage, StatusBadge, formatStatusLabel } from "@/components/admin/DataPage";
import { GenericJsonDetailView } from "@/components/admin/DetailViews";
import { Bell, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchNotificationDetail,
  markAllNotificationsRead,
} from "@/lib/api/resources";
import { api, str } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type AdminListPath =
  | "/rfqs"
  | "/quotations"
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
  | "/kyc"
  | "/org-reports"
  | "/approvals"
  | "/ck-orders"
  | "/restaurants"
  | "/suppliers";

type NotificationRow = {
  id: string;
  category: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  status: string;
  data: Record<string, unknown>;
};

function notificationPayload(raw: unknown): Record<string, unknown> {
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

/** List page that owns this notification. */
function notificationListPath(row: NotificationRow): AdminListPath | null {
  const data = row.data;
  const type = String(data.type || "").toLowerCase();
  const kind = String(data.kind || "").toLowerCase();
  const text = `${type} ${row.title} ${row.body}`.toLowerCase();

  if (type.includes("pending_approval")) return "/approvals";
  if (payloadId(data, "deliveryId")) return "/deliveries";
  if (payloadId(data, "invoiceId")) {
    return kind === "overdue" || type.includes("outstanding") ? "/outstanding" : "/invoices";
  }
  if (payloadId(data, "paymentId")) return "/payments";
  if (payloadId(data, "ckOrderId")) return "/ck-orders";
  if (payloadId(data, "purchaseOrderId")) return "/purchase-orders";
  if (payloadId(data, "quotationId")) return "/quotations";
  if (payloadId(data, "rfqId")) return "/rfqs";
  if (payloadId(data, "reportId")) return "/org-reports";
  if (payloadId(data, "kycApplicationId") || payloadId(data, "documentId")) return "/kyc";
  if (payloadId(data, "inventoryItemId")) return "/inventory";
  if (payloadId(data, "rewardId")) return "/rewards";
  if (payloadId(data, "productRequestId")) return "/catalog";
  if (payloadId(data, "ticketId") || payloadId(data, "supportTicketId")) return "/support";
  if (payloadId(data, "walletId") || payloadId(data, "withdrawalId")) return "/wallets";
  if (payloadId(data, "referralId")) return "/referrals";

  if (/invoice|outstanding|overdue/.test(text)) return text.includes("outstanding") || text.includes("overdue") ? "/outstanding" : "/invoices";
  if (/payment/.test(text)) return "/payments";
  if (/deliver/.test(text)) return "/deliveries";
  if (/purchase order|\bpo\b|po_/.test(text)) return "/purchase-orders";
  if (/quot/.test(text)) return "/quotations";
  if (/rfq|purchase request/.test(text)) return "/rfqs";
  if (/cloud kitchen order|ck_order/.test(text)) return "/ck-orders";
  if (/inventory|low stock|out of stock/.test(text)) return "/inventory";
  if (/kyc|trade license/.test(text)) return "/kyc";
  if (/report/.test(text)) return "/org-reports";
  if (/product request|catalog/.test(text)) return "/catalog";
  if (/support|ticket/.test(text)) return "/support";
  if (/wallet|withdraw/.test(text)) return "/wallets";
  if (/reward/.test(text)) return "/rewards";
  if (/referral/.test(text)) return "/referrals";
  if (/approval/.test(text)) return "/approvals";
  if (/supplier/.test(text)) return "/suppliers";
  if (/restaurant/.test(text)) return "/restaurants";
  return null;
}

export const Route = createFileRoute("/_admin/notifications")({
  head: () => ({ meta: [{ title: "Notifications — ScopsK" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const list = usePagedList<NotificationRow>({
    queryKey: ["notifications"],
    path: "/notifications",
    map: (r: any) => {
      const data = notificationPayload(r.data);
      const kind = str(data.type ?? r.category ?? r.type, "system");
      const read = Boolean(r.readAt ?? r.read ?? r.isRead) || r.status === "read";
      return {
        id: str(r.id),
        category: formatStatusLabel(kind),
        title: str(r.title, "—"),
        body: str(r.body ?? r.message, "—"),
        time: r.createdAt ? String(r.createdAt).replace("T", " ").slice(0, 16) : "—",
        read,
        status: read ? "read" : "unread",
        data,
      };
    },
  });
  const rows = list.rows;
  const isLoading = list.isLoading;
  const isError = list.isError;

  const unread = rows.filter((r) => !r.read).length;

  return (
    <DataPage
      title="Notifications"
      description="System and operational notifications. Open one to go to its list."
      icon={<Bell className="h-5 w-5 text-primary" />}
      entityName="Notification"
      viewFields={[
        { key: "category", label: "Category" },
        { key: "title", label: "Title" },
        { key: "body", label: "Detail" },
        { key: "time", label: "Time" },
        { key: "status", label: "Status" },
      ]}
      loadDetail={async (row) => {
        try {
          return await fetchNotificationDetail(row.id);
        } catch {
          return row;
        }
      }}
      renderView={(detail) => <GenericJsonDetailView detail={detail} />}
      filters={
        <Button
          variant="outline"
          size="sm"
          disabled={!unread}
          onClick={async () => {
            try {
              await markAllNotificationsRead();
              await queryClient.invalidateQueries({ queryKey: ["notifications"] });
              toast.success("All notifications marked read");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Failed to mark all read");
            }
          }}
        >
          <CheckCheck className="h-4 w-4 mr-1.5" />
          Mark all read
        </Button>
      }
      kpis={[
        { label: "Unread", value: String(unread), tone: "warning" },
        { label: "Total", value: String(rows.length) },
        {
          label: "Approval queue",
          value: String(rows.filter((r) => /approv/i.test(r.category)).length),
          tone: "info",
        },
        {
          label: "Critical",
          value: String(rows.filter((r) => /fraud|critical/i.test(r.category)).length),
          tone: "destructive",
        },
      ]}
      rows={rows}
      serverPagination={pagedListProps(list)}
      searchKeys={["id", "title", "body", "category"]}
      emptyHint={
        isLoading ? "Loading…" : isError ? "Failed to load notifications." : "No notifications."
      }
      columns={[
        { key: "category", label: "Category" },
        {
          key: "title",
          label: "Title",
          render: (r) => (
            <span className={cn(r.read ? "text-muted-foreground" : "font-medium")}>{r.title}</span>
          ),
        },
        { key: "body", label: "Detail", className: "text-muted-foreground" },
        { key: "time", label: "Time" },
        {
          key: "read",
          label: "Status",
          render: (r) => <StatusBadge status={r.read ? "read" : "unread"} />,
        },
      ]}
      onRowClick={(row) => {
        if (!row.read) {
          void api
            .post(`/notifications/${row.id}/read`)
            .finally(() => queryClient.invalidateQueries({ queryKey: ["notifications"] }));
        }
        const path = notificationListPath(row);
        if (!path) return false;
        void navigate({ to: path });
      }}
    />
  );
}
