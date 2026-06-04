import { createFileRoute } from "@tanstack/react-router";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { roles } from "@/lib/mock-data-extra";
import { UsersRound } from "lucide-react";

export const Route = createFileRoute("/_admin/roles")({
  head: () => ({ meta: [{ title: "Roles & Permissions — Prime Plate" }] }),
  component: () => (
    <DataPage
      title="Roles & Permissions"
      description="Built-in and custom roles with granular permission scopes."
      icon={<UsersRound className="h-5 w-5 text-primary" />}
      kpis={[
        { label: "Roles", value: "7" },
        { label: "Users", value: "47" },
        { label: "Custom roles", value: "2", tone: "info" },
        { label: "Permissions", value: "184" },
      ]}
      rows={roles}
      searchKeys={["id", "name", "scope"]}
      columns={[
        { key: "id", label: "ID", className: "font-mono text-xs" },
        { key: "name", label: "Role", render: (r) => <span className="font-medium">{r.name}</span> },
        { key: "scope", label: "Scope", className: "text-muted-foreground" },
        { key: "users", label: "Users" },
        { key: "builtin", label: "Type", render: (r) => (
          <span className="text-xs text-muted-foreground">{r.builtin ? "Built-in" : "Custom"}</span>
        ) },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  ),
});
