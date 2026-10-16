import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { NotFoundComponent } from "@/components/not-found";
import { syncRouteUrl, initGlobalActionTracking } from "@/lib/url-tracker";
import { Toaster } from "@/components/ui/sonner";

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something broke</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="btn-pill mt-4"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });

  useEffect(() => {
    syncRouteUrl(pathname);
  }, [pathname]);

  useEffect(() => {
    initGlobalActionTracking();
    if ("serviceWorker" in navigator && typeof window !== "undefined") {
      // In development, avoid registering production sw or avoid noisy errors if disabled
      if (import.meta.env.PROD) {
        navigator.serviceWorker.register("/sw.js").catch((error) => {
          console.warn("Service worker registration skipped:", error);
        });
      }
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster richColors position="top-center" closeButton />
    </QueryClientProvider>
  );
}
