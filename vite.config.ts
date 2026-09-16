import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

// Tenant App = PWA (keputusan user 15 Sep 2026). Stack mengikuti buildingvision/web (React 19 SPA, Vite, Tailwind v4);
// proxy /api & /public ke backend Go saat dev. Service worker: generateSW (workbox) + prompt update.
const apiTarget = process.env.BV_API_URL || "http://localhost:8080";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icons/*.svg", "icons/*.png"],
      manifest: {
        id: "/",
        name: "BuildingVision Tenant",
        short_name: "BV Tenant",
        description: "Layanan tenant: laporan keluhan, tracking, berita gedung, tagihan.",
        lang: "id",
        dir: "ltr",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#F5F7FA",
        theme_color: "#14A69E",
        categories: ["lifestyle", "utilities"],
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          { src: "icons/icon.svg", sizes: "any", type: "image/svg+xml" },
        ],
        shortcuts: [
          { name: "Report an Issue", short_name: "Ticket", url: "/report/location", icons: [{ src: "icons/icon-192.png", sizes: "192x192" }] },
          { name: "Riwayat", short_name: "Riwayat", url: "/history", icons: [{ src: "icons/icon-192.png", sizes: "192x192" }] },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//, /^\/public\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url, request }) =>
              request.method === "GET" && (url.pathname.startsWith("/api/v1/tenant/") || url.pathname.startsWith("/api/v1/service-request-categories")),
            handler: "NetworkFirst",
            options: { cacheName: "bv-tenant-api", networkTimeoutSeconds: 6, expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 } },
          },
          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "StaleWhileRevalidate",
            options: { cacheName: "bv-tenant-img", expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 14 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: { cacheName: "bv-fonts", expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version || "0.1.0") },
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  server: {
    port: 5174,
    proxy: {
      "/api": { target: apiTarget, changeOrigin: true },
      "/public": { target: apiTarget, changeOrigin: true },
    },
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom") || id.includes("node_modules/react-router") || id.includes("node_modules/@tanstack/react-query")) return "vendor";
          return undefined;
        },
      },
    },
  },
  test: { environment: "jsdom", globals: true, setupFiles: ["./src/test/setup.ts"] },
});
