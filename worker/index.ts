interface Env {
  ASSETS: {
    fetch: typeof fetch;
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // 1. Handle CORS preflight requests
    if (request.method === "OPTIONS") {
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

    // 2. Proxy /api/shorts/*
    if (url.pathname.startsWith("/api/shorts")) {
      const cleanSubpath = url.pathname.replace(/^\/api\/shorts\/?/, "");
      let normalized = cleanSubpath;
      if (!normalized.startsWith("/") && !normalized.startsWith("?")) {
        normalized = "/" + normalized;
      }
      if (normalized.startsWith("?")) {
        normalized = "/?" + normalized.slice(1);
      }
      const [pathname, search] = normalized.split("?");
      const safePath = pathname.endsWith("/") ? pathname : `${pathname}/`;
      const queryString = url.search || (search ? `?${search}` : "");
      const targetUrl = `https://viralxxxporn.com/api/shorts${safePath}${queryString}`;

      try {
        const upstreamResponse = await fetch(targetUrl, {
          method: request.method,
          headers: {
            accept: "application/json",
            "x-requested-with": "XMLHttpRequest",
            "user-agent":
              "Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36",
            referer: "https://viralxxxporn.com/short/trending/",
            origin: "https://viralxxxporn.com",
          },
          body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
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
          JSON.stringify({ error: "Failed to proxy shorts", message: err?.message }),
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

    // 3. Proxy /api/webcams/*
    if (url.pathname.startsWith("/api/webcams")) {
      const cleanSubpath = url.pathname.replace(/^\/api\/webcams\/?/, "");
      let normalized = cleanSubpath;
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
          body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
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
          JSON.stringify({ error: "Failed to proxy webcams", message: err?.message }),
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

    // 4. Proxy /api/cam-chat/*
    if (url.pathname.startsWith("/api/cam-chat")) {
      const subpath = url.pathname.replace(/^\/api\/cam-chat\/?/, "");
      const targetUrl = `https://viralxxxporn.cam/api/front/v2/models/${subpath}${url.search}`;

      try {
        const upstreamResponse = await fetch(targetUrl, {
          method: request.method,
          headers: {
            accept: "application/json",
            "front-version": "12.1.36",
            "x-requested-with": "XMLHttpRequest",
            "user-agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36",
            referer: "https://viralxxxporn.cam/",
            origin: "https://viralxxxporn.cam",
          },
          body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
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

    // 5. Proxy /__viewer-country
    if (url.pathname === "/__viewer-country") {
      try {
        const upstreamResponse = await fetch("https://randomchat.now/__viewer-country", {
          headers: {
            referer: "https://randomchat.now/",
            origin: "https://randomchat.now",
            "user-agent":
              "Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36",
          },
        });
        const headers = new Headers(upstreamResponse.headers);
        headers.set("Access-Control-Allow-Origin", "*");
        return new Response(upstreamResponse.body, {
          status: upstreamResponse.status,
          headers,
        });
      } catch {
        return new Response(JSON.stringify({ country: "US" }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }
    }

    // 5. Proxy /shortify/*
    if (url.pathname.startsWith("/shortify")) {
      const rewrittenPath = url.pathname.replace(/^\/shortify/, "");
      const targetUrl = `https://mcrhjyszrxbtiizhgacn.supabase.co${rewrittenPath}${url.search}`;
      return fetch(targetUrl, request);
    }

    // 6. Serve static SPA assets from ./dist
    return env.ASSETS.fetch(request);
  },
};
