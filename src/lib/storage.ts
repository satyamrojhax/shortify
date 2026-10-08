import type { Reel } from "./reels";
import { setRemoteData } from "@/lib/db";

export const KEYS = {
  age: "ig.age_ok",
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
  crt: "ig.crt",
  memeSounds: "ig.meme_sounds",
} as const;

export const isBrowser = () => typeof window !== "undefined";

let currentUserId: string | null = null;
const memoryCache = new Map<string, any>();

export function initStorageData(userId: string, data: Record<string, any>) {
  currentUserId = userId;
  
  // Preserve keys that exist locally before login (e.g. age verification)
  const existingLocalData = new Map(memoryCache);
  
  memoryCache.clear();
  
  for (const [k, v] of Object.entries(data)) {
    memoryCache.set(k, v);
  }

  // Merge back any keys that were set locally but not fetched remotely
  for (const [k, v] of existingLocalData.entries()) {
    if (!memoryCache.has(k)) {
      memoryCache.set(k, v);
      // Sync it up since the user is now authenticated
      setRemoteData(userId, k, v).catch(() => {});
    }
  }
}

export function get<T>(key: string, fallback: T): T {
  if (memoryCache.has(key)) {
    return memoryCache.get(key) as T;
  }
  return fallback;
}

export function set<T>(key: string, value: T) {
  memoryCache.set(key, value);

  const uid =
    currentUserId ||
    (typeof localStorage !== "undefined" ? localStorage.getItem("ig.user_id") : null);
  if (uid) {
    if (!currentUserId) currentUserId = uid;
    // Fire and forget to supabase
    setRemoteData(uid, key, value).catch((err) =>
      console.error("Failed to sync", key, err),
    );
  }
}

export function remove(key: string) {
  memoryCache.delete(key);
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
  const current = getCoins();
  const newAmount = current + amount;
  set(KEYS.coins, newAmount);
  if (isBrowser()) window.dispatchEvent(new Event("coins-change"));
  return newAmount;
}

export function spendCoins(amount: number): boolean {
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
  const data = get<any[]>(KEYS.favorites, []);
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
  if (list.length > 100) list.pop();
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

export function isCrtEnabled(): boolean {
  return get<boolean>(KEYS.crt, false) || (typeof localStorage !== "undefined" && localStorage.getItem("ig.crt") === "true");
}

export function setCrtEnabled(value: boolean): void {
  set(KEYS.crt, value);
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("ig.crt", String(value));
  }
}

export function isMemeSoundsEnabled(): boolean {
  return get<boolean>(KEYS.memeSounds, false) || (typeof localStorage !== "undefined" && localStorage.getItem("ig.meme_sounds") === "true");
}

export function setMemeSoundsEnabled(value: boolean): void {
  set(KEYS.memeSounds, value);
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("ig.meme_sounds", String(value));
  }
}

