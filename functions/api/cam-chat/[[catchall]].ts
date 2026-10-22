export async function onRequest(context: { request: Request }): Promise<Response> {
  const url = new URL(context.request.url);
  const subpath = url.pathname.replace(/^\/api\/cam-chat\/?/, "");
  const targetUrl = `https://viralxxxporn.cam/api/front/v2/models/${subpath}${url.search}`;

  if (context.request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  try {
    const upstreamResponse = await fetch(targetUrl, {
      method: context.request.method,
      headers: {
        accept: "application/json",
        "front-version": "12.1.36",
        "x-requested-with": "XMLHttpRequest",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36",
        referer: "https://viralxxxporn.cam/",
        origin: "https://viralxxxporn.cam",
      },
      body:
        context.request.method !== "GET" && context.request.method !== "HEAD"
          ? context.request.body
          : undefined,
    });

    const headers = new Headers(upstreamResponse.headers);
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "*");
    headers.set("Cache-Control", "no-store, no-cache, must-revalidate");

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers,
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: "Failed to fetch cam chat", message: err?.message }),
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
