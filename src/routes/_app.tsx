import { createFileRoute, Outlet, useNavigate, useRouterState, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { useSiteConfig } from "@/hooks/use-site-config";
import { Sidebar, BottomNav, Footer, MobileHeader } from "@/components/nav";
import { InstallPwa } from "@/components/install-pwa";
import { StreakModal } from "@/components/streak-modal";
import { BubbleLoader } from "@/components/ui/bubble-loader";
import { useOnline } from "@/hooks/use-offline";
import { toast } from "sonner";
import { WifiOff, Download, ShieldAlert, RefreshCw, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  useTheme();
  const navigate = useNavigate();
  const { ready, ageOk, username, pinOk } = useAuth();
  const { isRouteEnabled, getBlockedMessage, content } = useSiteConfig();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isReels =
    pathname === "/reels" || pathname === "/category" || pathname.startsWith("/creator");

  const online = useOnline();
  const [wasOffline, setWasOffline] = useState(!online);
  const [retryChecking, setRetryChecking] = useState(false);

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
    if (!ageOk) navigate({ to: "/age", replace: true });
    else if (!username) navigate({ to: "/login", replace: true });
    else if (!pinOk && pathname !== "/pin" && pathname !== "/pin-setup")
      navigate({ to: "/pin", replace: true });
  }, [ready, ageOk, username, pinOk, navigate, pathname]);

  if (!ready || !ageOk || !username || !pinOk) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <BubbleLoader />
      </div>
    );
  }

  const isPageAllowed = isRouteEnabled(pathname);
  const blockedInfo = getBlockedMessage(pathname);

  const handleRetry = () => {
    setRetryChecking(true);
    setTimeout(() => {
      setRetryChecking(false);
      if (isRouteEnabled(pathname)) {
        toast.success("Page is now accessible!");
      } else {
        toast.info("This page is still unavailable. Please check again in a few moments.");
      }
    }, 700);
  };

  return (
    <div className={`flex min-h-screen w-full bg-background`}>
      {online && <Sidebar username={username} />}
      <div className="flex-1 min-w-0 flex flex-col relative h-screen overflow-y-auto bg-background">
        {/* Sticky Top Header Container for Mobile & Desktop */}
        <div className="sticky top-0 z-40 w-full shrink-0">
          {/* Global Announcement Banner */}
          {content.announcementBanner.enabled && !isReels && (
            <div
              className={`w-full px-4 py-2 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 text-center transition-all shadow-xs ${
                content.announcementBanner.variant === "gradient"
                  ? "bg-linear-to-r from-amber-500 via-pink-500 to-indigo-600 text-white"
                  : content.announcementBanner.variant === "info"
                  ? "bg-blue-600 text-white"
                  : content.announcementBanner.variant === "warning"
                  ? "bg-amber-500 text-black font-semibold"
                  : "bg-emerald-600 text-white"
              }`}
            >
              <Sparkles size={14} className="shrink-0" />
              <span>{content.announcementBanner.text}</span>
              {content.announcementBanner.linkText && content.announcementBanner.linkUrl && (
                <Link
                  to={content.announcementBanner.linkUrl}
                  className="underline underline-offset-2 ml-1 font-bold hover:opacity-80 inline-flex items-center"
                >
                  {content.announcementBanner.linkText} →
                </Link>
              )}
            </div>
          )}

          {!isReels && online && <MobileHeader username={username} />}
        </div>

        <main
          className={`flex-1 relative bg-background ${
            isReels || !online ? "" : "pb-20 md:pb-0"
          }`}
        >
          {!online && pathname !== "/downloaded" ? (
            <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
              <div className="mb-6 rounded-full bg-destructive/10 p-4 text-destructive">
                <WifiOff className="h-12 w-12" />
              </div>
              <h1 className="mb-2 font-display text-4xl text-foreground">You're Offline bruh</h1>
              <p className="mb-8 max-w-md text-foreground/70">
                damn, your wifi really said 'nope' today. did you forget to pay the bill or are you
                still stealing from your neighbor? anyway, while you rethink your life choices, go
                watch the stuff you hoarded in your downloads.
              </p>
              <Link
                to="/downloaded"
                search={{ tab: "library" }}
                className="btn-pill inline-flex items-center gap-2"
              >
                <Download className="h-5 w-5" />
                View Downloads
              </Link>
            </div>
          ) : !isPageAllowed ? (
            /* Blocked / Unavailable Page for Disabled Routes */
            <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center animate-fade-in">
              <div className="mb-6 rounded-3xl bg-destructive/10 border border-destructive/20 p-5 text-destructive shadow-lg shadow-destructive/5">
                <ShieldAlert className="h-12 w-12" />
              </div>
              <h1 className="mb-3 font-display text-3xl sm:text-4xl font-bold text-foreground lowercase">
                {blockedInfo.title}
              </h1>
              <p className="mb-8 max-w-lg text-sm sm:text-base text-foreground/70 leading-relaxed">
                {blockedInfo.message}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  to="/home"
                  className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 shadow-md transition-all"
                >
                  Back to Home
                </Link>
                {content.blockedPageMessage.allowRetry && (
                  <button
                    onClick={handleRetry}
                    disabled={retryChecking}
                    className="px-5 py-2.5 rounded-xl border border-foreground/20 text-foreground font-semibold text-sm hover:bg-foreground/5 transition-all inline-flex items-center gap-2"
                  >
                    <RefreshCw size={15} className={retryChecking ? "animate-spin" : ""} />
                    <span>Check Again</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
        {!isReels && online && <BottomNav />}
      </div>
      <InstallPwa />
      {online && <StreakModal />}
    </div>
  );
}
