// Ilustrasi vektor ringan (tanpa aset eksternal) mengikuti gaya Figma tenant: teal, karakter sederhana, blob latar.
import { cn } from "@/lib/utils";

const TEAL = "#3fc1b6";
const TEAL_DARK = "#1f9bb3";
const TEAL_SOFT = "#cdeeee";
const NAVY = "#252a48";
const SKIN = "#f6d3b8";
const SHIRT = "#ffffff";

/** Mark BuildingVision ("vision": lensa bersarang) — geometri sama dengan buildingvision/design-tokens/logo/mark.svg. */
export function Logo({ size = 48, className, color = "#0442B9" }: { size?: number; className?: string; color?: string }) {
  return (
    <svg width={size} height={Math.round((size * 260) / 362)} viewBox="0 0 362 260" className={className} aria-hidden>
      <path d="M6 130H62 M302 130H356 M62 130C110 -35 254 -35 302 130 M62 130C110 6 254 6 302 130 M62 130C110 46 254 46 302 130 M62 130C110 86 254 86 302 130 M62 130C110 295 254 295 302 130 M62 130C110 254 254 254 302 130 M62 130C110 214 254 214 302 130 M62 130C110 174 254 174 302 130" fill="none" stroke={color} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Siluet kota di bagian bawah layar (login/register). */
export function Cityscape({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 180" preserveAspectRatio="xMidYMax slice" className={cn("pointer-events-none w-full", className)} aria-hidden>
      <defs>
        <linearGradient id="city" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e5e7eb" stopOpacity="0" />
          <stop offset="1" stopColor="#d1d5db" stopOpacity="0.8" />
        </linearGradient>
      </defs>
      <g fill="url(#city)">
        <rect x="0" y="90" width="38" height="90" />
        <rect x="44" y="60" width="30" height="120" />
        <rect x="80" y="100" width="46" height="80" />
        <rect x="132" y="40" width="34" height="140" />
        <rect x="172" y="80" width="28" height="100" />
        <rect x="206" y="55" width="52" height="125" />
        <rect x="264" y="95" width="30" height="85" />
        <rect x="300" y="30" width="40" height="150" />
        <rect x="346" y="75" width="54" height="105" />
      </g>
      <g fill="#fff" fillOpacity="0.7">
        {Array.from({ length: 26 }, (_, i) => (
          <rect key={i} x={140 + (i % 3) * 8} y={52 + Math.floor(i / 3) * 12} width="4" height="6" />
        ))}
        {Array.from({ length: 24 }, (_, i) => (
          <rect key={"b" + i} x={308 + (i % 4) * 8} y={42 + Math.floor(i / 4) * 14} width="4" height="7" />
        ))}
      </g>
    </svg>
  );
}

/** Header Home: awan + skyline teal (Figma Home). */
export function HomeSkyline({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 420 200" preserveAspectRatio="xMidYMid slice" className={cn("pointer-events-none absolute inset-0 h-full w-full", className)} aria-hidden>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d9f3f1" />
          <stop offset="1" stopColor="#b9e6e6" />
        </linearGradient>
      </defs>
      <rect width="420" height="200" fill="url(#sky)" />
      <g fill="#fff" fillOpacity="0.9">
        <ellipse cx="60" cy="40" rx="70" ry="26" />
        <ellipse cx="120" cy="30" rx="60" ry="24" />
        <ellipse cx="330" cy="30" rx="80" ry="28" />
        <ellipse cx="390" cy="50" rx="60" ry="24" />
      </g>
      <g fill={TEAL} fillOpacity="0.55">
        <rect x="250" y="110" width="18" height="70" />
        <rect x="272" y="80" width="26" height="100" />
        <rect x="302" y="120" width="20" height="60" />
        <rect x="326" y="60" width="16" height="120" />
        <rect x="346" y="100" width="30" height="80" />
        <rect x="380" y="90" width="20" height="90" />
        <circle cx="330" cy="125" r="18" fill="none" stroke={TEAL} strokeWidth="3" />
      </g>
      <path d="M0 150 C 80 120, 140 190, 240 160 S 380 140, 420 170 V200 H0 Z" fill={TEAL} fillOpacity="0.35" />
    </svg>
  );
}

function Person({ x = 0, y = 0, scale = 1, mouth = "o" }: { x?: number; y?: number; scale?: number; mouth?: "o" | "smile" }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {/* rambut belakang */}
      <path d="M40 40 C 20 40, 14 70, 22 104 L 118 104 C 126 70, 120 40, 100 40 Z" fill={NAVY} />
      {/* leher & badan */}
      <rect x="62" y="96" width="16" height="16" fill={SKIN} />
      <path d="M30 150 C 30 118, 50 108, 70 108 C 90 108, 110 118, 110 150 L 116 200 H 24 Z" fill={SHIRT} stroke="#e5e7eb" strokeWidth="2" />
      {/* wajah */}
      <ellipse cx="70" cy="72" rx="28" ry="32" fill={SKIN} />
      <path d="M42 62 C 46 36, 94 36, 98 62 C 84 56, 60 56, 42 62 Z" fill={NAVY} />
      <circle cx="59" cy="72" r="3" fill={NAVY} />
      <circle cx="81" cy="72" r="3" fill={NAVY} />
      {mouth === "o" ? <ellipse cx="70" cy="88" rx="4" ry="5" fill={NAVY} /> : <path d="M60 86 Q 70 96 80 86" fill="none" stroke={NAVY} strokeWidth="3" strokeLinecap="round" />}
    </g>
  );
}

function Blob({ className }: { className?: string }) {
  return <path className={className} d="M20 90 C 40 20, 140 0, 220 30 S 340 60, 310 140 S 200 210, 120 190 S 0 160, 20 90 Z" fill={TEAL_SOFT} />;
}

/** Onboarding 1: "Living" — dua orang duduk dengan laptop. */
export function LivingIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 340 220" className={cn("w-full", className)} aria-hidden>
      <Blob />
      <rect x="60" y="150" width="220" height="10" rx="5" fill={TEAL_DARK} fillOpacity="0.5" />
      <g transform="translate(70 40) scale(0.45)">
        <Person mouth="smile" />
      </g>
      <g transform="translate(200 40) scale(0.45)">
        <Person />
      </g>
      <rect x="140" y="120" width="60" height="34" rx="4" fill={NAVY} />
      <rect x="146" y="126" width="48" height="22" rx="2" fill="#dbeafe" />
      <rect x="60" y="30" width="22" height="26" rx="3" fill="#fde047" transform="rotate(-8 71 43)" />
      <rect x="250" y="20" width="22" height="26" rx="3" fill="#fde047" transform="rotate(10 261 33)" />
      <rect x="290" y="120" width="18" height="30" rx="3" fill="#86efac" />
      <path d="M299 120 c -12 -20, 12 -30, 0 -50 c 12 20, -12 30, 0 50" fill="#4ade80" />
    </svg>
  );
}

