// Push notification Tenant App (PRD P3 v2.1 §6.2, D-P3-04): Web Push (VAPID) untuk PWA + FCM untuk APK Capacitor, satu rule &
// preferensi di server (P3-PSH-04). Registrasi perangkat: POST /me/devices — web mengirim subscription {endpoint, keys}; native
// mengirim token FCM (P3-PSH-03, B-10). Server menentukan `app` (tenant) & user agent sendiri; field lain akan ditolak.
//
// Native: `PushNotifications.register()` memanggil FirebaseMessaging secara native dan membuat app CRASH bila Firebase belum
// dikonfigurasi (tanpa google-services.json) — try/catch JS tidak dapat menangkapnya. Karena itu push native hanya aktif bila
// build menandai FCM terkonfigurasi (__FCM_CONFIGURED__, lihat vite.config.ts); selebihnya tetap dibungkus try/catch.
import { useCallback, useEffect, useState } from "react";
import { api } from "@/api";
import { isNative, platform } from "./native";
import { loadJSON, removeKey, saveJSON } from "./storage";

export type PushSupport = "web" | "native" | "unsupported";
export type PushPermission = "granted" | "denied" | "default" | "unsupported";

/** Kanal Android untuk notifikasi tenant (sama dengan payload FCM server: android.notification.channel_id). */
export const ANDROID_CHANNEL_ID = "bv_tenant";
const ENABLED_KEY = "push-enabled";
const TOKEN_KEY = "push-token";
const BANNER_KEY = "push-banner-dismissed";

const fcmEnv = import.meta.env.VITE_FCM_ENABLED;
/** FCM siap untuk build ini: VITE_FCM_ENABLED (true/false) atau otomatis dari android/app/google-services.json saat build. */
export const FCM_CONFIGURED: boolean = fcmEnv ? fcmEnv === "true" : typeof __FCM_CONFIGURED__ !== "undefined" && __FCM_CONFIGURED__;

export class PushError extends Error {}

export function pushSupport(): PushSupport {
  if (isNative) return FCM_CONFIGURED ? "native" : "unsupported";
  if (typeof window === "undefined" || typeof navigator === "undefined") return "unsupported";
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window ? "web" : "unsupported";
}

