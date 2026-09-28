/// <reference types="vite/client" />
declare const __APP_VERSION__: string;
/** true bila push native (FCM) dikonfigurasi untuk build ini: android/app/google-services.json ada atau VITE_FCM_ENABLED=true. */
declare const __FCM_CONFIGURED__: boolean;

interface ImportMetaEnv {
  readonly VITE_API_MODE?: "mock" | "http";
  readonly VITE_ORG_SLUG?: string;
  readonly VITE_INTAKE_KEY?: string;
  readonly VITE_API_BASE?: string;
  /** Paksa push native (FCM) aktif/nonaktif; default: otomatis dari keberadaan android/app/google-services.json. */
  readonly VITE_FCM_ENABLED?: string;
  /** Nomor WhatsApp pengelola cadangan untuk layar login (bila belum pernah login di perangkat ini). */
  readonly VITE_SUPPORT_WHATSAPP?: string;
}
