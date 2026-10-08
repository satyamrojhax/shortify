/**
 * pwa-shell.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Makes sure the app shell (index.html + hashed JS/CSS bundles) is in the
 * service worker's static cache, so the app — and the offline library — can
 * cold-start with no network.
 *
 * On a very first visit the page's own bundles are fetched *before* the
 * service worker takes control, so the worker never sees (and never caches)
 * them. Calling this once from the downloads page closes that gap.
 */

/** Must match STATIC_CACHE in public/sw.js */
const STATIC_CACHE = "reels-static-v5";

export async function warmAppShell(): Promise<boolean> {
  try {
    if (typeof caches === "undefined") return false;
    const cache = await caches.open(STATIC_CACHE);

    const urls = new Set<string>(["/"]);
    const add = (raw: string | null) => {
      if (!raw) return;
      try {
        const u = new URL(raw, window.location.href);
        if (u.origin === window.location.origin && u.pathname.startsWith("/assets/")) {
          urls.add(u.pathname + u.search);
        }
      } catch {
        /* ignore malformed urls */
      }
    };
    document
      .querySelectorAll<HTMLScriptElement>("script[src]")
      .forEach((el) => add(el.getAttribute("src")));
    document
      .querySelectorAll<HTMLLinkElement>(
        "link[rel=stylesheet][href], link[rel=modulepreload][href]",
      )
      .forEach((el) => add(el.getAttribute("href")));
    performance.getEntriesByType("resource").forEach((entry) => add(entry.name));

    let allCached = true;
    await Promise.all(
      [...urls].map(async (u) => {
        if (await cache.match(u)) return;
        try {
          await cache.add(u);
        } catch {
          allCached = false;
        }
      }),
    );
    return allCached;
  } catch {
    return false;
  }
}
