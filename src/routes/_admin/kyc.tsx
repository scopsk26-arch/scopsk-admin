import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/admin/StubPage";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_admin/kyc")({
  head: () => ({ meta: [{ title: "KYC Verification Queue — Prime Plate" }] }),
  component: () => (
    <StubPage
      title="KYC Verification Queue"
      description="Review trade licenses, VAT certificates, commercial registrations and bank accounts with AI fraud signals."
      icon={<ShieldCheck className="h-5 w-5 text-primary" />}
      features={["Document preview", "AI risk score", "Approve / reject / request more", "Fraud detection indicators", ]}
    />
  ),
});
