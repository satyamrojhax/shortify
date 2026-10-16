import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/suggestions")({
  component: () => <Navigate to="/feedback" replace />,
});
