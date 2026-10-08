/**
 * Same-origin video proxy used by the offline downloader.
 *
 * The reels CDN does not send CORS headers, so the browser is not allowed to
 * read the video bytes with `fetch()` (it can only stream them into a <video>).
 * To store a reel for offline playback we need the bytes, so we relay the
 * request through our own origin.
 *
 * Runtime-agnostic: only uses the Web `Request` / `Response` APIs, so the same
 * code runs in the Vite dev server, Vercel Edge Functions and Cloudflare Pages
 * Functions.
 *
 * Security: this is NOT an open proxy — only https URLs on allow-listed hosts
 * are relayed.
 */

const ALLOWED_HOSTS = ["cdn.pmaal.com"];

const UPSTREAM_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36",
  Accept: "*/*",
};

function json(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function proxyVideo(request: Request): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return json(405, "Method not allowed");
  }

  const target = new URL(request.url).searchParams.get("url");
  if (!target) return json(400, "Missing url parameter");

  let upstreamUrl: URL;
  try {
    upstreamUrl = new URL(target);
  } catch {
    return json(400, "Invalid url parameter");
  }

  if (upstreamUrl.protocol !== "https:" || !ALLOWED_HOSTS.includes(upstreamUrl.hostname)) {
    return json(403, "Host not allowed");
  }

  const headers = new Headers(UPSTREAM_HEADERS);
  const range = request.headers.get("range");
  if (range) headers.set("Range", range);

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl.toString(), {
      method: request.method,
      headers,
      redirect: "follow",
    });
  } catch {
    return json(502, "Upstream unreachable");
  }

  if (!upstream.ok && upstream.status !== 206) {
    return json(upstream.status === 404 ? 404 : 502, `Upstream responded ${upstream.status}`);
  }

  const out = new Headers();
  // The CDN labels videos as application/octet-stream — force a playable type.
  out.set("Content-Type", "video/mp4");
  for (const name of [
    "content-length",
    "content-range",
    "accept-ranges",
    "etag",
    "last-modified",
  ]) {
    const value = upstream.headers.get(name);
    if (value) out.set(name, value);
  }
  out.set("Cache-Control", "private, no-store");

  return new Response(request.method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    headers: out,
  });
}
