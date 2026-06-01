import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/admin/StubPage";
import { Store } from "lucide-react";

export const Route = createFileRoute("/_admin/restaurants")({
  head: () => ({ meta: [{ title: "Restaurants — Prime Plate" }] }),
  component: () => (
    <StubPage
      title="Restaurants"
      description="Master directory of all restaurant accounts with advanced filtering, bulk actions and detail drill-down."
      icon={<Store className="h-5 w-5 text-primary" />}
      features={["Advanced data table", "Status / region / spend filters", "Bulk approve / suspend / export", "Detail tabs: Overview, Branches, Team, RFQs, Orders, Invoices, AI insights", ]}
    />
  ),
});
