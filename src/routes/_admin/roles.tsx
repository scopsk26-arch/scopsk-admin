import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DataPage, StatusBadge } from "@/components/admin/DataPage";
import { UsersRound } from "lucide-react";
import { fetchList } from "@/lib/api/resources";
import { num, str } from "@/lib/api/client";

export const Route = createFileRoute("/_admin/roles")({
  head: () => ({ meta: [{ title: "Roles & Permissions — Prime Plate" }] }),
  component: RolesPage,
});

function RolesPage() {
  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: async () => {
      const list = await fetchList("/admin/roles");
      return list.map((r: any) => ({
        id: str(r.id),
        name: str(r.name ?? r.displayName, "—"),
        scope: str(r.scope ?? r.description, "—"),
        users: num(r.usersCount ?? r.userCount),
        builtin: Boolean(r.isSystem ?? r.builtin ?? r.isBuiltin),
        status: str(r.status, "active"),
        permissions: Array.isArray(r.permissions) ? r.permissions.length : 0,
      }));
    },
  });

  const custom = rows.filter((r) => !r.builtin).length;
  const perms = rows.reduce((s, r) => s + r.permissions, 0);

  return (
    <DataPage
      title="Roles & Permissions"
      description="Built-in and custom roles (read-only list from /admin/roles)."
      disableCrud
      icon={<UsersRound className="h-5 w-5 text-primary" />}
      kpis={[
        { label: "Roles", value: String(rows.length) },
        { label: "Users", value: String(rows.reduce((s, r) => s + r.users, 0)) },
        { label: "Custom roles", value: String(custom), tone: "info" },
        { label: "Permissions", value: String(perms) },
      ]}
      rows={rows}
      searchKeys={["id", "name", "scope"]}
      emptyHint={isLoading ? "Loading…" : isError ? "Failed to load roles." : "No roles found."}
      columns={[
        { key: "id", label: "ID", className: "font-mono text-xs", render: (r) => String(r.id).slice(0, 8) },
        { key: "name", label: "Role", render: (r) => <span className="font-medium">{r.name}</span> },
        { key: "scope", label: "Scope", className: "text-muted-foreground" },
        { key: "users", label: "Users" },
        { key: "builtin", label: "Type", render: (r) => (
          <span className="text-xs text-muted-foreground">{r.builtin ? "Built-in" : "Custom"}</span>
        ) },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  );
}
