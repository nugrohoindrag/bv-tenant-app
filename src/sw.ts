/// <reference lib="webworker" />
// Service worker Tenant PWA (vite-plugin-pwa injectManifest). Perilaku cache sama dengan konfigurasi generateSW sebelumnya
// (precache aset build, fallback navigasi SPA, NetworkFirst API tenant, cache gambar & font) + Web Push (PRD P3 v2.1 P3-PSH-01):
// event `push` menampilkan notifikasi dari payload server {notification_id, title, body, deep_link, severity, tag};
// `notificationclick` memfokuskan/membuka aplikasi pada deep link. Update tetap mode prompt (SKIP_WAITING dari UI).
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute, type PrecacheEntry } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: (PrecacheEntry | string)[] };

// ---- update (registerType: prompt): SW baru menunggu sampai pengguna menekan "Perbarui" ----
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") void self.skipWaiting();
});

// ---- precache & fallback navigasi SPA ----
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
registerRoute(new NavigationRoute(createHandlerBoundToURL("index.html"), { denylist: [/^\/api\//, /^\/public\//] }));

// ---- runtime cache ----
registerRoute(
  ({ url, request }) => request.method === "GET" && (url.pathname.startsWith("/api/v1/tenant/") || url.pathname.startsWith("/api/v1/service-request-categories")),
  new NetworkFirst({ cacheName: "bv-tenant-api", networkTimeoutSeconds: 6, plugins: [new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 })] }),
);
registerRoute(({ request }) => request.destination === "image", new StaleWhileRevalidate({ cacheName: "bv-tenant-img", plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 14 })] }));
registerRoute(/^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i, new CacheFirst({ cacheName: "bv-fonts", plugins: [new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 })] }));

// ---- Web Push ----
interface PushPayload {
  notification_id?: string;
  title?: string;
  body?: string;
  deep_link?: string;
  severity?: string;
  tag?: string;
}

/** Hanya path internal aplikasi (bukan URL asing / protocol-relative). */
function safePath(u: string | undefined): string {
  return u && u.startsWith("/") && !u.startsWith("//") ? u : "/inbox";
}

self.addEventListener("push", (event) => {
  let data: PushPayload = {};
  try {
    data = (event.data?.json() as PushPayload | null) ?? {};
  } catch {
    data = { body: event.data?.text() };
  }
  const tag = data.tag || data.notification_id;
  const options: NotificationOptions & { renotify?: boolean } = {
    body: data.body ?? "",
    icon: "/icons/icon-192.png",
    tag,
    // tag server = `object_type:object_id` (dipakai apa adanya): notifikasi baru untuk object yang sama menggantikan yang lama
    // tetapi tetap berbunyi; object berbeda tidak saling menimpa
    renotify: !!tag,
    requireInteraction: data.severity === "critical",
    data: { url: safePath(data.deep_link), notification_id: data.notification_id },
  };
  event.waitUntil(
    (async () => {
      await self.registration.showNotification(data.title || "BuildingVision", options);
      // aplikasi yang sedang terbuka menyegarkan badge Inbox
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of clients) c.postMessage({ type: "BV_PUSH_RECEIVED", notification_id: data.notification_id });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const d = (event.notification.data ?? {}) as { url?: string; notification_id?: string };
  const path = safePath(d.url);
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const client = clients.find((c) => new URL(c.url).origin === self.location.origin);
      if (client) {
        await client.focus();
        // navigasi di dalam SPA (tanpa reload) + tandai notifikasi dibaca
        client.postMessage({ type: "BV_PUSH_NAVIGATE", url: path, notification_id: d.notification_id });
        return;
      }
      await self.clients.openWindow(path);
    })(),
  );
});
