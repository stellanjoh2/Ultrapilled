/// <reference types="vitest/config" />
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));

// https://ultrapilled.com — served at the domain root.
export default defineConfig({
  base: "/",
  resolve: {
    alias: {
      "@": path.resolve(root, "src"),
    },
  },
  optimizeDeps: {
    // Pre-bundle so a lazy export import does not trigger a Vite rebundle mid-export.
    include: [
      "gsap",
      "prores-wasm-encoder",
      "prores-wasm-encoder/parallel",
      "prores-wasm-encoder/mediabunny",
    ],
  },
  // Production Orby CORS only allows ultrapilled.com / orby.studio — proxy so
  // localhost POST stays same-origin and isn't blocked by the browser.
  server: {
    proxy: {
      "/api/bug-report": {
        target: "https://orby-gamma.vercel.app",
        changeOrigin: true,
      },
    },
  },
  plugins: [
    {
      name: "share-path-to-index",
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          const path = req.url?.split("?")[0] ?? "";
          if (/^\/r\/[A-Za-z0-9_-]{16,64}\/?$/.test(path)) {
            const qs = req.url?.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
            req.url = `/${qs}`;
          }
          next();
        });
      },
    },
  ],
  test: {
    environment: "happy-dom",
    include: ["src/**/*.test.ts"],
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(root, "index.html"),
        privacy: path.resolve(root, "privacy.html"),
        notFound: path.resolve(root, "404.html"),
      },
    },
  },
});
