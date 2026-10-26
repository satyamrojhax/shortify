import { createFileRoute, Outlet, useNavigate, useRouterState, Link } from "@tanstack/react-router";
import { useEffect, useState, lazy, Suspense } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { useSiteConfig } from "@/hooks/use-site-config";
import { Sidebar, BottomNav, Footer, MobileHeader } from "@/components/nav";
import { InstallPwa } from "@/components/install-pwa";
import { StreakModal } from "@/components/streak-modal";
import { BubbleLoader } from "@/components/ui/bubble-loader";
import { useOnline } from "@/hooks/use-offline";
import { toast } from "sonner";
import { WifiOff, ShieldAlert, RefreshCw, Sparkles } from "lucide-react";

const AiMuse = lazy(() => import("@/components/ai-muse").then((mod) => ({ default: mod.AiMuse })));

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
  const [networkChecking, setNetworkChecking] = useState(false);

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

  const handleCheckNetwork = async () => {
    setNetworkChecking(true);
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        toast.error("You're still offline. Please check your internet connection.");
        setNetworkChecking(false);
        return;
      }
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`/manifest.json?_t=${Date.now()}`, {
        method: "HEAD",
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        toast.success("Connection restored! You are back online.");
        window.location.reload();
      } else {
        toast.error("You're still offline or your network is unreachable.");
      }
    } catch {
      toast.error("You're still offline. Please check your internet connection.");
    } finally {
      setNetworkChecking(false);
    }
  };

  return (
    <div className={`flex min-h-screen w-full bg-background`}>
      {online && <Sidebar username={username} />}
      <div className="flex-1 min-w-0 flex flex-col relative h-screen overflow-y-auto bg-background">
        {/* Sticky Top Header Container for Mobile & Desktop */}
        <div className="sticky top-0 z-40 w-full shrink-0">
          {/* Global Announcement Banner */}
          {content.announcementBanner.enabled && !isReels && online && (
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
          className={`flex-1 relative bg-background ${isReels || !online ? "" : "pb-20 md:pb-0"}`}
        >
          {!online ? (
            <div className="flex min-h-[75vh] flex-col items-center justify-center p-6 text-center animate-fade-in select-none">
              <div className="relative mb-6">
                <div className="absolute -inset-2 rounded-full bg-destructive/10 blur-md animate-pulse" />
                <div className="relative rounded-full bg-destructive/15 p-5 text-destructive border border-destructive/20 shadow-lg shadow-destructive/10">
                  <WifiOff className="h-12 w-12" />
                </div>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-semibold uppercase tracking-wider mb-3 border border-destructive/20">
                <span>No Connection</span>
              </div>

              <h1 className="mb-2 font-display text-3xl sm:text-4xl font-bold text-foreground lowercase">
                you're offline
              </h1>

              <p className="mb-8 max-w-md text-sm sm:text-base text-foreground/75 leading-relaxed">
                you're offline. you cannot use the app if you're offline. please connect to the
                internet to continue.
              </p>

              <button
                type="button"
                onClick={handleCheckNetwork}
                disabled={networkChecking}
                className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 active:scale-95 transition-all shadow-md inline-flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                <RefreshCw size={16} className={networkChecking ? "animate-spin" : ""} />
                <span>{networkChecking ? "Checking Network..." : "Refresh & Check Network"}</span>
              </button>
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
      {online && <InstallPwa />}
      {online && <StreakModal />}
      {online && (
        <Suspense fallback={null}>
          <AiMuse />
        </Suspense>
      )}
    </div>
  );
}
