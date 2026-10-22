import type { Reel } from "./reels";
import { setRemoteData } from "@/lib/db";
import { rotateCsrfToken } from "@/lib/url-tracker";
import { fetchViewerCountry, setCookie, getCookie } from "@/lib/viewer-country";

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

export function parseJsonIfString<T = unknown>(val: unknown): T {
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (
      (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith('"') && trimmed.endsWith('"'))
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        return parseJsonIfString(parsed) as T;
      } catch {
        return val as T;
      }
    }
  }
  return val as T;
}

export function ensureArray<T>(val: unknown): T[] {
  const parsed = parseJsonIfString(val);
  return Array.isArray(parsed) ? (parsed as T[]) : [];
}

export function initStorageData(userId: string, data: Record<string, unknown>) {
  currentUserId = userId;

  // Preserve keys that exist locally before login (e.g. age verification)
  const existingLocalData = new Map(memoryCache);

  // Also preserve credentials and age verification from localStorage
  if (isBrowser()) {
    const preserveKeys = [
      KEYS.username,
      KEYS.pinCode,
      KEYS.dob,
      KEYS.realName,
      KEYS.hash,
      KEYS.deviceId,
      KEYS.fingerprint,
      KEYS.streak,
      KEYS.coins,
      KEYS.watched,
      KEYS.theme,
      KEYS.liked,
      KEYS.saved,
      KEYS.history,
      KEYS.favorites,
      KEYS.unlocks,
      KEYS.avatarStyle,
      KEYS.avatarSeed,
      "ig.streak",
      "ig.age_ok",
      "ig.user_name",
      "ig.user_id",
    ];
    for (const pk of preserveKeys) {
      if (!existingLocalData.has(pk)) {
        const val = localStorage.getItem(pk);
        if (val !== null) {
          existingLocalData.set(pk, parseJsonIfString(val));
        }
      }
    }
  }

  // Preserve local streak if present
  let localStreak: StreakData | null = null;
  if (isBrowser()) {
    try {
      const s = localStorage.getItem(KEYS.streak) || getCookie("ig.streak");
      if (s) localStreak = JSON.parse(s) as StreakData;
    } catch {
      // ignore invalid json
    }
  }
  if (!localStreak && existingLocalData.has(KEYS.streak)) {
    localStreak = (existingLocalData.get(KEYS.streak) as StreakData) ?? null;
  }

  memoryCache.clear();

  for (const [k, rawV] of Object.entries(data)) {
    const v = parseJsonIfString(rawV);
    if (k === KEYS.streak && v && typeof v === "object") {
      const remoteStreak = v as StreakData;
      const maxProgress = Math.max(
        localStreak?.current || 0,
        remoteStreak.current || 0,
        localStreak?.best || 0,
        remoteStreak.best || 0,
      );
      const mergedStreak: StreakData = {
        current: maxProgress > 0 ? maxProgress : 1,
        best: Math.max(maxProgress, localStreak?.best || 0, remoteStreak.best || 0, 1),
        lastActive: remoteStreak.lastActive || localStreak?.lastActive || getLocalDateString(),
        lastShown: Math.max(localStreak?.lastShown || 0, remoteStreak.lastShown || 0),
      };
      memoryCache.set(KEYS.streak, mergedStreak);
      if (isBrowser()) {
        localStorage.setItem(KEYS.streak, JSON.stringify(mergedStreak));
        setCookie("ig.streak", JSON.stringify(mergedStreak), 365);
      }
      continue;
    }
    memoryCache.set(k, v);
    if (isBrowser() && typeof v !== "undefined") {
      localStorage.setItem(k, typeof v === "object" ? JSON.stringify(v) : String(v));
    }
  }

  // Merge back any keys that were set locally but not fetched remotely
  for (const [k, rawV] of existingLocalData.entries()) {
    const v = parseJsonIfString(rawV);
    if (!memoryCache.has(k)) {
      memoryCache.set(k, v);
      if (isBrowser() && typeof v !== "undefined") {
        localStorage.setItem(k, typeof v === "object" ? JSON.stringify(v) : String(v));
      }
      // Sync it up since the user is now authenticated
      setRemoteData(userId, k, v).catch(() => {});
    }
  }
  if (isBrowser()) window.dispatchEvent(new Event("storage-sync"));
}

