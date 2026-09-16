// Placeholder gambar sebagai SVG data URL (tanpa jaringan; aman offline). Dipakai mock untuk foto laporan, news, listing.
const palettes: Record<string, [string, string]> = {
  teal: ["#5fd3c6", "#1f9bb3"],
  navy: ["#1e3a5f", "#0f172a"],
  amber: ["#f5b335", "#d97706"],
  rose: ["#f472b6", "#be185d"],
  slate: ["#94a3b8", "#475569"],
  green: ["#86efac", "#15803d"],
  sky: ["#7dd3fc", "#0369a1"],
  violet: ["#c4b5fd", "#6d28d9"],
};

export function placeholder(label: string, palette: keyof typeof palettes = "teal", w = 640, h = 400): string {
  const [a, b] = palettes[palette] ?? palettes.teal;
  const esc = label.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>
<pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse"><circle cx="20" cy="20" r="1.5" fill="#fff" fill-opacity=".25"/></pattern></defs>
<rect width="${w}" height="${h}" fill="url(#g)"/><rect width="${w}" height="${h}" fill="url(#p)"/>
<g fill="#fff" fill-opacity=".18"><rect x="${w * 0.08}" y="${h * 0.45}" width="${w * 0.18}" height="${h * 0.5}" rx="6"/><rect x="${w * 0.3}" y="${h * 0.3}" width="${w * 0.14}" height="${h * 0.65}" rx="6"/><rect x="${w * 0.48}" y="${h * 0.5}" width="${w * 0.2}" height="${h * 0.45}" rx="6"/><rect x="${w * 0.72}" y="${h * 0.38}" width="${w * 0.16}" height="${h * 0.57}" rx="6"/></g>
<text x="${w / 2}" y="${h * 0.22}" text-anchor="middle" font-family="Nunito, Inter, sans-serif" font-size="${Math.round(h * 0.08)}" font-weight="700" fill="#fff" fill-opacity=".9">${esc}</text>
</svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
