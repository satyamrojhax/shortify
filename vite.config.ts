import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import { Readable } from "node:stream";
import { proxyVideo } from "./proxy/video-proxy-core";

/**
 * Dev-only: serves /api/video-proxy (in production this is a Vercel Edge /
 * Cloudflare Pages function). Lets the offline downloader read video bytes
 * from the CDN, which has no CORS headers.
 */
function videoProxyDev(): Plugin {
  return {
    name: "video-proxy-dev",
    configureServer(server) {
      server.middlewares.use("/api/video-proxy", async (req, res) => {
        const abort = new AbortController();
        res.on("close", () => abort.abort());
        try {
          const headers = new Headers();
          if (req.headers.range) headers.set("range", String(req.headers.range));
          const request = new Request(`http://localhost${req.originalUrl ?? req.url ?? ""}`, {
            method: req.method,
            headers,
            signal: abort.signal,
          });
          const response = await proxyVideo(request);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          if (!response.body) return res.end();
          const stream = Readable.fromWeb(response.body as never);
          stream.on("error", () => res.destroy());
          stream.pipe(res);
        } catch {
          if (!res.headersSent) res.statusCode = 502;
          res.end();
        }
      });
    },
  };
}

export default defineConfig({
  server: {
    proxy: {
      '/shortify': {
        target: 'https://mcrhjyszrxbtiizhgacn.supabase.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/shortify/, '')
      }
    }
  },
  plugins: [TanStackRouterVite(), react(), tailwindcss(), videoProxyDev()],
  // Vite 8+ natively supports tsconfig path aliases — no plugin needed
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    target: "esnext",
    // Use Vite 8's native oxc minifier (esbuild is no longer bundled by default)
    minify: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Manually split vendor chunks for better long-term CDN caching
        manualChunks(id) {
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) {
            return "react-vendor";
          }
          if (id.includes("node_modules/@tanstack")) {
            return "tanstack-vendor";
          }
          if (id.includes("node_modules/@radix-ui")) {
            return "radix-vendor";
          }
          if (id.includes("node_modules/lucide-react")) {
            return "icons-vendor";
          }
        },
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
  },
  // Optimise pre-bundling to speed up cold dev starts
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "@tanstack/react-query",
      "@tanstack/react-router",
      "lucide-react",
      "canvas-confetti",
    ],
  },
});
