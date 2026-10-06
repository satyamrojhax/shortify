/**
 * offline-downloader.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Mass-download manager. A module-level singleton, so a running download keeps
 * going while the user navigates around the app (SPA navigation never unloads
 * this module).
 *
 *  • N parallel workers, per-file retry with back-off
 *  • pause / resume / cancel (+ auto-pause when the device goes offline)
 *  • live stats: bytes, speed, ETA, per-file progress
 *  • stops cleanly when browser storage is full
 *  • keeps the screen awake during a download (Wake Lock, best effort)
 *
 * Video bytes are fetched through /api/video-proxy (the CDN has no CORS) and
 * written to IndexedDB by offline-store.ts.
 */

import type { Reel } from "./reels";
import {
  isQuotaError,
  requestPersistentStorage,
  saveOfflineVideo,
  type OfflineMeta,
} from "./offline-store";

export type DownloadStatus = "idle" | "running" | "paused" | "done" | "error";

export type ActiveItem = {
  url: string;
  label: string;
  received: number;
  /** 0 when the server did not report a size. */
  total: number;
};

export type DownloadState = {
  status: DownloadStatus;
  /** Reels in this batch. */
  total: number;
  completed: number;
  failed: number;
  /** Bytes saved so far in this batch (+ in-flight bytes). */
  bytes: number;
  speedBps: number;
  etaSeconds: number | null;
  active: ActiveItem[];
  message: string | null;
  /** True when paused because the device went offline. */
  autoPaused: boolean;
};

const CONCURRENCY = 3;
const MAX_ATTEMPTS = 3;
const PUBLISH_INTERVAL_MS = 150;
const SPEED_WINDOW_MS = 4000;

const IDLE_STATE: DownloadState = {
  status: "idle",
  total: 0,
  completed: 0,
  failed: 0,
  bytes: 0,
  speedBps: 0,
  etaSeconds: null,
  active: [],
  message: null,
  autoPaused: false,
};

// ─── Errors ───────────────────────────────────────────────────────────────────

class FatalDownloadError extends Error {}
class SkipReelError extends Error {}

// ─── Internal state ───────────────────────────────────────────────────────────

let status: DownloadStatus = "idle";
let message: string | null = null;
let autoPaused = false;
let total = 0;
let completed = 0;
let failed = 0;
let savedBytes = 0;

let queue: Reel[] = [];
const attempts = new Map<string, number>();
const inflight = new Map<string, { ctrl: AbortController; reel: Reel }>();
const progress = new Map<string, ActiveItem>();

let activeMs = 0;
let segmentStart: number | null = null;
let samples: { t: number; b: number }[] = [];

let snapshot: DownloadState = IDLE_STATE;
const subscribers = new Set<() => void>();
let publishTimer: ReturnType<typeof setTimeout> | null = null;

// ─── Publishing ───────────────────────────────────────────────────────────────

function buildSnapshot(): DownloadState {
  const now = Date.now();
  const active = [...progress.values()].map((p) => ({ ...p }));
  const bytes = savedBytes + active.reduce((n, a) => n + a.received, 0);

  // Speed over a sliding window
  samples.push({ t: now, b: bytes });
  samples = samples.filter((s) => now - s.t <= SPEED_WINDOW_MS);
  let speedBps = 0;
  if (status === "running" && samples.length > 1) {
    const first = samples[0];
    const dt = (now - first.t) / 1000;
    if (dt > 0.2) speedBps = Math.max(0, (bytes - first.b) / dt);
  }

  // ETA from average time per finished reel
  let etaSeconds: number | null = null;
  const remaining = total - completed - failed;
  if (status === "running" && completed > 0 && remaining > 0) {
    const elapsed = activeMs + (segmentStart ? now - segmentStart : 0);
    etaSeconds = Math.round((remaining * (elapsed / completed)) / 1000);
  }

  return { status, total, completed, failed, bytes, speedBps, etaSeconds, active, message, autoPaused };
}

function publish(immediate = false) {
  const run = () => {
    publishTimer = null;
    snapshot = buildSnapshot();
    subscribers.forEach((s) => s());
  };
  if (immediate) {
    if (publishTimer) clearTimeout(publishTimer);
    run();
  } else if (!publishTimer) {
    publishTimer = setTimeout(run, PUBLISH_INTERVAL_MS);
  }
}

export function subscribeDownloads(listener: () => void): () => void {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}

export function getDownloadState(): DownloadState {
  return snapshot;
}

// ─── Wake lock (keep screen on while downloading) ─────────────────────────────

let wakeLock: WakeLockSentinel | null = null;

async function acquireWakeLock() {
  try {
    if (!wakeLock && "wakeLock" in navigator) {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => {
        wakeLock = null;
      });
    }
  } catch {
    /* not supported / denied — ignore */
  }
}

function releaseWakeLock() {
  wakeLock?.release().catch(() => {});
  wakeLock = null;
}

// ─── Networking ───────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchVideoBlob(
  url: string,
  signal: AbortSignal,
  onProgress: (received: number, total: number) => void,
): Promise<Blob> {
  const res = await fetch(`/api/video-proxy?url=${encodeURIComponent(url)}`, {
    signal,
    cache: "no-store",
  });

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("text/html")) {
    // A static host rewrote our API path to index.html → the proxy is not deployed.
    throw new FatalDownloadError(
      "The download service is unavailable on this server. Deploy the /api/video-proxy function.",
    );
  }
  if (res.status === 404) throw new SkipReelError("Video not found");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const expected = Number(res.headers.get("content-length")) || 0;
  onProgress(0, expected);

  if (!res.body) {
    const blob = await res.blob();
    onProgress(blob.size, expected || blob.size);
    return new Blob([blob], { type: "video/mp4" });
  }

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.byteLength;
    onProgress(received, expected);
  }

  if (expected && received !== expected) throw new Error("Incomplete download");
  if (received < 1024) throw new Error("Invalid video data");
  return new Blob(chunks as BlobPart[], { type: "video/mp4" });
}

