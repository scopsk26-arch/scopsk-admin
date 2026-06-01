import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/admin/StubPage";
import { CreditCard } from "lucide-react";

export const Route = createFileRoute("/_admin/payments")({
  head: () => ({ meta: [{ title: "Payments — Prime Plate" }] }),
  component: () => (
    <StubPage
      title="Payments"
      description="Marketplace commission, supplier and restaurant payments with escrow and reconciliation."
      icon={<CreditCard className="h-5 w-5 text-primary" />}
      features={["Escrow tracking", "Settlement & refunds", "Reconciliation", "Revenue & commission reports", ]}
    />
  ),
});
