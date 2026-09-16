// Penyimpanan lokal aman (try/catch: private mode / kuota). Prefix agar tidak bentrok dengan app lain di origin yang sama.
const PREFIX = "bvt:";

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export function loadJSON<T>(key: string, fallback: T): T {
  return safe(() => {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  }, fallback);
}

export function saveJSON(key: string, value: unknown) {
  safe(() => localStorage.setItem(PREFIX + key, JSON.stringify(value)), undefined);
}

export function removeKey(key: string) {
  safe(() => localStorage.removeItem(PREFIX + key), undefined);
}

export function loadSession<T>(key: string, fallback: T): T {
  return safe(() => {
    const raw = sessionStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  }, fallback);
}

export function saveSession(key: string, value: unknown) {
  safe(() => sessionStorage.setItem(PREFIX + key, JSON.stringify(value)), undefined);
}

export function removeSession(key: string) {
  safe(() => sessionStorage.removeItem(PREFIX + key), undefined);
}
