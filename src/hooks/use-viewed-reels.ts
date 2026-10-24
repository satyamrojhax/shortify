import { useState, useEffect, useCallback, useMemo } from "react";
import { getHistory, isReelViewed } from "@/lib/storage";
import type { Reel } from "@/lib/reels";

/**
 * Hook to reactively check whether a reel has been watched by the user.
 * Automatically updates when history changes across the application.
 */
export function useViewedReels() {
  const [history, setHistory] = useState<Reel[]>(() => {
    if (typeof window === "undefined") return [];
    return getHistory();
  });

  useEffect(() => {
    const update = () => {
      setHistory(getHistory());
    };

    window.addEventListener("storage-sync", update);
    window.addEventListener("storage-update", update);

    return () => {
      window.removeEventListener("storage-sync", update);
      window.removeEventListener("storage-update", update);
    };
  }, []);

  // Precompute fast O(1) hash sets for rapid grid lookups
  const viewedLookup = useMemo(() => {
    const ids = new Set<string>();
    const urls = new Set<string>();
    const thumbs = new Set<string>();

    for (const item of history) {
      if (item.id) {
        ids.add(item.id.trim());
        const clean = item.id.replace(/^(creator|short|local)-/, "").split("-")[0];
        if (clean && clean.length > 2) {
          ids.add(clean.trim());
        }
      }
      if (item.videoUrl) {
        urls.add(item.videoUrl.trim());
        const u = item.videoUrl.split("?")[0].trim();
        if (u) urls.add(u);
      }
      if (item.thumbnail) {
        const t = item.thumbnail.split("?")[0].trim();
        if (t && t.length > 15) {
          thumbs.add(t);
        }
      }
    }

    return { ids, urls, thumbs };
  }, [history]);

  const isViewed = useCallback(
    (reel?: Partial<Reel> | null): boolean => {
      if (!reel || reel.isLive) return false;

      // 1. Direct ID check
      if (reel.id) {
        const id = reel.id.trim();
        if (viewedLookup.ids.has(id)) return true;
        const clean = id.replace(/^(creator|short|local)-/, "").split("-")[0];
        if (clean && clean.length > 2 && viewedLookup.ids.has(clean)) return true;
      }

      // 2. Video URL check
      if (reel.videoUrl) {
        const url = reel.videoUrl.trim();
        if (viewedLookup.urls.has(url)) return true;
        const u = url.split("?")[0].trim();
        if (u && viewedLookup.urls.has(u)) return true;
      }

      // 3. Thumbnail check
      if (reel.thumbnail) {
        const t = reel.thumbnail.split("?")[0].trim();
        if (t && t.length > 15 && viewedLookup.thumbs.has(t)) return true;
      }

      return false;
    },
    [viewedLookup],
  );

  return { isViewed, history, viewedCount: history.length };
}
