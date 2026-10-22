import { createFileRoute } from "@tanstack/react-router";
import { AdminConfigPage } from "@/components/admin/admin-config";

export const Route = createFileRoute("/admin/config")({
  component: AdminConfigPage,
});
