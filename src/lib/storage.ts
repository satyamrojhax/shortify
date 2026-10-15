import type { Reel } from "./reels";
import { setRemoteData } from "@/lib/db";
import { rotateCsrfToken } from "@/lib/url-tracker";
import { fetchViewerCountry } from "@/lib/viewer-country";

export const KEYS = {
  username: "ig.username",
  pin: "ig.pin_ok",
  pinCode: "ig.pin_code",
  realName: "ig.real_name",
  dob: "ig.dob",
  hash: "ig.hash",
  deviceId: "ig.device_id",
  fingerprint: "ig.fingerprint",
  liked: "ig.liked",
  saved: "ig.saved",
  watched: "ig.watched_count",
  coins: "ig.coins",
  theme: "ig.theme",
  muted: "ig.muted",
  autoScroll: "ig.auto_scroll",
  lastReelId: "ig.last_reel_id",
  lastReelIdx: "ig.last_reel_idx",
  unlocks: "ig.unlocks",
  randomMode: "ig.random_mode",
  favorites: "ig.favorites",
  volume: "ig.volume",
  history: "ig.history",
  avatarStyle: "ig.avatar_style",
  avatarSeed: "ig.avatar_seed",
  memeSounds: "ig.meme_sounds",
  streak: "ig.streak",
} as const;

export const isBrowser = () => typeof window !== "undefined";

let currentUserId: string | null = null;
const memoryCache = new Map<string, unknown>();

export function initStorageData(userId: string, data: Record<string, unknown>) {
  currentUserId = userId;

  // Preserve keys that exist locally before login (e.g. age verification)
  const existingLocalData = new Map(memoryCache);

  // Preserve local streak if present
  let localStreak: StreakData | null = null;
  if (isBrowser()) {
    try {
      const s = localStorage.getItem(KEYS.streak);
      if (s) localStreak = JSON.parse(s) as StreakData;
    } catch {
      // ignore invalid json
    }
  }
  if (!localStreak && existingLocalData.has(KEYS.streak)) {
    localStreak = (existingLocalData.get(KEYS.streak) as StreakData) ?? null;
  }

  memoryCache.clear();

  for (const [k, v] of Object.entries(data)) {
    if (k === KEYS.streak && v && typeof v === "object") {
      const remoteStreak = v as StreakData;
      const mergedStreak: StreakData = {
        current: Math.max(localStreak?.current || 0, remoteStreak.current || 0),
        best: Math.max(localStreak?.best || 0, remoteStreak.best || 0),
        lastActive: remoteStreak.lastActive || localStreak?.lastActive || getLocalDateString(),
        lastShown: Math.max(localStreak?.lastShown || 0, remoteStreak.lastShown || 0),
      };
      memoryCache.set(KEYS.streak, mergedStreak);
      if (isBrowser()) {
        localStorage.setItem(KEYS.streak, JSON.stringify(mergedStreak));
      }
      continue;
    }
    memoryCache.set(k, v);
    if (isBrowser() && typeof v !== "undefined") {
      localStorage.setItem(k, typeof v === "object" ? JSON.stringify(v) : String(v));
    }
  }

  // Merge back any keys that were set locally but not fetched remotely
  for (const [k, v] of existingLocalData.entries()) {
    if (!memoryCache.has(k)) {
      memoryCache.set(k, v);
      // Sync it up since the user is now authenticated
      setRemoteData(userId, k, v).catch(() => {});
    }
  }
  if (isBrowser()) window.dispatchEvent(new Event("storage-sync"));
}

export function get<T>(key: string, fallback: T): T {
  if (memoryCache.has(key)) {
    return memoryCache.get(key) as T;
  }
  if (isBrowser()) {
    const local = localStorage.getItem(key);
    if (local !== null) {
      try {
        const parsed = JSON.parse(local);
        memoryCache.set(key, parsed);
        return parsed;
      } catch (e) {
        memoryCache.set(key, local);
        return local as unknown as T;
      }
    }
  }
  return fallback;
}

export function setLocal<T>(key: string, value: T) {
  memoryCache.set(key, value);
  if (isBrowser()) {
    localStorage.setItem(key, typeof value === "object" ? JSON.stringify(value) : String(value));
    if (key === KEYS.coins) window.dispatchEvent(new Event("coins-change"));
    if (key === KEYS.streak) window.dispatchEvent(new Event("streak-change"));
    window.dispatchEvent(new CustomEvent("storage-update", { detail: { key, value } }));
  }
}

