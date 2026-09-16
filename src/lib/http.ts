// Klien HTTP BuildingVision (TAD 6.1): Bearer access token (dipersist untuk PWA standalone), refresh single-flight,
// error RFC 9457 problem+json, Idempotency-Key untuk POST create. Mengikuti buildingvision/web/src/lib/api.ts.
import { loadJSON, removeKey, saveJSON } from "./storage";

export interface Problem {
  type: string;
  title: string;
  status: number;
  detail?: string;
  code: string;
  errors?: { field: string; message: string }[];
  request_id?: string;
}

export class ApiError extends Error {
  problem: Problem;
  constructor(p: Problem) {
    super(p.detail || p.title);
    this.problem = p;
  }
  get status() {
    return this.problem.status;
  }
  get code() {
    return this.problem.code;
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

export function errorMessage(e: unknown, fallback = "Terjadi kesalahan. Coba lagi."): string {
  if (isApiError(e)) {
    if (e.problem.errors?.length) return e.problem.errors.map((x) => x.message).join(", ");
    return e.message || fallback;
  }
  if (e instanceof TypeError) return "Tidak dapat terhubung ke server. Periksa koneksi Anda.";
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}

export interface ListResponse<T> {
  data: T[];
  next_cursor: string | null;
}

export interface Tokens {
  access_token: string;
  refresh_token?: string;
}

type Listener = (t: Tokens | null) => void;

class TokenStore {
  private tokens: Tokens | null = loadJSON<Tokens | null>("tokens", null);
  private listeners = new Set<Listener>();
  get() {
    return this.tokens;
  }
  set(t: Tokens | null) {
    this.tokens = t;
    if (t) saveJSON("tokens", t);
    else removeKey("tokens");
    this.listeners.forEach((l) => l(t));
  }
  subscribe(l: Listener) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
}
export const tokenStore = new TokenStore();

let refreshing: Promise<boolean> | null = null;
let sessionExpiredHandler: () => void = () => {};
export function setSessionExpiredHandler(fn: () => void) {
  sessionExpiredHandler = fn;
}

async function refreshToken(): Promise<boolean> {
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const cur = tokenStore.get();
        const res = await fetch("/api/v1/auth/refresh", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ client: "tenant_app", refresh_token: cur?.refresh_token }),
        });
        if (!res.ok) {
          tokenStore.set(null);
          sessionExpiredHandler();
          return false;
        }
        const body = (await res.json()) as Tokens;
        tokenStore.set({ access_token: body.access_token, refresh_token: body.refresh_token ?? cur?.refresh_token });
        return true;
      } catch {
        return false;
      } finally {
        refreshing = null;
      }
    })();
  }
  return refreshing;
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  idempotencyKey?: string;
  ifMatch?: number;
  signal?: AbortSignal;
  retry?: boolean;
  auth?: boolean;
}

export function buildQuery(q?: RequestOptions["query"]): string {
  if (!q) return "";
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (v === undefined || v === null || v === "") continue;
    p.set(k, String(v));
  }
  const s = p.toString();
  return s ? "?" + s : "";
}

export async function http<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const url = (path.startsWith("/") ? path : "/api/v1/" + path) + buildQuery(opts.query);
  const headers: Record<string, string> = { Accept: "application/json", "X-App-Version": __APP_VERSION__, "X-Client": "tenant_app" };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  const tok = tokenStore.get();
  if (tok && opts.auth !== false) headers["Authorization"] = "Bearer " + tok.access_token;
  if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;
  if (opts.ifMatch !== undefined) headers["If-Match"] = `"${opts.ifMatch}"`;
  const res = await fetch(url, {
    method: opts.method || (opts.body !== undefined ? "POST" : "GET"),
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    credentials: "include",
    signal: opts.signal,
  });
  if (res.status === 401 && opts.retry !== false && !url.includes("/auth/") && opts.auth !== false) {
    if (await refreshToken()) return http<T>(path, { ...opts, retry: false });
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    const p = (json as Problem) || { type: "", title: res.statusText, status: res.status, code: "HTTP_" + res.status };
    throw new ApiError(p);
  }
  return json as T;
}
