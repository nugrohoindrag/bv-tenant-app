import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import fs from "node:fs";
import path from "node:path";

// Tenant App = PWA (keputusan user 15 Sep 2026). Stack mengikuti buildingvision/web (React 19 SPA, Vite, Tailwind v4);
// proxy /api & /public ke backend Go saat dev. Service worker: injectManifest (src/sw.ts — cache sama dengan generateSW
// sebelumnya + handler Web Push, PRD P3 v2.1 P3-PSH-01) + prompt update.
const apiTarget = process.env.BV_API_URL || "http://localhost:8080";

// Push native (FCM, P3-PSH-02) hanya aktif bila build memiliki konfigurasi Firebase: tanpa google-services.json,
// PushNotifications.register() membuat app Android crash di sisi native (tidak dapat ditangkap JS). VITE_FCM_ENABLED
// (true/false di .env) menimpa deteksi ini — lihat src/lib/push.ts.
const fcmConfigured = fs.existsSync(path.resolve(import.meta.dirname, "android/app/google-services.json"));

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "prompt",
      injectRegister: false,
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
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        rollupFormat: "iife",
      },
      devOptions: { enabled: false },
    }),
  ],
  define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version || "0.1.0"), __FCM_CONFIGURED__: JSON.stringify(fcmConfigured) },
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  server: {
    port: 5174,
    proxy: {
      "/api": { target: apiTarget, changeOrigin: true },
      "/public": { target: apiTarget, changeOrigin: true },
    },
  },
  // `vite preview --host`: uji build produksi/TWA dari perangkat lain di LAN, tetap memproxy API ke backend
  preview: {
    port: 4173,
    allowedHosts: [".trycloudflare.com"], // uji TWA lewat Cloudflare quick tunnel (HTTPS)
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