/** Welcome: logo dalam balon + orang menunjuk. */
export function WelcomeIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 340 260" className={cn("w-full", className)} aria-hidden>
      <defs>
        <linearGradient id="wg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5fd3c6" />
          <stop offset="1" stopColor="#1f9bb3" />
        </linearGradient>
      </defs>
      <g fill="#e5e7eb" fillOpacity="0.7">
        <rect x="20" y="120" width="40" height="120" />
        <rect x="70" y="90" width="30" height="150" />
        <rect x="250" y="100" width="34" height="140" />
        <rect x="290" y="70" width="40" height="170" />
      </g>
      <path d="M150 20 C 100 20, 80 60, 100 100 C 112 124, 140 130, 160 140 L 168 118 C 200 112, 220 90, 210 55 C 202 30, 180 20, 150 20 Z" fill="url(#wg)" />
      <path d="M118 88 L138 62 L158 88 M154 88 L174 62 L194 88 M194 88 V72" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <g transform="translate(150 90) scale(0.7)">
        <Person mouth="smile" />
        <path d="M100 130 L 150 100" stroke={SKIN} strokeWidth="14" strokeLinecap="round" />
        <path d="M24 200 L 20 260 M 116 200 L 120 260" stroke={TEAL_DARK} strokeWidth="26" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/** Uraikan laporan: orang dengan clipboard + papan sticky note + tanda tanya. */
export function DescribeIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 340 260" className={cn("w-full", className)} aria-hidden>
      <Blob />
      <rect x="30" y="50" width="200" height="130" rx="6" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="6" />
      {[
        [56, 74],
        [98, 70],
        [62, 118],
        [104, 122],
      ].map(([x, y], i) => (
        <g key={i}>
          <rect x={x} y={y} width="26" height="24" rx="2" fill="#fde047" transform={`rotate(${i % 2 ? 6 : -5} ${x + 13} ${y + 12})`} />
          <rect x={x + 5} y={y + 7} width="16" height="2" fill="#9ca3af" />
          <rect x={x + 5} y={y + 12} width="12" height="2" fill="#9ca3af" />
        </g>
      ))}
      <g transform="translate(150 40) scale(0.85)">
        <Person />
        <rect x="50" y="130" width="44" height="58" rx="4" fill={NAVY} transform="rotate(-12 72 159)" />
        <rect x="60" y="126" width="16" height="8" rx="2" fill="#6b7280" transform="rotate(-12 68 130)" />
      </g>
      <text x="270" y="70" fontSize="64" fontWeight="800" fill={NAVY} fontFamily="Nunito, sans-serif">
        ?
      </text>
      <text x="300" y="110" fontSize="36" fontWeight="800" fill={NAVY} fontFamily="Nunito, sans-serif">
        ?
      </text>
      <ellipse cx="200" cy="232" rx="90" ry="14" fill={TEAL} fillOpacity="0.5" />
    </svg>
  );
}

