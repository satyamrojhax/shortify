import { defineConfig, type ProxyOptions } from "vite";
import type * as http from "node:http";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

const proxyConfig: Record<string, ProxyOptions> = {
  "/__viewer-country": {
    target: "https://randomchat.now",
    changeOrigin: true,
    headers: {
      referer: "https://randomchat.now/",
      origin: "https://randomchat.now",
      "user-agent":
        "Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36",
    },
  },
  "/api/webcams": {
    target: "https://viralxxxporn.com",
    changeOrigin: true,
    secure: false,
    followRedirects: true,
    rewrite: (path: string) => path.replace(/^\/api\/webcams(?!\/)/, "/api/webcams/"),
    headers: {
      referer: "https://viralxxxporn.com/live/",
      origin: "https://viralxxxporn.com",
      host: "viralxxxporn.com",
      "user-agent":
        "Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36",
      "x-requested-with": "XMLHttpRequest",
      accept: "application/json",
    },
    configure: (proxy) => {
      proxy.on("proxyReq", (proxyReq: http.ClientRequest) => {
        proxyReq.setHeader("host", "viralxxxporn.com");
        proxyReq.setHeader("referer", "https://viralxxxporn.com/live/");
        proxyReq.setHeader("origin", "https://viralxxxporn.com");
      });
      proxy.on("proxyRes", (proxyRes: http.IncomingMessage) => {
        proxyRes.headers["access-control-allow-origin"] = "*";
        proxyRes.headers["access-control-allow-methods"] = "GET, HEAD, OPTIONS";
        proxyRes.headers["access-control-allow-headers"] = "*";
      });
    },
  },
  "/api/shorts": {
    target: "https://viralxxxporn.com",
    changeOrigin: true,
    secure: false,
    followRedirects: true,
    rewrite: (path: string) => path.replace(/^\/api\/shorts(?!\/)/, "/api/shorts/"),
    headers: {
      referer: "https://viralxxxporn.com/short/trending/",
      origin: "https://viralxxxporn.com",
      host: "viralxxxporn.com",
      "user-agent":
        "Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36",
      "x-requested-with": "XMLHttpRequest",
      accept: "application/json",
    },
    configure: (proxy) => {
      proxy.on("proxyReq", (proxyReq: http.ClientRequest) => {
        proxyReq.setHeader("host", "viralxxxporn.com");
        proxyReq.setHeader("referer", "https://viralxxxporn.com/short/trending/");
        proxyReq.setHeader("origin", "https://viralxxxporn.com");
      });
      proxy.on("proxyRes", (proxyRes: http.IncomingMessage) => {
        proxyRes.headers["access-control-allow-origin"] = "*";
        proxyRes.headers["access-control-allow-methods"] = "GET, HEAD, OPTIONS";
        proxyRes.headers["access-control-allow-headers"] = "*";
      });
    },
  },
  "/api/cam-chat": {
    target: "https://viralxxxporn.cam",
    changeOrigin: true,
    secure: false,
    rewrite: (path: string) => path.replace(/^\/api\/cam-chat/, "/api/front/v2/models"),
    headers: {
      referer: "https://viralxxxporn.cam/",
      origin: "https://viralxxxporn.cam",
      host: "viralxxxporn.cam",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36",
      "x-requested-with": "XMLHttpRequest",
      accept: "application/json",
      "front-version": "12.1.36",
    },
    configure: (proxy) => {
      proxy.on("proxyReq", (proxyReq: http.ClientRequest) => {
        proxyReq.setHeader("host", "viralxxxporn.cam");
        proxyReq.setHeader("referer", "https://viralxxxporn.cam/");
        proxyReq.setHeader("origin", "https://viralxxxporn.cam");
      });
      proxy.on("proxyRes", (proxyRes: http.IncomingMessage) => {
        proxyRes.headers["access-control-allow-origin"] = "*";
        proxyRes.headers["access-control-allow-methods"] = "GET, HEAD, OPTIONS";
        proxyRes.headers["access-control-allow-headers"] = "*";
      });
    },
  },
  "/shortify": {
    target: "https://mcrhjyszrxbtiizhgacn.supabase.co",
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/shortify/, ""),
  },
};

export default defineConfig({
  server: {
    proxy: proxyConfig,
    watch: {
      ignored: ["**/*.glb", "**/public/3d animted/**", "**/public/models/**"],
    },
  },
  preview: {
    proxy: proxyConfig,
  },
  plugins: [TanStackRouterVite({ autoCodeSplitting: true }), react(), tailwindcss()],
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
