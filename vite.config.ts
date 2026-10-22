import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

export default defineConfig({
  server: {
    proxy: {
      "/__viewer-country": {
        target: "https://randomchat.now",
        changeOrigin: true,
        headers: {
          referer: "https://randomchat.now/",
          origin: "https://randomchat.now",
          "user-agent":
            "Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Mobile Safari/537.36",
        },
      },
      "/api/webcams": {
        target: "https://viralxxxporn.com",
        changeOrigin: true,
        headers: {
          referer: "https://viralxxxporn.com/live/",
          origin: "https://viralxxxporn.com",
          "user-agent":
            "Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Mobile Safari/537.36",
          "x-requested-with": "XMLHttpRequest",
          cookie: "kt_tcookie=1; kt_is_visited=1; kt_qparams=type%3Dwebcams",
        },
      },
      "/api/shorts": {
        target: "https://viralxxxporn.com",
        changeOrigin: true,
        headers: {
          referer: "https://viralxxxporn.com/short/trending/",
          origin: "https://viralxxxporn.com",
          "user-agent":
            "Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Mobile Safari/537.36",
          "x-requested-with": "XMLHttpRequest",
          cookie:
            "PHPSESSID=6ivn23fkgp41b8vttac1ts5ki1; kt_qparams=page%3D1; kt_tcookie=1; kt_is_visited=1",
        },
      },
      "/shortify": {
        target: "https://mcrhjyszrxbtiizhgacn.supabase.co",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/shortify/, ""),
      },
    },
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
