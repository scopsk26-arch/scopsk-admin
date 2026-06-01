import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/admin/StubPage";
import { PackageCheck } from "lucide-react";

export const Route = createFileRoute("/_admin/deliveries")({
  head: () => ({ meta: [{ title: "Deliveries — Prime Plate" }] }),
  component: () => (
    <StubPage
      title="Deliveries"
      description="Monitor processing, ready, dispatched, delivered and delayed shipments with live map view."
      icon={<PackageCheck className="h-5 w-5 text-primary" />}
      features={["Map view & live tracking", "Driver assignments", "Proof of delivery", "Delivery analytics", ]}
    />
  ),
});