/** Lokasi: orang memegang tablet + peta + balon "Lokasi nya dimana ?" */
export function LocationIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 340 260" className={cn("w-full", className)} aria-hidden>
      <Blob />
      <g transform="translate(20 50) rotate(-6 60 60)">
        <rect x="0" y="0" width="120" height="120" rx="4" fill="#fff" stroke="#e5e7eb" strokeWidth="3" />
        <path d="M0 40 C 30 30, 50 70, 120 55" stroke="#93c5fd" strokeWidth="10" fill="none" />
        <rect x="10" y="10" width="26" height="18" fill="#d1d5db" />
        <rect x="70" y="14" width="30" height="14" fill="#d1d5db" />
        <rect x="14" y="76" width="24" height="26" fill="#d1d5db" />
        <rect x="80" y="80" width="28" height="24" fill="#d1d5db" />
        <circle cx="62" cy="88" r="14" fill="#a3e635" />
        <path d="M50 46 c 0 -10 16 -10 16 0 c 0 8 -8 12 -8 18 c 0 -6 -8 -10 -8 -18 z" fill="#ef4444" />
        <circle cx="58" cy="46" r="3" fill="#fff" />
      </g>
      <g transform="translate(150 40) scale(0.85)">
        <Person />
        <rect x="46" y="128" width="46" height="60" rx="4" fill={NAVY} transform="rotate(-10 69 158)" />
      </g>
      <rect x="220" y="40" width="112" height="34" rx="17" fill="#c7d2fe" fillOpacity="0.8" />
      <path d="M232 74 l -10 12 l 22 -8 z" fill="#c7d2fe" fillOpacity="0.8" />
      <text x="276" y="62" textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff" fontFamily="Nunito, sans-serif">
        Lokasi nya dimana ?
      </text>
      <ellipse cx="200" cy="232" rx="90" ry="14" fill={TEAL} fillOpacity="0.5" />
    </svg>
  );
}

/** Sukses: orang gembira dikelilingi pekerja (disederhanakan: pekerja sebagai figur kecil berhelm). */
export function SuccessIllustration({ className }: { className?: string }) {
  const worker = (x: number, y: number, flip = false) => (
    <g transform={`translate(${x} ${y}) scale(${flip ? -0.42 : 0.42} 0.42)`}>
      <ellipse cx="70" cy="72" rx="26" ry="28" fill={SKIN} />
      <path d="M40 66 C 42 40, 98 40, 100 66 Z" fill="#facc15" />
      <rect x="40" y="60" width="60" height="8" rx="3" fill="#eab308" />
      <path d="M34 150 C 34 116, 52 104, 70 104 C 88 104, 106 116, 106 150 L 110 200 H 30 Z" fill="#3b5ba9" />
      <rect x="56" y="104" width="28" height="30" fill="#fff" />
    </g>
  );
  return (
    <svg viewBox="0 0 340 300" className={cn("w-full", className)} aria-hidden>
      <path d="M10 120 C 40 40, 150 10, 230 40 S 340 90, 320 170 S 200 280, 110 250 S -20 200, 10 120 Z" fill={TEAL_SOFT} />
      {worker(30, 110)}
      {worker(80, 60)}
      {worker(260, 100, true)}
      {worker(300, 150, true)}
      {worker(60, 190)}
      {worker(270, 200, true)}
      <g transform="translate(110 40) scale(0.95)">
        <Person mouth="smile" />
        <path d="M30 150 L -10 110 M 110 150 L 150 110" stroke={SKIN} strokeWidth="16" strokeLinecap="round" />
      </g>
      <ellipse cx="170" cy="272" rx="90" ry="14" fill={TEAL} fillOpacity="0.5" />
    </svg>
  );
}

export function MailIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 80" className={cn("w-40", className)} aria-hidden>
      <defs>
        <linearGradient id="mg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5fd3c6" />
          <stop offset="1" stopColor="#1f9bb3" />
        </linearGradient>
      </defs>
      <rect x="4" y="6" width="112" height="70" rx="8" fill="url(#mg)" />
      <path d="M12 16 L60 48 L108 16" fill="none" stroke="#fff" strokeWidth="8" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M12 66 L44 40 M108 66 L76 40" stroke="#fff" strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
}
