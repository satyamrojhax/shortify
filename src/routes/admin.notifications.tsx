import { createFileRoute } from "@tanstack/react-router";
import { AdminNotificationsPage } from "@/components/admin/admin-notifications";

export const Route = createFileRoute("/admin/notifications")({
  component: AdminNotificationsPage,
});
