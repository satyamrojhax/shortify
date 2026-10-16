/**
 * offline-store.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * IndexedDB-backed library of reels downloaded for offline playback.
 * (Videos are stored as Blobs in IndexedDB — never in localStorage.)
 *
 *  videos  key = video url   → { url, blob }            (heavy — read on demand)
 *  meta    key = video url   → OfflineMeta               (light — used for lists)
 *
 * Meta is kept in a separate store so listing hundreds of downloads never
 * loads any video bytes into memory.
 */

const DB_NAME = "reels-offline-db";
const DB_VERSION = 1;
const VIDEO_STORE = "videos";
const META_STORE = "meta";

export type OfflineMeta = {
  /** Remote video URL — also the primary key. */
  url: string;
  /** Catalog id of the reel (`local-<idx>-<hash>`). */
  reelId: string;
  /** Position of the reel in the local catalog (for the "Reel #n" label). */
  index: number;
  views?: number;
  likes?: number;
  /** Size in bytes. */
  size: number;
  downloadedAt: number;
};

// ─── Connection & Persistent Fallback ──────────────────────────────────────────

const BACKUP_DB_NAME = "reels-offline-store";
const FALLBACK_STORAGE_KEY = "ig.offline_meta_fallback";

function loadFallbackStore(): Map<string, { meta: OfflineMeta; blob?: Blob }> {
  const map = new Map<string, { meta: OfflineMeta; blob?: Blob }>();
  if (typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(FALLBACK_STORAGE_KEY);
      if (raw) {
        const parsed: OfflineMeta[] = JSON.parse(raw);
        for (const meta of parsed) {
          map.set(meta.url, { meta });
        }
      }
    } catch {}
  }
  return map;
}

const fallbackStore = loadFallbackStore();

function persistFallbackMeta(): void {
  if (typeof localStorage !== "undefined") {
    try {
      const metas = Array.from(fallbackStore.values()).map((v) => v.meta);
      localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(metas));
    } catch {}
  }
}

let dbPromise: Promise<IDBDatabase | null> | null = null;
let isDbDenied = false;

export function resetOfflineDb(): void {
  dbPromise = null;
  isDbDenied = false;
}

function tryOpenDb(name: string, version?: number): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    try {
      const req = version ? indexedDB.open(name, version) : indexedDB.open(name);
      req.onupgradeneeded = () => {
        try {
          const db = req.result;
          if (!db.objectStoreNames.contains(VIDEO_STORE)) {
            db.createObjectStore(VIDEO_STORE, { keyPath: "url" });
          }
          if (!db.objectStoreNames.contains(META_STORE)) {
            db.createObjectStore(META_STORE, { keyPath: "url" });
          }
        } catch {}
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => {
          try {
            db.close();
          } catch {}
          dbPromise = null;
        };
        resolve(db);
      };
      req.onerror = () => {
        resolve(null);
      };
      req.onblocked = () => {
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

async function initDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") {
    isDbDenied = true;
    return null;
  }

  // 1. Try opening primary database with version 1
  let db = await tryOpenDb(DB_NAME, DB_VERSION);
  if (db && db.objectStoreNames.contains(VIDEO_STORE) && db.objectStoreNames.contains(META_STORE)) {
    return db;
  }

  // 2. If version error or upgrade needed, try opening primary database at current version
  if (!db) {
    db = await tryOpenDb(DB_NAME);
    if (db && db.objectStoreNames.contains(VIDEO_STORE) && db.objectStoreNames.contains(META_STORE)) {
      return db;
    }
  }

  // 3. If primary database is locked/corrupted, try backup database
  if (!db) {
    db = await tryOpenDb(BACKUP_DB_NAME, 1);
    if (db && db.objectStoreNames.contains(VIDEO_STORE) && db.objectStoreNames.contains(META_STORE)) {
      return db;
    }
  }

  // 4. Gracefully use persistent fallback storage if IndexedDB is blocked
  isDbDenied = true;
  return null;
}

function getDb(): Promise<IDBDatabase | null> {
  if (isDbDenied) return Promise.resolve(null);
  if (!dbPromise) {
    dbPromise = initDb().then((db) => {
      if (!db) {
        isDbDenied = true;
      }
      return db;
    });
  }
  return dbPromise;
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new DOMException("Transaction aborted", "AbortError"));
  });
}

// ─── Change notifications ─────────────────────────────────────────────────────

const listeners = new Set<() => void>();
let urlIndex: Set<string> | null = null;

function notify() {
  listeners.forEach((l) => l());
}

