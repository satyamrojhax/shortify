/**
 * DiceBear Avatar utility for generating deterministic, beautiful avatars for users.
 * Supports multiple art styles with pastel backgrounds.
 */

export const DICEBEAR_STYLES = [
  { id: "avataaars", label: "Persona" },
  { id: "lorelei", label: "Lorelei" },
  { id: "bottts", label: "Robots" },
  { id: "notionists", label: "Notionists" },
  { id: "adventurer", label: "Adventurer" },
  { id: "micah", label: "Micah" },
  { id: "fun-emoji", label: "Emoji" },
  { id: "thumbs", label: "Thumbs" },
  { id: "pixel-art", label: "Pixel" },
] as const;

export type DiceBearStyle = (typeof DICEBEAR_STYLES)[number]["id"];

export const DEFAULT_AVATAR_STYLE: DiceBearStyle = "avataaars";

/**
 * Returns a DiceBear SVG avatar URL for a given seed and style.
 */
export function getDiceBearAvatar(
  seed: string,
  style: string = DEFAULT_AVATAR_STYLE,
  options?: { backgroundColor?: string }
): string {
  const safeSeed = encodeURIComponent(seed?.trim() || "user");
  const bg = options?.backgroundColor ?? "b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf";
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${safeSeed}&backgroundColor=${bg}`;
}

/**
 * Helper to get user's profile photo URL using DiceBear API.
 */
export function getUserAvatarUrl(
  username?: string | null,
  customSeed?: string | null,
  style?: string | null
): string {
  const seed = customSeed || username || "user";
  const avatarStyle = style || DEFAULT_AVATAR_STYLE;
  return getDiceBearAvatar(seed, avatarStyle);
}
