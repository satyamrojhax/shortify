import { createFileRoute } from "@tanstack/react-router";
import { AdminFeedbackPage } from "@/components/admin/admin-feedback";

export const Route = createFileRoute("/admin/feedback")({
  component: AdminFeedbackPage,
});
