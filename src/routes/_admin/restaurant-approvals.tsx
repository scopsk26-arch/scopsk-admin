import { createFileRoute } from "@tanstack/react-router";
import { Store } from "lucide-react";
import { OrgApprovalsPage } from "@/components/admin/OrgApprovalsPage";

export const Route = createFileRoute("/_admin/restaurant-approvals")({
  head: () => ({ meta: [{ title: "Account review — ScopsK" }] }),
  component: RestaurantApprovalsRoute,
});

function RestaurantApprovalsRoute() {
  return (
    <OrgApprovalsPage
      type="both"
      title="Account review"
      description="Check KYC, then the account. If they asked for credit, check that request too."
      icon={Store}
    />
  );
}