/** Subscribe to library changes (a video was added / removed). */
export function subscribeOffline(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ─── Reads ────────────────────────────────────────────────────────────────────

export async function getAllOfflineMeta(): Promise<OfflineMeta[]> {
  try {
    const db = await getDb();
    if (!db) {
      const items = Array.from(fallbackStore.values()).map((v) => v.meta);
      urlIndex = new Set(items.map((m) => m.url));
      return items;
    }
    const metas = await reqToPromise(
      db.transaction(META_STORE, "readonly").objectStore(META_STORE).getAll() as IDBRequest<
        OfflineMeta[]
      >,
    );
    urlIndex = new Set(metas.map((m) => m.url));
    return metas;
  } catch (err) {
    console.warn("Could not retrieve offline metadata from IndexedDB:", err);
    const items = Array.from(fallbackStore.values()).map((v) => v.meta);
    urlIndex = new Set(items.map((m) => m.url));
    return items;
  }
}

/** Cached set of downloaded URLs (loaded lazily, kept in sync on writes). */
export async function getOfflineUrlSet(): Promise<Set<string>> {
  if (!urlIndex) await getAllOfflineMeta();
  return urlIndex!;
}

export async function hasOfflineVideo(url: string): Promise<boolean> {
  try {
    return (await getOfflineUrlSet()).has(url);
  } catch {
    return false;
  }
}

export async function getOfflineBlob(url: string): Promise<Blob | null> {
  try {
    const db = await getDb();
    if (!db) {
      return fallbackStore.get(url)?.blob ?? null;
    }
    const rec = await reqToPromise(
      db.transaction(VIDEO_STORE, "readonly").objectStore(VIDEO_STORE).get(url) as IDBRequest<
        { url: string; blob: Blob } | undefined
      >,
    );
    return rec?.blob ?? null;
  } catch {
    return fallbackStore.get(url)?.blob ?? null;
  }
}

// ─── Writes ───────────────────────────────────────────────────────────────────

/** Atomically store a video + its metadata. Rejects with QuotaExceededError when full. */
export async function saveOfflineVideo(meta: OfflineMeta, blob: Blob): Promise<void> {
  const db = await getDb();
  if (!db) {
    fallbackStore.set(meta.url, { meta, blob });
    persistFallbackMeta();
    urlIndex?.add(meta.url);
    notify();
    return;
  }
  const tx = db.transaction([VIDEO_STORE, META_STORE], "readwrite");
  tx.objectStore(VIDEO_STORE).put({ url: meta.url, blob });
  tx.objectStore(META_STORE).put(meta);
  await txDone(tx);
  urlIndex?.add(meta.url);
  notify();
}

export async function deleteOfflineVideos(urls: string[]): Promise<void> {
  if (urls.length === 0) return;
  const db = await getDb();
  if (!db) {
    for (const url of urls) {
      fallbackStore.delete(url);
      urlIndex?.delete(url);
    }
    persistFallbackMeta();
    notify();
    return;
  }
  const tx = db.transaction([VIDEO_STORE, META_STORE], "readwrite");
  for (const url of urls) {
    tx.objectStore(VIDEO_STORE).delete(url);
    tx.objectStore(META_STORE).delete(url);
  }
  await txDone(tx);
  urls.forEach((u) => urlIndex?.delete(u));
  notify();
}

export async function clearOfflineVideos(): Promise<void> {
  const db = await getDb();
  fallbackStore.clear();
  persistFallbackMeta();
  if (db) {
    const tx = db.transaction([VIDEO_STORE, META_STORE], "readwrite");
    tx.objectStore(VIDEO_STORE).clear();
    tx.objectStore(META_STORE).clear();
    await txDone(tx);
  }
  urlIndex = new Set();
  notify();
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

export type StorageEstimateInfo = { usage: number; quota: number } | null;

export async function getStorageEstimate(): Promise<StorageEstimateInfo> {
  try {
    if (!navigator.storage?.estimate) return null;
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    return { usage, quota };
  } catch {
    return null;
  }
}

/** Ask the browser not to evict our downloads under storage pressure. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted?.()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export function isQuotaError(err: unknown): boolean {
  const e = err as { name?: string; code?: number } | null;
  return e?.name === "QuotaExceededError" || e?.code === 22;
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

export function formatBytes(bytes: number, digits = 1): string {
  if (!isFinite(bytes) || bytes <= 0) return "0 MB";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** i;
  return `${value >= 100 || i === 0 ? Math.round(value) : value.toFixed(digits)} ${units[i]}`;
}
