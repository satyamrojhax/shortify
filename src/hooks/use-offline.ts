import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  getAllOfflineMeta,
  getOfflineBlob,
  getStorageEstimate,
  hasOfflineVideo,
  subscribeOffline,
  type OfflineMeta,
  type StorageEstimateInfo,
} from "@/lib/offline-store";
import { getDownloadState, subscribeDownloads, type DownloadState } from "@/lib/offline-downloader";

/** Live state of the running mass download. */
export function useDownloadState(): DownloadState {
  return useSyncExternalStore(subscribeDownloads, getDownloadState, getDownloadState);
}

/** All downloaded reels (metadata only), kept in sync with IndexedDB. */
export function useOfflineLibrary() {
  const [items, setItems] = useState<OfflineMeta[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setItems(await getAllOfflineMeta());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open offline storage.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
    // Coalesce bursts of writes during a mass download into one refresh.
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsub = subscribeOffline(() => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        void refresh();
      }, 400);
    });
    return () => {
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, [refresh]);

  return { items, loaded, error, refresh };
}

/** Browser storage usage / quota, refreshed when `deps` change. */
export function useStorageEstimate(refreshKey: unknown): StorageEstimateInfo {
  const [estimate, setEstimate] = useState<StorageEstimateInfo>(null);
  useEffect(() => {
    let alive = true;
    void getStorageEstimate().then((e) => alive && setEstimate(e));
    return () => {
      alive = false;
    };
  }, [refreshKey]);
  return estimate;
}

/** Tracks navigator.onLine. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

/**
 * Returns a playable src for a video: the offline (IndexedDB) copy when one
 * exists, otherwise the original network URL.
 */
export function useOfflineSrc(url: string, enabled = true): string {
  const [src, setSrc] = useState(url);

  useEffect(() => {
    setSrc(url);
    if (!enabled) return;
    let cancelled = false;
    let objectUrl: string | null = null;

    void (async () => {
      if (!(await hasOfflineVideo(url))) return;
      const blob = await getOfflineBlob(url);
      if (!blob || cancelled) return;
      objectUrl = URL.createObjectURL(blob);
      setSrc(objectUrl);
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url, enabled]);

  return src;
}