function reelIndex(reel: Reel): number {
  const m = /^local-(\d+)-/.exec(reel.id);
  return m ? Number(m[1]) : 0;
}

function labelFor(reel: Reel): string {
  return `Reel #${reelIndex(reel) + 1}`;
}

// ─── Worker ───────────────────────────────────────────────────────────────────

async function runOne(reel: Reel) {
  const url = reel.videoUrl;
  const ctrl = new AbortController();
  inflight.set(url, { ctrl, reel });
  progress.set(url, { url, label: labelFor(reel), received: 0, total: 0 });
  publish();

  try {
    const blob = await fetchVideoBlob(url, ctrl.signal, (received, expected) => {
      const p = progress.get(url);
      if (p && inflight.get(url)?.ctrl === ctrl) {
        p.received = received;
        p.total = expected;
        publish();
      }
    });

    const meta: OfflineMeta = {
      url,
      reelId: reel.id,
      index: reelIndex(reel),
      views: reel.views,
      likes: reel.likes,
      size: blob.size,
      downloadedAt: Date.now(),
    };
    await saveOfflineVideo(meta, blob);
    savedBytes += blob.size;
    completed++;
  } catch (err) {
    if (ctrl.signal.aborted) return; // paused / cancelled — requeued by pause()

    if (isQuotaError(err)) {
      fatal("Browser storage is full. Free up space or delete some downloads, then try again.");
    } else if (err instanceof FatalDownloadError) {
      fatal(err.message);
    } else if (err instanceof SkipReelError) {
      failed++;
    } else {
      const n = (attempts.get(url) ?? 0) + 1;
      attempts.set(url, n);
      if (n < MAX_ATTEMPTS) {
        await sleep(700 * n);
        if (!ctrl.signal.aborted) queue.push(reel);
      } else {
        failed++;
      }
    }
  } finally {
    if (inflight.get(url)?.ctrl === ctrl) {
      inflight.delete(url);
      progress.delete(url);
    }
    publish();
    pump();
  }
}

function pump() {
  if (status !== "running") return;
  while (inflight.size < CONCURRENCY && queue.length > 0) {
    void runOne(queue.shift()!);
  }
  if (inflight.size === 0 && queue.length === 0) finish();
}

function finish() {
  if (status !== "running") return;
  closeSegment();
  status = "done";
  message =
    failed > 0
      ? `${completed} saved, ${failed} could not be downloaded.`
      : `All ${completed} reels saved for offline playback.`;
  releaseWakeLock();
  publish(true);
}

function fatal(msg: string) {
  abortAll(false);
  queue = [];
  closeSegment();
  status = "error";
  message = msg;
  releaseWakeLock();
  publish(true);
}

function closeSegment() {
  if (segmentStart !== null) {
    activeMs += Date.now() - segmentStart;
    segmentStart = null;
  }
}

function abortAll(requeue: boolean) {
  const items = [...inflight.values()];
  inflight.clear();
  progress.clear();
  for (const { ctrl, reel } of items) {
    ctrl.abort();
    if (requeue) queue.unshift(reel);
  }
}

// ─── Public controls ──────────────────────────────────────────────────────────

/** Begin downloading the given reels. No-op while a batch is running/paused. */
export function startDownload(reels: Reel[]): boolean {
  if (status === "running" || status === "paused" || reels.length === 0) return false;

  queue = [...reels];
  attempts.clear();
  inflight.clear();
  progress.clear();
  total = reels.length;
  completed = 0;
  failed = 0;
  savedBytes = 0;
  activeMs = 0;
  segmentStart = Date.now();
  samples = [];
  autoPaused = false;
  message = null;
  status = "running";

  void requestPersistentStorage();
  void acquireWakeLock();
  publish(true);
  pump();
  return true;
}

export function pauseDownload(auto = false) {
  if (status !== "running") return;
  closeSegment();
  status = "paused";
  autoPaused = auto;
  message = auto ? "You're offline — download paused. It will resume when you reconnect." : null;
  abortAll(true);
  releaseWakeLock();
  publish(true);
}

export function resumeDownload() {
  if (status !== "paused") return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    message = "You're offline — connect to the internet to continue.";
    autoPaused = true;
    publish(true);
    return;
  }
  status = "running";
  autoPaused = false;
  message = null;
  segmentStart = Date.now();
  samples = [];
  void acquireWakeLock();
  publish(true);
  pump();
}

/** Stop the batch. Reels that were already saved stay in the library. */
export function cancelDownload() {
  if (status !== "running" && status !== "paused") return;
  const saved = completed;
  abortAll(false);
  queue = [];
  closeSegment();
  releaseWakeLock();
  status = "idle";
  total = 0;
  completed = 0;
  failed = 0;
  savedBytes = 0;
  autoPaused = false;
  message = saved > 0 ? `Download stopped — ${saved} reel${saved === 1 ? "" : "s"} saved.` : null;
  publish(true);
}

/** Clear a finished / failed summary and return to idle. */
export function dismissDownload() {
  if (status === "running" || status === "paused") return;
  status = "idle";
  total = 0;
  completed = 0;
  failed = 0;
  savedBytes = 0;
  message = null;
  publish(true);
}

// ─── Network + visibility awareness ───────────────────────────────────────────

if (typeof window !== "undefined") {
  window.addEventListener("offline", () => pauseDownload(true));
  window.addEventListener("online", () => {
    if (status === "paused" && autoPaused) resumeDownload();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && status === "running") void acquireWakeLock();
  });
}
