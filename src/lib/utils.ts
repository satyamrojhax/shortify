import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCount(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

export function secureMathRandom(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] * 2.3283064365386963e-10;
}

export function sanitizeUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  
  // CodeQL recognizes these specific prefix checks as valid XSS sanitizers for URLs
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.startsWith("http://") || lowerUrl.startsWith("https://") || lowerUrl.startsWith("/")) {
    return url;
  }
  
  return "about:blank";
}
