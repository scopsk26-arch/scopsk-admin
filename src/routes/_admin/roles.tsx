import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/admin/StubPage";
import { UsersRound } from "lucide-react";

export const Route = createFileRoute("/_admin/roles")({
  head: () => ({ meta: [{ title: "Roles & Permissions — Prime Plate" }] }),
  component: () => (
    <StubPage
      title="Roles & Permissions"
      description="Granular permission matrix with built-in roles and custom role creation."
      icon={<UsersRound className="h-5 w-5 text-primary" />}
      features={["Built-in roles", "Custom roles", "Permission matrix", ]}
    />
  ),
});