export function get<T>(key: string, fallback: T): T {
  let val: unknown = undefined;
  if (memoryCache.has(key)) {
    val = memoryCache.get(key);
  } else if (isBrowser()) {
    const local = localStorage.getItem(key);
    if (local !== null) {
      try {
        val = JSON.parse(local);
      } catch (e) {
        val = local;
      }
      val = parseJsonIfString(val);
      memoryCache.set(key, val);
    }
  }

  if (val === undefined || val === null) {
    return fallback;
  }

  if (Array.isArray(fallback)) {
    return ensureArray(val) as unknown as T;
  }

  return parseJsonIfString(val) as T;
}

export function setLocal<T>(key: string, value: T) {
  memoryCache.set(key, value);
  if (isBrowser()) {
    localStorage.setItem(key, typeof value === "object" ? JSON.stringify(value) : String(value));
    if (key === KEYS.username && typeof value === "string") {
      localStorage.setItem("ig.user_name", value);
      setCookie("ig.username", value, 365);
      setCookie("ig.user_name", value, 365);
    }
    if (key === KEYS.coins) window.dispatchEvent(new Event("coins-change"));
    if (key === KEYS.streak) window.dispatchEvent(new Event("streak-change"));
    window.dispatchEvent(new CustomEvent("storage-update", { detail: { key, value } }));
  }
}

