import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { pagedListProps, usePagedList } from "@/hooks/usePagedList";
import { DataPage, StatusBadge, AED } from "@/components/admin/DataPage";
import { GenericJsonDetailView } from "@/components/admin/DetailViews";
import { BadgeCheck } from "lucide-react";
import { fetchSubscriptionDetail } from "@/lib/api/resources";
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
    plan: str(r.plan?.name ?? r.planName ?? r.planCode ?? r.plan, "—"),
    planCode: str(r.planCode ?? r.plan?.code ?? "basic"),
    mrr: num(r.mrr ?? r.amount ?? r.price),
    renews: r.renewsAt
      ? String(r.renewsAt).slice(0, 10)
      : r.currentPeriodEnd
        ? String(r.currentPeriodEnd).slice(0, 10)
        : "—",
    status: str(r.status, "active"),
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
        { key: "planCode", label: "Plan code", required: true, type: "text", placeholder: "basic" },
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
        { key: "id", label: "Subscription" },
        { key: "customer", label: "Customer" },
        { key: "plan", label: "Plan" },
        { key: "planCode", label: "Plan code" },
        { key: "mrr", label: "MRR" },
        { key: "renews", label: "Renews" },
        { key: "status", label: "Status" },
      ]}
      loadDetail={async (row) => {
        try {
          return await fetchSubscriptionDetail(row.id);
        } catch {
          return row;
        }
      }}
      renderView={(detail) => <GenericJsonDetailView detail={detail} />}
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
      searchKeys={["id", "customer", "plan"]}
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
          label: "Customer",
          render: (r) => <span className="font-medium">{r.customer}</span>,
        },
        { key: "plan", label: "Plan" },
        { key: "mrr", label: "MRR", render: (r) => AED(r.mrr) },
        { key: "renews", label: "Renews" },
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
