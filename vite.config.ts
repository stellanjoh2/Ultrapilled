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
    include: ["gsap"],
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
