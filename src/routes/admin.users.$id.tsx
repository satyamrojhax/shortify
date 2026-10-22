import { createFileRoute } from "@tanstack/react-router";
import { AdminUserEdit } from "@/components/admin/admin-user-edit";

export const Route = createFileRoute("/admin/users/$id")({
  component: AdminUserEdit,
});
