# BuildingVision Tenant App (PWA)

Progressive Web App untuk tenant / penghuni gedung: laporan keluhan (Service Request) dengan foto & tracking, booking fasilitas, registrasi tamu, tagihan, pengumuman, dan inbox. Dapat dipasang ke layar utama (Android/iOS/desktop) dan tetap menampilkan data terakhir saat offline. Backend: BuildingVision API (`/api/v1/tenant/*`) di repo `bv-dashboard`.

## Stack

React 19 · Vite 8 · TypeScript · Tailwind v4 · TanStack Query · React Router 7 · zod · lucide-react · vite-plugin-pwa (Workbox).

## Struktur

```text
src/
├── app/            # router (guard auth), AuthProvider (sesi + refresh token), prompt update SW, indikator offline
├── api/            # TenantApi + tipe respons backend; adapter http/ (mode utama) dan mock/ (demo tanpa backend)
├── components/     # komponen UI (Button, Field, Shell, Sheet, Toast, ...), ilustrasi, ikon kategori
├── features/       # onboarding, auth, home, report, history, facilities, visitors, bills, inbox, account, announcements
├── lib/            # http client (Bearer + refresh, problem+json), format Indonesia, storage, status-map (generated)
└── styles/         # theme.css (Tailwind @theme) + tokens.css (generated dari design tokens backend)
scripts/            # gen-contracts.mjs (token + status map dari repo backend), gen-icons.mjs (ikon PWA)
public/             # manifest & ikon
```

## Menjalankan

```bash
npm install --legacy-peer-deps
cp .env.example .env
npm run dev                      # http://localhost:5174 (proxy /api & /public → BV_API_URL)
```

Variabel environment (lihat `.env.example`):

| Variabel | Keterangan |
|---|---|
| `VITE_API_MODE` | `http` = backend BuildingVision (mode utama) · `mock` = data lokal untuk demo/uji layout tanpa backend |
| `VITE_ORG_SLUG` | slug organization yang dilayani (registrasi mandiri & endpoint publik) |
| `VITE_INTAKE_KEY` | kunci public intake property (opsional) |
| `BV_API_URL` | target proxy dev untuk `/api` dan `/public` (default `http://localhost:8080`) |

Akun tenant dibuat oleh Tenant Relation di dashboard atau lewat registrasi mandiri di aplikasi (menunggu validasi).

## Perintah

| Area | Perintah |
|---|---|
| Typecheck | `npm run typecheck` |
| Test (vitest, jsdom) | `npm test` |
| Lint | `npm run lint` |
| Build produksi + service worker | `npm run build` → `dist/` |
| Preview build (uji install PWA) | `npm run preview` |
| Sinkron token & status map dari repo backend | `npm run gen` (mengharapkan repo `bv-dashboard` di `../buildingvision`) |
| Regenerasi ikon PWA | `npm run icons` |

## Deploy

Static hosting (Caddy/Nginx/S3 + CDN) dengan fallback SPA ke `index.html`, **HTTPS** (syarat service worker & install), dipasang di path root `/`. Reverse-proxy `/api` dan `/public` ke BuildingVision API, dan set `Cache-Control: no-cache` untuk `/sw.js`. Untuk listing Play Store dapat dibungkus TWA (Bubblewrap) tanpa perubahan kode.

## Catatan

- Status Service Request mengikuti `contracts/status-map.yaml` backend (label Indonesia); transisi divalidasi server dan client hanya menampilkan `allowed_actions`.
- Foto dikompres di browser (≤1600 px, JPEG q0.8) sebelum diunggah.
- Pembayaran online belum aktif; tagihan dibayar manual dan diverifikasi Finance.
