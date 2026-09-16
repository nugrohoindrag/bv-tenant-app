/// <reference types="vite/client" />
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_API_MODE?: "mock" | "http";
  readonly VITE_ORG_SLUG?: string;
  readonly VITE_INTAKE_KEY?: string;
  readonly VITE_API_BASE?: string;
}
