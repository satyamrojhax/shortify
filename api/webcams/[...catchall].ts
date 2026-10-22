export const config = { runtime: "edge" };

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const upstreamPath = url.pathname.replace(/^\/api\/webcams\/?/, "");

  let normalized = upstreamPath;
  if (!normalized.startsWith("/") && !normalized.startsWith("?")) {
    normalized = "/" + normalized;
  }
  if (normalized.startsWith("?")) {
    normalized = "/?" + normalized.slice(1);
  }
  const [pathname, search] = normalized.split("?");
  const safePath = pathname.endsWith("/") ? pathname : `${pathname}/`;
  const queryString = url.search || (search ? `?${search}` : "");
  const targetUrl = `https://viralxxxporn.com/api/webcams${safePath}${queryString}`;

  try {
    const upstreamResponse = await fetch(targetUrl, {
      method: request.method,
      headers: {
        accept: "application/json",
        "x-requested-with": "XMLHttpRequest",
        "user-agent":
          "Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36",
        referer: "https://viralxxxporn.com/live/",
        origin: "https://viralxxxporn.com",
      },
    });

    const responseHeaders = new Headers(upstreamResponse.headers);
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    responseHeaders.set("Access-Control-Allow-Headers", "*");
    responseHeaders.set("Cache-Control", "no-store, no-cache, must-revalidate");

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: "Failed to proxy webcams", message: error?.message }),
      {
        status: 502,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
}
