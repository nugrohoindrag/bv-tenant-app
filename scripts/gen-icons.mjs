// Membuat ikon PWA (PNG 192/512 + maskable) tanpa dependensi: rasterisasi bentuk logo (atap "M" BuildingVision) ke PNG via zlib.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, "../public/icons");
fs.mkdirSync(out, { recursive: true });

const TEAL = [0x14, 0xa6, 0x9e];
const TEAL_DARK = [0x0e, 0x91, 0x87];
const WHITE = [255, 255, 255];

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x, y);
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

// Logo: dua "atap" (huruf M dari dua segitiga) putih di atas lingkaran/kotak teal — mengikuti ikon Figma.
function insideRoof(u, v, cx, cy, w, h, t) {
  // segitiga tanpa isi (outline tebal t) dengan puncak (cx, cy-h/2), alas di cy+h/2
  const dx = Math.abs(u - cx);
  const yTop = cy - h / 2 + (dx / (w / 2)) * h; // garis miring
  if (v < cy - h / 2 || v > cy + h / 2 || dx > w / 2) return false;
  const distSlope = Math.abs(v - yTop) * Math.cos(Math.atan2(h, w / 2));
  const outer = v >= yTop;
  return outer && distSlope <= t;
}
function logoPixel(size, maskable) {
  const cx = size / 2, cy = size / 2;
  const pad = maskable ? size * 0.1 : 0;
  const r = size / 2 - pad;
  const rad = maskable ? 0 : size * 0.22;
  return (x, y) => {
    const u = x + 0.5, v = y + 0.5;
    // bentuk latar: rounded square (normal) / penuh (maskable)
    let bg = true;
    if (!maskable) {
      const ax = Math.max(Math.abs(u - cx) - (r - rad), 0), ay = Math.max(Math.abs(v - cy) - (r - rad), 0);
      bg = Math.hypot(ax, ay) <= rad;
    }
    if (!bg) return [0, 0, 0, 0];
    const g = (v / size);
    const base = [Math.round(TEAL[0] * (1 - g) + TEAL_DARK[0] * g), Math.round(TEAL[1] * (1 - g) + TEAL_DARK[1] * g), Math.round(TEAL[2] * (1 - g) + TEAL_DARK[2] * g)];
    const s = maskable ? 0.62 : 0.78;
    const w = size * 0.36 * s, h = size * 0.30 * s, t = size * 0.055 * s;
    const left = insideRoof(u, v, cx - w * 0.42, cy + h * 0.05, w, h, t);
    const right = insideRoof(u, v, cx + w * 0.42, cy + h * 0.05, w, h, t);
    const door = Math.abs(u - (cx + w * 0.42)) <= t * 0.55 && v >= cy + h * 0.05 - t && v <= cy + h * 0.55;
    if (left || right || door) return [...WHITE, 255];
    return [...base, 255];
  };
}

for (const [name, size, maskable] of [["icon-192.png", 192, false], ["icon-512.png", 512, false], ["icon-maskable-512.png", 512, true]]) {
  fs.writeFileSync(path.join(out, name), png(size, logoPixel(size, maskable)));
  console.log("wrote", name);
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14A69E"/><stop offset="1" stop-color="#0E9187"/></linearGradient></defs><rect width="512" height="512" rx="112" fill="url(#g)"/><path d="M118 300 L196 196 L274 300 M238 300 L316 196 L394 300 M394 300 V236" fill="none" stroke="#fff" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
fs.writeFileSync(path.join(out, "icon.svg"), svg);
console.log("wrote icon.svg");
