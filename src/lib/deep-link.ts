// Deep link notifikasi tenant (server `notification/tenant.go` renderTenant; payload push `deep_link`) → route PWA.
// B-01: setiap deep link harus membuka halaman yang ada. Path lama dipetakan (/profile → /account, /home → /), path asing →
// fallback Inbox. URL absolut diambil path-nya saja (navigasi selalu di dalam aplikasi).
import { matchRoutes } from "react-router-dom";
import { routes } from "@/app/routes";

const LEGACY: Record<string, string> = { "/profile": "/account", "/home": "/" };

/** true bila path cocok dengan route aplikasi selain catch-all 404. */
export function isAppRoute(path: string): boolean {
  const m = matchRoutes(routes, path);
  if (!m?.length) return false;
  return m[m.length - 1].route.path !== "*";
}

export function resolveDeepLink(link: string | null | undefined, fallback = "/inbox"): string {
  if (!link) return fallback;
  let s = link.trim();
  if (/^https?:\/\//i.test(s)) {
    try {
      const u = new URL(s);
      s = u.pathname + u.search + u.hash;
    } catch {
      return fallback;
    }
  }
  if (!s.startsWith("/") || s.startsWith("//")) return fallback;
  const cut = s.search(/[?#]/);
  const rawPath = cut >= 0 ? s.slice(0, cut) : s;
  const rest = cut >= 0 ? s.slice(cut) : "";
  const path = rawPath.length > 1 ? rawPath.replace(/\/+$/, "") : rawPath;
  const mapped = LEGACY[path] ?? path;
  return isAppRoute(mapped) ? mapped + rest : fallback;
}
