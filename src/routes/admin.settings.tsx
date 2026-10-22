import { createFileRoute } from "@tanstack/react-router";
import { AdminSettings } from "@/components/admin/admin-settings";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettings,
});
