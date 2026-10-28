import { createFileRoute, redirect } from "@tanstack/react-router";

/** Restaurant and supplier apps no longer use a quotations step. */
export const Route = createFileRoute("/_admin/quotations")({
  beforeLoad: () => {
    throw redirect({ to: "/rfqs" });
  },
  component: () => null,
});
