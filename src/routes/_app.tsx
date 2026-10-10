import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { Sidebar, BottomNav, Footer, MobileHeader } from "@/components/nav";
import { InstallPwa } from "@/components/install-pwa";
import { StreakModal } from "@/components/streak-modal";
import { BubbleLoader } from "@/components/ui/bubble-loader";
import { useOnline } from "@/hooks/use-offline";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { WifiOff, Download } from "lucide-react";

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

  const online = useOnline();
  const [wasOffline, setWasOffline] = useState(!online);

  useEffect(() => {
    if (online && wasOffline) {
      toast.success("You're now online! You can explore the entire web now.");
      setWasOffline(false);
    } else if (!online) {
      setWasOffline(true);
    }
  }, [online, wasOffline]);

  useEffect(() => {
    if (!ready) return;
    if (!ageOk) navigate({ to: "/age" });
    else if (!username) navigate({ to: "/login" });
    else if (!pinOk && pathname !== "/pin" && pathname !== "/pin-setup") navigate({ to: "/pin" });
  }, [ready, ageOk, username, pinOk, navigate, pathname]);

  if (!ready || !ageOk || !username || !pinOk) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <BubbleLoader />
      </div>
    );
  }

  return (
    <div className={`flex min-h-screen w-full bg-background`}>
      {online && <Sidebar username={username} />}
      <div className="flex-1 min-w-0 flex flex-col relative h-screen overflow-y-auto bg-background">
        {!isReels && online && <MobileHeader username={username} />}
        <main className={`flex-1 relative bg-background ${isReels || !online ? "" : "pt-14 pb-20 md:pb-0"}`}>
          {!online && pathname !== "/downloaded" ? (
            <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
              <div className="mb-6 rounded-full bg-destructive/10 p-4 text-destructive">
                <WifiOff className="h-12 w-12" />
              </div>
              <h1 className="mb-2 font-display text-4xl text-foreground">You're Offline bruh</h1>
              <p className="mb-8 max-w-md text-foreground/70">
                damn, your wifi really said 'nope' today. did you forget to pay the bill or are you still stealing from your neighbor? anyway, while you rethink your life choices, go watch the stuff you hoarded in your downloads.
              </p>
              <Link to="/downloaded" search={{ tab: "library" }} className="btn-pill inline-flex items-center gap-2">
                <Download className="h-5 w-5" />
                View Downloads
              </Link>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
        {!isReels && online && <BottomNav />}
      </div>
      <InstallPwa />
      <StreakModal />
    </div>
  );
}
