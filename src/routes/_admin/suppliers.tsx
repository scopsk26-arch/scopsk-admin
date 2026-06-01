import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/admin/StubPage";
import { Truck } from "lucide-react";

export const Route = createFileRoute("/_admin/suppliers")({
  head: () => ({ meta: [{ title: "Suppliers — Prime Plate" }] }),
  component: () => (
    <StubPage
      title="Suppliers"
      description="Master supplier database with KYC, performance scoring and revenue analytics."
      icon={<Truck className="h-5 w-5 text-primary" />}
      features={["Win-rate & rating columns", "Approve / suspend / verify", "Detail tabs: Overview, Quotations, Orders, Revenue, KYC, AI Performance", ]}
    />
  ),
});