export function set<T>(key: string, value: T) {
  memoryCache.set(key, value);
  if (isBrowser()) {
    localStorage.setItem(key, typeof value === "object" ? JSON.stringify(value) : String(value));
    if (key === KEYS.username && typeof value === "string") {
      localStorage.setItem("ig.user_name", value);
      setCookie("ig.username", value, 365);
      setCookie("ig.user_name", value, 365);
    }
    if (key === KEYS.streak) window.dispatchEvent(new Event("streak-change"));
    window.dispatchEvent(new CustomEvent("storage-update", { detail: { key, value } }));
  }

  const uid =
    currentUserId ||
    (typeof localStorage !== "undefined" ? localStorage.getItem("ig.user_id") : null);
  if (uid) {
    if (!currentUserId) currentUserId = uid;
    // Fire and forget to supabase
    setRemoteData(uid, key, value).catch(() => {});
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
  return ensureArray<Reel>(get<Reel[]>(KEYS.liked, [])).filter(
    (r) => !r.isLive && r.source !== "live" && !r.id?.startsWith("live-"),
  );
}
export function setLiked(list: Reel[]) {
  set(KEYS.liked, list);
}
function resolveReelOrigin(
  reel: Reel,
  originInfo?: { player?: "normal" | "category"; category?: string },
): Reel {
  let player = originInfo?.player || reel.originPlayer;
  let category = originInfo?.category || reel.originCategory || reel.category;

  if (!player && typeof window !== "undefined") {
    const path = window.location.pathname;
    if (path.includes("/category")) {
      player = "category";
      if (!category) {
        category = new URLSearchParams(window.location.search).get("c") || undefined;
      }
    } else {
      player = "normal";
    }
  }

  return {
    ...reel,
    originPlayer: player || "normal",
    originCategory: category,
  };
}

export function isLiked(id: string): boolean {
  if (id?.startsWith("live-")) return false;
  return getLiked().some((r) => r.id === id);
}
export function toggleLike(
  reel: Reel,
  originInfo?: { player?: "normal" | "category"; category?: string },
): boolean {
  if (reel.isLive || reel.source === "live" || reel.id?.startsWith("live-")) {
    return false;
  }
  rotateCsrfToken("like_action");
  fetchViewerCountry("like_action").catch(() => {});
  const list = getLiked();
  const idx = list.findIndex((r) => r.id === reel.id);
  if (idx >= 0) {
    list.splice(idx, 1);
    setLiked(list);
    return false;
  }
  const itemToSave = resolveReelOrigin(reel, originInfo);
  list.unshift(itemToSave);
  setLiked(list);
  return true;
}

export function getSaved(): Reel[] {
  return ensureArray<Reel>(get<Reel[]>(KEYS.saved, [])).filter(
    (r) => !r.isLive && r.source !== "live" && !r.id?.startsWith("live-"),
  );
}
export function setSaved(list: Reel[]) {
  set(KEYS.saved, list);
}
export function isSaved(id: string): boolean {
  if (id?.startsWith("live-")) return false;
  return getSaved().some((r) => r.id === id);
}
export function toggleSave(
  reel: Reel,
  originInfo?: { player?: "normal" | "category"; category?: string },
): boolean {
  if (reel.isLive || reel.source === "live" || reel.id?.startsWith("live-")) {
    return false;
  }
  rotateCsrfToken("save_action");
  fetchViewerCountry("save_action").catch(() => {});
  const list = getSaved();
  const idx = list.findIndex((r) => r.id === reel.id);
  if (idx >= 0) {
    list.splice(idx, 1);
    setSaved(list);
    return false;
  }
  const itemToSave = resolveReelOrigin(reel, originInfo);
  list.unshift(itemToSave);
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
  return ensureArray<string>(get<string[]>(KEYS.unlocks, []));
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
  const data = ensureArray<unknown>(get<unknown[]>(KEYS.favorites, []));
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
  return ensureArray<Reel>(get<Reel[]>(KEYS.history, []));
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
  let data = get<StreakData>(KEYS.streak, fallback);
  if (!data || typeof data !== "object") {
    if (isBrowser()) {
      try {
        const c = getCookie("ig.streak");
        if (c) data = JSON.parse(c);
      } catch {}
    }
  }
  if (!data || typeof data !== "object") return fallback;
  // If user previously had a higher best streak, don't leave current at 0/1
  const maxVal = Math.max(data.current || 0, data.best || 0);
  if (maxVal > 0 && (!data.current || data.current < maxVal)) {
    data.current = maxVal;
  }
  return data;
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

  // Preserve user's existing streak progress - NEVER reset down to 1
  const existingProgress = Math.max(currentStreak.current || 0, currentStreak.best || 0);

  let newCurrent = 1;

  if (lastActive) {
    const diffDays = getDaysBetween(lastActive, today);

    if (diffDays <= 0) {
      // Same day or clock skew
      return { updated: false, streak: currentStreak };
    } else {
      // User active on a new day -> increment streak!
      newCurrent = existingProgress > 0 ? existingProgress + 1 : 1;
    }
  } else {
    // First time or continuing unrecorded day
    newCurrent = existingProgress > 0 ? existingProgress + 1 : 1;
  }

  const newBest = Math.max(currentStreak.best || 0, existingProgress, newCurrent);

  const newStreak: StreakData = {
    current: newCurrent,
    lastActive: today,
    best: newBest,
    lastShown: now,
  };

  set(KEYS.streak, newStreak);
  if (isBrowser()) {
    setCookie("ig.streak", JSON.stringify(newStreak), 365);
    window.dispatchEvent(new Event("streak-change"));
  }
  return { updated: true, streak: newStreak };
}

/** Check if current user is an existing/old user based on activity and streak */
export function isOldUser(): boolean {
  try {
    const watched = get<number>(KEYS.watched, 0);
    const history = getHistory();
    const streak = getStreak();
    const liked = getLiked();
    const saved = getSaved();
    if (
      watched > 2 ||
      history.length > 2 ||
      liked.length > 0 ||
      saved.length > 0 ||
      (streak.best && streak.best > 1) ||
      (streak.current && streak.current > 1)
    ) {
      return true;
    }
  } catch {}
  return false;
}

export async function clearAllStats() {
  const keepKeys = [
    "ig.age_ok",
    "ig.user_id",
    "ig.user_name",
    KEYS.username,
    KEYS.pin,
    KEYS.pinCode,
    KEYS.realName,
    KEYS.dob,
    KEYS.hash,
    KEYS.deviceId,
    KEYS.fingerprint,
    KEYS.streak,
    "ig.streak",
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

export function clearAllUserData() {
  memoryCache.clear();
  currentUserId = null;

  if (isBrowser()) {
    const userKeys = [
      KEYS.username,
      KEYS.pin,
      KEYS.pinCode,
      KEYS.realName,
      KEYS.dob,
      KEYS.hash,
      KEYS.deviceId,
      KEYS.fingerprint,
      KEYS.liked,
      KEYS.saved,
      KEYS.watched,
      KEYS.coins,
      KEYS.unlocks,
      KEYS.randomMode,
      KEYS.favorites,
      KEYS.history,
      KEYS.avatarStyle,
      KEYS.avatarSeed,
      KEYS.memeSounds,
      KEYS.streak,
      "ig.username",
      "ig.user_name",
      "ig.user_id",
      "ig.pin_code",
      "ig.pin_ok",
      "ig.session_pin_ok",
      "ig.real_name",
      "ig.dob",
      "ig.bio",
      "sb-mcrhjyszrxbtiizhgacn-auth-token",
      "sb-localhost-auth-token",
      "sb-127-auth-token",
      "sb-shortify-auth-token",
    ];

    for (const k of userKeys) {
      try {
        localStorage.removeItem(k);
      } catch {}
    }

    try {
      sessionStorage.removeItem("ig.pin_ok");
      sessionStorage.removeItem("ig.session_pin_ok");
    } catch {}

    window.dispatchEvent(new Event("storage-sync"));
  }
}

