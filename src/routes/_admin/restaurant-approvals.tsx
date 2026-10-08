import { createFileRoute } from "@tanstack/react-router";
import { Store } from "lucide-react";
import { OrgApprovalsPage } from "@/components/admin/OrgApprovalsPage";

export const Route = createFileRoute("/_admin/restaurant-approvals")({
  head: () => ({ meta: [{ title: "Restaurant Approvals — ScopsK" }] }),
  component: RestaurantApprovalsRoute,
});

function RestaurantApprovalsRoute() {
  return (
    <OrgApprovalsPage
      type="restaurant"
      title="Restaurant Approvals"
      description="Pending restaurant onboarding queue — approve, reject, activate or deactivate with a reason."
      icon={Store}
    />
  );
}
