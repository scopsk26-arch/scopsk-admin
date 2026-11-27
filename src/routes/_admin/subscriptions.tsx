import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { pagedListProps, usePagedList } from "@/hooks/usePagedList";
import { DataPage, StatusBadge, AED } from "@/components/admin/DataPage";
import { BadgeCheck } from "lucide-react";
import { api, num, str } from "@/lib/api/client";
import { useAdminLookups } from "@/hooks/useAdminLookups";

export const Route = createFileRoute("/_admin/subscriptions")({
  head: () => ({ meta: [{ title: "Subscriptions — ScopsK" }] }),
  component: SubscriptionsPage,
});

function mapSub(r: any) {
  return {
    id: str(r.id),
    customer: str(r.organization?.name ?? r.customerName ?? r.organizationId, "—"),
    organizationId: str(r.organizationId ?? r.organization?.id, ""),
    plan: str(r.planName ?? r.plan?.name ?? r.planCode ?? r.plan, "—"),
    planCode: str(r.planCode ?? r.plan?.code ?? ""),
    owner: str(r.ownerEmail ?? r.ownerName, "—"),
    type: str(r.organization?.type, "—").replace(/_/g, " "),
    mrr: num(r.mrr ?? r.amount ?? r.price),
    renews: r.renewsAt
      ? String(r.renewsAt).slice(0, 10)
      : r.currentPeriodEnd
        ? String(r.currentPeriodEnd).slice(0, 10)
        : "—",
    daysLeft: r.daysLeft == null ? "—" : String(r.daysLeft),
    status: str(r.status, "expired"),
  };
}

function SubscriptionsPage() {
  const queryClient = useQueryClient();
  const { restaurants, suppliers } = useAdminLookups(["restaurants", "suppliers"]);
  const orgs = [...restaurants, ...suppliers];

  const list = usePagedList({
    queryKey: ["subscriptions"],
    path: "/subscriptions",
    map: mapSub,
  });
  const rows = list.rows;
  const isLoading = list.isLoading;
  const isError = list.isError;

  const active = rows.filter((r) => r.status === "active").length;
  const mrr = rows.filter((r) => r.status === "active").reduce((s, r) => s + r.mrr, 0);

  return (
    <DataPage
      title="Subscriptions"
      description="Plans and billing for restaurants and suppliers."
      icon={<BadgeCheck className="h-5 w-5 text-primary" />}
      formFields={[
        {
          key: "organizationId",
          label: "Organization",
          required: true,
          type: "searchable",
          selectOptions: orgs.map((o) => ({ value: o.value, label: o.label })),
        },
        {
          key: "planCode",
          label: "Plan",
          required: true,
          type: "select",
          options: [
            "restaurant_basic",
            "restaurant_growth",
            "restaurant_pro",
            "supplier_basic",
            "supplier_trade",
            "supplier_partner",
          ],
        },
        { key: "mrr", label: "MRR", required: true, type: "number" },
        {
          key: "status",
          label: "Status",
          required: true,
          type: "select",
          options: ["trialing", "active", "past_due", "cancelled", "expired"],
        },
      ]}
      viewFields={[
        { key: "customer", label: "Business" },
        { key: "type", label: "Type" },
        { key: "owner", label: "Account" },
        { key: "plan", label: "Plan" },
        { key: "mrr", label: "Monthly amount" },
        { key: "renews", label: "Renews" },
        { key: "daysLeft", label: "Days left" },
        { key: "status", label: "Status" },
      ]}
      kpis={[
        { label: "Active subs", value: String(active), tone: "success" },
        { label: "MRR", value: AED(mrr), tone: "info" },
        {
          label: "Trials",
          value: String(
            rows.filter((r) => /trial/i.test(r.plan) || r.status === "trialing").length,
          ),
        },
        { label: "Total", value: String(rows.length), tone: "warning" },
      ]}
      rows={rows}
      serverPagination={pagedListProps(list)}
      searchKeys={["id", "customer", "owner", "plan", "type"]}
      emptyHint={
        isLoading
          ? "Loading…"
          : isError
            ? "Failed to load subscriptions."
            : "No subscriptions found."
      }
      columns={[
        {
          key: "id",
          label: "Sub",
          className: "font-mono text-xs",
          render: (r) => String(r.id).slice(0, 8),
        },
        {
          key: "customer",
          label: "Business",
          render: (r) => <span className="font-medium">{r.customer}</span>,
        },
        { key: "type", label: "Type" },
        { key: "owner", label: "Account" },
        { key: "plan", label: "Plan" },
        { key: "mrr", label: "Monthly", render: (r) => AED(r.mrr) },
        { key: "renews", label: "Renews" },
        { key: "daysLeft", label: "Days left" },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
      onCreate={async (data) => {
        if (!data.organizationId || !data.planCode)
          throw new Error("Organization and plan code required");
        const created = await api.post("/subscriptions", {
          organizationId: data.organizationId,
          planCode: data.planCode,
          status: data.status || "active",
          mrr: Number(data.mrr) || 0,
        }, { toastOnSuccess: true });
        await queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
        return mapSub(created);
      }}
      onUpdate={async (id, data) => {
        const updated = await api.patch(`/subscriptions/${id}`, {
          planCode: data.planCode || data.plan,
          status: data.status,
          mrr: data.mrr != null ? Number(data.mrr) : undefined,
        });
        await queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
        return mapSub(updated);
      }}
      onDelete={async (id) => {
        await api.delete(`/subscriptions/${id}`);
        await queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      }}
    />
  );
}
