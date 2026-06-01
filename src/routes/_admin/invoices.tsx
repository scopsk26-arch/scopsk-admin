import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/admin/StubPage";
import { Receipt } from "lucide-react";

export const Route = createFileRoute("/_admin/invoices")({
  head: () => ({ meta: [{ title: "Invoices — Prime Plate" }] }),
  component: () => (
    <StubPage
      title="Invoices"
      description="Invoice review, approval workflow and payment tracking with tax reports."
      icon={<Receipt className="h-5 w-5 text-primary" />}
      features={["Approval workflow", "Tax reports", "Download / approve / reject", ]}
    />
  ),
});