/** iPhone/iPad di Safari tanpa install: Web Push baru tersedia setelah PWA dipasang ke Layar Utama (iOS 16.4+). */
export function iosNeedsInstall(): boolean {
  if (isNative || typeof navigator === "undefined") return false;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const standalone = typeof window !== "undefined" && (window.matchMedia?.("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true);
  return ios && !standalone;
}

export function pushEnabledLocally(): boolean {
  return loadJSON<boolean>(ENABLED_KEY, false);
}

export function pushBannerDismissed(): boolean {
  return loadJSON<boolean>(BANNER_KEY, false);
}

export function dismissPushBanner() {
  saveJSON(BANNER_KEY, true);
}

export function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function sameKey(a: ArrayBuffer | null | undefined, b: Uint8Array): boolean {
  if (!a) return false;
  const x = new Uint8Array(a);
  return x.length === b.length && x.every((v, i) => v === b[i]);
}

function webPermission(): PushPermission {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

async function swRegistration(timeoutMs = 8000): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing?.active) return existing;
  return Promise.race([navigator.serviceWorker.ready, new Promise<null>((r) => setTimeout(() => r(null), timeoutMs))]);
}

/** Subscription Web Push → POST /me/devices (hanya endpoint + keys; `expirationTime` dsb. tidak dikirim). */
async function registerWebSubscription(sub: PushSubscription) {
  const j = sub.toJSON();
  const p256dh = j.keys?.p256dh;
  const auth = j.keys?.auth;
  if (!p256dh || !auth) throw new PushError("Subscription push tidak lengkap.");
  await api().registerDevice({ platform: "web", subscription: { endpoint: sub.endpoint, keys: { p256dh, auth } }, app_version: __APP_VERSION__ });
  saveJSON(TOKEN_KEY, sub.endpoint);
  saveJSON(ENABLED_KEY, true);
}

async function subscribeWeb(reg: ServiceWorkerRegistration): Promise<PushSubscription> {
  const cfg = await api().pushConfig();
  if (!cfg.web_push.enabled || !cfg.web_push.public_key) throw new PushError("Notifikasi push belum diaktifkan di server.");
  const key = urlBase64ToUint8Array(cfg.web_push.public_key);
  let sub = await reg.pushManager.getSubscription();
  if (sub && !sameKey(sub.options.applicationServerKey, key)) {
    await sub.unsubscribe(); // kunci VAPID server berganti
    sub = null;
  }
  return sub ?? reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
}

async function enableWeb() {
  // requestPermission harus dipanggil dari gesture pengguna (tombol "Aktifkan")
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new PushError(perm === "denied" ? "Izin notifikasi ditolak. Aktifkan lewat pengaturan situs di browser." : "Izin notifikasi belum diberikan.");
  const reg = await swRegistration();
  if (!reg) throw new PushError("Service worker belum aktif. Muat ulang aplikasi lalu coba lagi.");
  await registerWebSubscription(await subscribeWeb(reg));
}

async function nativePlugin() {
  const { PushNotifications } = await import("@capacitor/push-notifications");
  return PushNotifications;
}

type NativePN = Awaited<ReturnType<typeof nativePlugin>>;

/** register() → tunggu event `registration` (token FCM) atau `registrationError`. */
function registerNativeToken(PN: NativePN): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    let done = false;
    const handles: Promise<{ remove: () => Promise<void> }>[] = [];
    const finish = (fn: () => void) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      for (const h of handles) h.then((x) => x.remove()).catch(() => {});
      fn();
    };
    const timer = setTimeout(() => finish(() => reject(new PushError("Registrasi push melebihi batas waktu."))), 15_000);
    handles.push(PN.addListener("registration", (t) => finish(() => resolve(t.value))));
    handles.push(PN.addListener("registrationError", (e) => finish(() => reject(new PushError("Registrasi push gagal: " + e.error)))));
    PN.register().catch((e: unknown) => finish(() => reject(e instanceof Error ? e : new PushError("Registrasi push gagal."))));
  });
}

async function registerNative(PN: NativePN) {
  if (platform === "android") await PN.createChannel({ id: ANDROID_CHANNEL_ID, name: "BuildingVision Tenant", description: "Update permintaan, tagihan, paket, parkir, dan pengumuman", importance: 4, visibility: 1 }).catch(() => {});
  const token = await registerNativeToken(PN);
  await api().registerDevice({ platform: platform === "ios" ? "ios" : "android", token, app_version: __APP_VERSION__ });
  saveJSON(TOKEN_KEY, token);
  saveJSON(ENABLED_KEY, true);
}

async function enableNative() {
  if (!FCM_CONFIGURED) throw new PushError("Notifikasi push belum dikonfigurasi untuk aplikasi ini.");
  const PN = await nativePlugin();
  let perm = await PN.checkPermissions();
  if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") perm = await PN.requestPermissions();
  if (perm.receive !== "granted") throw new PushError("Izin notifikasi ditolak. Aktifkan lewat pengaturan aplikasi.");
  await registerNative(PN);
}

/** Aktifkan push di perangkat ini (dipanggil dari tombol; meminta izin bila perlu). */
export async function enablePush(): Promise<void> {
  const s = pushSupport();
  if (s === "web") return enableWeb();
  if (s === "native") return enableNative();
  throw new PushError(iosNeedsInstall() ? "Di iPhone, pasang aplikasi ke Layar Utama terlebih dahulu untuk menerima notifikasi." : "Perangkat/browser ini belum mendukung notifikasi push.");
}

/**
 * Nonaktifkan push di perangkat ini: hapus perangkat di server (DELETE /me/devices) lalu lepas subscription lokal.
 * Dipanggil juga saat logout — sebelum token sesi dihapus — agar akun sebelumnya tidak menerima push di perangkat ini.
 */
