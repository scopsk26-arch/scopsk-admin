import { createFileRoute } from "@tanstack/react-router";
import { Truck } from "lucide-react";
import { OrgApprovalsPage } from "@/components/admin/OrgApprovalsPage";

export const Route = createFileRoute("/_admin/supplier-approvals")({
  head: () => ({ meta: [{ title: "Supplier Approvals — ScopsK" }] }),
  component: SupplierApprovalsRoute,
});

function SupplierApprovalsRoute() {
  return (
    <OrgApprovalsPage
      type="supplier"
      title="Supplier Approvals"
      description="Pending supplier onboarding queue — approve, reject, activate or deactivate with a reason."
      icon={Truck}
    />
  );
}
