import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { Sidebar, BottomNav, Footer, MobileHeader } from "@/components/nav";
import { InstallPwa } from "@/components/install-pwa";
import { StreakModal } from "@/components/streak-modal";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  useTheme();
  const navigate = useNavigate();
  const { ready, ageOk, username, pinOk, isMaintenance } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isReels =
    pathname === "/reels" || pathname === "/category" || pathname.startsWith("/creator");

  useEffect(() => {
    if (!ready) return;
    if (!ageOk) navigate({ to: "/age" });
    else if (!username) navigate({ to: "/login" });
    else if (!pinOk && pathname !== "/pin" && pathname !== "/pin-setup") navigate({ to: "/pin" });
  }, [ready, ageOk, username, pinOk, navigate, pathname]);

  if (!ready || !ageOk || !username || !pinOk) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      </div>
    );
  }

  return (
    <div className={`flex min-h-screen w-full bg-background`}>
      <Sidebar username={username} />
      <div className="flex-1 min-w-0 flex flex-col relative h-screen overflow-y-auto bg-background">
        {!isReels && <MobileHeader username={username} />}
        <main className={`flex-1 relative bg-background ${isReels ? "" : "pt-14 pb-20 md:pb-0"}`}>
          <Outlet />
        </main>
        {!isReels && <BottomNav />}
      </div>
      <InstallPwa />
      <StreakModal />
    </div>
  );
}
