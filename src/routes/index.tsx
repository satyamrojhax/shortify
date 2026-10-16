import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

import { BubbleLoader } from "@/components/ui/bubble-loader";

export const Route = createFileRoute("/")({
  component: IndexRedirect,
});

function IndexRedirect() {
  const navigate = useNavigate();
  const { ready, ageOk, username, pinOk } = useAuth();

  useEffect(() => {
    if (!ready) return;
    if (!ageOk) navigate({ to: "/age", replace: true });
    else if (!username) navigate({ to: "/login", replace: true });
    else if (!pinOk) navigate({ to: "/pin", replace: true });
    else navigate({ to: "/home", replace: true });
  }, [ready, ageOk, username, pinOk, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <BubbleLoader />
    </div>
  );
}