export async function disablePush(): Promise<void> {
  const token = loadJSON<string | null>(TOKEN_KEY, null);
  try {
    if (token) await api().unregisterDevice(token);
  } finally {
    removeKey(TOKEN_KEY);
    saveJSON(ENABLED_KEY, false);
    try {
      if (!isNative) {
        const reg = typeof navigator !== "undefined" && "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        await sub?.unsubscribe();
      } else if (FCM_CONFIGURED) {
        await (await nativePlugin()).unregister();
      }
    } catch {
      // subscription lokal gagal dilepas: server sudah tidak mengirim ke perangkat ini
    }
  }
}

/**
 * Sinkron saat aplikasi dibuka (sudah login): bila push pernah diaktifkan di perangkat ini, daftarkan ulang subscription/token
 * (upsert di server) agar rotasi endpoint/token FCM tetap tercatat. Tidak pernah memunculkan dialog izin.
 */
export async function syncPush(): Promise<void> {
  if (!pushEnabledLocally()) return;
  const s = pushSupport();
  try {
    if (s === "web") {
      if (webPermission() !== "granted") {
        saveJSON(ENABLED_KEY, false);
        return;
      }
      const reg = await swRegistration();
      if (reg) await registerWebSubscription(await subscribeWeb(reg));
    } else if (s === "native") {
      const PN = await nativePlugin();
      if ((await PN.checkPermissions()).receive !== "granted") {
        saveJSON(ENABLED_KEY, false);
        return;
      }
      await registerNative(PN);
    }
  } catch {
    // jaringan/izin: coba lagi pada pembukaan berikutnya
  }
}

export interface PushHandlers {
  /** Tap notifikasi → buka deep link (sudah divalidasi pemanggil). */
  onOpen(link: string, notificationId?: string): void;
  /** Push tiba saat aplikasi terbuka → segarkan badge/inbox. */
  onReceive?(): void;
}

/** Pasang listener tap/terima push sedini mungkin (event tap yang meluncurkan app ditahan plugin sampai listener terpasang). */
export function initPushHandlers(h: PushHandlers) {
  if (isNative) {
    if (!FCM_CONFIGURED) return;
    void nativePlugin()
      .then((PN) => {
        void PN.addListener("pushNotificationActionPerformed", (a) => {
          const d = (a.notification.data ?? {}) as Record<string, unknown>;
          h.onOpen(typeof d.deep_link === "string" && d.deep_link ? d.deep_link : "/inbox", typeof d.notification_id === "string" ? d.notification_id : undefined);
        });
        void PN.addListener("pushNotificationReceived", () => h.onReceive?.());
      })
      .catch(() => {});
    return;
  }
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", (e: MessageEvent) => {
      const d = e.data as { type?: string; url?: string; notification_id?: string } | null;
      if (d?.type === "BV_PUSH_NAVIGATE") h.onOpen(d.url || "/inbox", d.notification_id);
      else if (d?.type === "BV_PUSH_RECEIVED") h.onReceive?.();
    });
  }
}

/** State push untuk UI (Home banner, Akun, Preferensi notifikasi). */
export function usePush() {
  const support = pushSupport();
  const [enabled, setEnabled] = useState<boolean>(() => pushEnabledLocally());
  const [permission, setPermission] = useState<PushPermission>(() => (support === "web" ? webPermission() : support === "native" ? "default" : "unsupported"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (support !== "native") return;
    let alive = true;
    nativePlugin()
      .then((PN) => PN.checkPermissions())
      .then((p) => alive && setPermission(p.receive === "granted" ? "granted" : p.receive === "denied" ? "denied" : "default"))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [support]);

  const enable = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await enablePush();
      setEnabled(true);
      setPermission("granted");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengaktifkan notifikasi.");
      if (support === "web") setPermission(webPermission());
      return false;
    } finally {
      setBusy(false);
    }
  }, [support]);

  const disable = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await disablePush();
    } catch {
      // perangkat lokal tetap dinonaktifkan
    } finally {
      setEnabled(false);
      setBusy(false);
    }
  }, []);

  return { support, enabled, permission, busy, error, enable, disable, iosNeedsInstall: iosNeedsInstall(), nativeUnconfigured: isNative && !FCM_CONFIGURED };
}