export function set<T>(key: string, value: T) {
  memoryCache.set(key, value);
  if (isBrowser()) {
    localStorage.setItem(key, typeof value === "object" ? JSON.stringify(value) : String(value));
    if (key === KEYS.streak) window.dispatchEvent(new Event("streak-change"));
    window.dispatchEvent(new CustomEvent("storage-update", { detail: { key, value } }));
  }

  const uid =
    currentUserId ||
    (typeof localStorage !== "undefined" ? localStorage.getItem("ig.user_id") : null);
  if (uid) {
    if (!currentUserId) currentUserId = uid;
    // Fire and forget to supabase
    setRemoteData(uid, key, value).catch((err) => console.error("Failed to sync", key, err));
  }
}

export function remove(key: string) {
  memoryCache.delete(key);
  if (isBrowser()) {
    localStorage.removeItem(key);
  }
  const uid =
    currentUserId ||
    (typeof localStorage !== "undefined" ? localStorage.getItem("ig.user_id") : null);
  if (uid) {
    // For simplicity, setting to null in DB to "remove"
    setRemoteData(uid, key, null).catch(() => {});
  }
}

export function getLiked(): Reel[] {
  return get<Reel[]>(KEYS.liked, []);
}
export function setLiked(list: Reel[]) {
  set(KEYS.liked, list);
}
export function isLiked(id: string): boolean {
  return getLiked().some((r) => r.id === id);
}
export function toggleLike(reel: Reel): boolean {
  rotateCsrfToken("like_action");
  fetchViewerCountry("like_action").catch(() => {});
  const list = getLiked();
  const idx = list.findIndex((r) => r.id === reel.id);
  if (idx >= 0) {
    list.splice(idx, 1);
    setLiked(list);
    return false;
  }
  list.unshift(reel);
  setLiked(list);
  return true;
}

export function getSaved(): Reel[] {
  return get<Reel[]>(KEYS.saved, []);
}
export function setSaved(list: Reel[]) {
  set(KEYS.saved, list);
}
export function isSaved(id: string): boolean {
  return getSaved().some((r) => r.id === id);
}
export function toggleSave(reel: Reel): boolean {
  rotateCsrfToken("save_action");
  fetchViewerCountry("save_action").catch(() => {});
  const list = getSaved();
  const idx = list.findIndex((r) => r.id === reel.id);
  if (idx >= 0) {
    list.splice(idx, 1);
    setSaved(list);
    return false;
  }
  list.unshift(reel);
  setSaved(list);
  return true;
}

export function getCoins(): number {
  return get<number>(KEYS.coins, 0);
}

export function addCoins(amount: number): number {
  fetchViewerCountry("add_coins").catch(() => {});
  const current = getCoins();
  const newAmount = current + amount;
  set(KEYS.coins, newAmount);
  if (isBrowser()) window.dispatchEvent(new Event("coins-change"));
  return newAmount;
}

export function spendCoins(amount: number): boolean {
  fetchViewerCountry("spend_coins").catch(() => {});
  const current = getCoins();
  if (current < amount) return false;
  set(KEYS.coins, current - amount);
  if (isBrowser()) window.dispatchEvent(new Event("coins-change"));
  return true;
}

export function getAutoScroll(): boolean {
  return get<boolean>(KEYS.autoScroll, true);
}

export function setAutoScroll(value: boolean): void {
  set(KEYS.autoScroll, value);
}

export function getUnlocks(): string[] {
  return get<string[]>(KEYS.unlocks, []);
}

export function hasUnlocked(id: string): boolean {
  return getUnlocks().includes(id);
}

export function unlockItem(id: string): void {
  const current = getUnlocks();
  if (!current.includes(id)) {
    current.push(id);
    set(KEYS.unlocks, current);
  }
}

export function getRandomMode(): boolean {
  return get<boolean>(KEYS.randomMode, false);
}

export function setRandomMode(value: boolean): void {
  set(KEYS.randomMode, value);
}

export type FavoriteCreator = { username: string; timestamp: number };

export function getFavorites(): FavoriteCreator[] {
  const data = get<unknown[]>(KEYS.favorites, []);
  return data.map((item) => {
    if (typeof item === "string") {
      return { username: item, timestamp: Date.now() };
    }
    return item as FavoriteCreator;
  });
}
export function setFavorites(list: FavoriteCreator[]) {
  set(KEYS.favorites, list);
}
export function isFavorite(username: string): boolean {
  return getFavorites().some((f) => f.username === username);
}
export function getFavoriteSince(username: string): number | null {
  const f = getFavorites().find((f) => f.username === username);
  return f ? f.timestamp : null;
}
export function toggleFavorite(username: string): boolean {
  const current = getFavorites();
  const exists = current.some((f) => f.username === username);
  if (exists) {
    setFavorites(current.filter((f) => f.username !== username));
  } else {
    setFavorites([{ username, timestamp: Date.now() }, ...current]);
  }
  return !exists;
}

export function getVolume(): number {
  return get<number>(KEYS.volume, 1);
}

export function setVolumeState(value: number): void {
  set(KEYS.volume, value);
}

export function getHistory(): Reel[] {
  return get<Reel[]>(KEYS.history, []);
}

export function addToHistory(reel: Reel): void {
  const list = getHistory();
  const idx = list.findIndex((r) => r.id === reel.id);
  if (idx >= 0) list.splice(idx, 1);
  list.unshift(reel);
  if (list.length > 1000) list.pop();
  set(KEYS.history, list);
}

export function getAvatarStyle(): string {
  return get<string>(KEYS.avatarStyle, "avataaars");
}

export function setAvatarStyle(style: string): void {
  set(KEYS.avatarStyle, style);
}

export function getAvatarSeed(fallback?: string): string {
  return get<string>(KEYS.avatarSeed, fallback || "");
}

export function setAvatarSeed(seed: string): void {
  set(KEYS.avatarSeed, seed);
}

export function isMemeSoundsEnabled(): boolean {
  return (
    get<boolean>(KEYS.memeSounds, false) ||
    (typeof localStorage !== "undefined" && localStorage.getItem("ig.meme_sounds") === "true")
  );
}

export function setMemeSoundsEnabled(value: boolean): void {
  set(KEYS.memeSounds, value);
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("ig.meme_sounds", String(value));
  }
}

export interface StreakData {
  current: number;
  lastActive: string;
  best: number;
  lastShown?: number;
}

export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDaysBetween(dateStrA: string, dateStrB: string): number {
  if (!dateStrA || !dateStrB) return 0;
  const cleanA = dateStrA.split("T")[0];
  const cleanB = dateStrB.split("T")[0];
  const [y1, m1, d1] = cleanA.split("-").map(Number);
  const [y2, m2, d2] = cleanB.split("-").map(Number);
  if (isNaN(y1) || isNaN(m1) || isNaN(d1) || isNaN(y2) || isNaN(m2) || isNaN(d2)) return 0;
  const utcA = Date.UTC(y1, m1 - 1, d1);
  const utcB = Date.UTC(y2, m2 - 1, d2);
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.round((utcB - utcA) / MS_PER_DAY);
}

export function getStreak(): StreakData {
  const fallback: StreakData = { current: 0, lastActive: "", best: 0 };
  return get<StreakData>(KEYS.streak, fallback);
}

export function updateStreak(): { updated: boolean; streak: StreakData } {
  // If user is offline, DO NOT update streak or show modal
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { updated: false, streak: getStreak() };
  }

  const currentStreak = getStreak();
  const today = getLocalDateString();
  const lastActive = currentStreak.lastActive ? currentStreak.lastActive.split("T")[0] : "";
  const now = Date.now();

  // If already active today, do not update or show modal again today
  if (lastActive === today) {
    return { updated: false, streak: currentStreak };
  }

  let newCurrent = currentStreak.current || 0;

  if (lastActive) {
    const diffDays = getDaysBetween(lastActive, today);

    if (diffDays === 1) {
      // Consecutive calendar day (~24h later) -> streak + 1
      newCurrent = (currentStreak.current || 0) + 1;
    } else if (diffDays === 2) {
      // 1-day grace period to prevent unfair streak resets
      newCurrent = (currentStreak.current || 0) + 1;
    } else if (diffDays <= 0) {
      // Same day or clock skew
      return { updated: false, streak: currentStreak };
    } else {
      // Missed 3+ days -> reset to 1
      newCurrent = 1;
    }
  } else {
    // First streak
    newCurrent = 1;
  }

  const newBest = Math.max(currentStreak.best || 0, newCurrent);

  const newStreak: StreakData = {
    current: newCurrent,
    lastActive: today,
    best: newBest,
    lastShown: now,
  };

  set(KEYS.streak, newStreak);
  if (isBrowser()) window.dispatchEvent(new Event("streak-change"));
  return { updated: true, streak: newStreak };
}

export async function clearAllStats() {
  const keepKeys = [
    "ig.age_ok",
    KEYS.username,
    KEYS.pin,
    KEYS.pinCode,
    KEYS.realName,
    KEYS.dob,
    KEYS.hash,
    KEYS.deviceId,
    KEYS.fingerprint,
  ];

  for (const key of Array.from(memoryCache.keys())) {
    if (!(keepKeys as readonly string[]).includes(key)) {
      memoryCache.delete(key);
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem(key);
      }
    }
  }

  const uid =
    currentUserId ||
    (typeof localStorage !== "undefined" ? localStorage.getItem("ig.user_id") : null);
  if (uid) {
    const { resetAllStatsDb } = await import("./db");
    await resetAllStatsDb(uid);
  }

  if (isBrowser()) window.dispatchEvent(new Event("coins-change"));
}
