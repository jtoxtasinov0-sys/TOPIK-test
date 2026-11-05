// HanUstoz logotipi: vektor (SVG) manbalar va PNG eksportlar (public/brand/).
// Ishlatish: node scripts/brand.mjs        — faqat SVG
//            node scripts/brand.mjs --png  — SVG + PNG (Playwright/Chromium kerak)
// Belgi: tanlangan «H» rasmi (to'lqinli lenta) piksel aniqligida o'lchanib, toza geometriyaga keltirilgan:
// chap ustun va o'ng ustun diagonal to'lqinli lenta bilan bitta shakl, chap yuqori va o'ng pastki bo'laklar alohida.
// Fon — to'q binafsha, burchaklarda och binafsha nur va belgining diagonalini takrorlovchi yumshoq tekisliklar; belgi oq.
// Yozuv: Inter Display Bold (OFL, https://rsms.me/inter) — harflar vektor yo'llarga aylantirilgan, shrift kerak emas.
// Shrift papkasi: BRAND_FONT_DIR (standart /usr/share/fonts/opentype/inter).

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadFont, textPath } from "./otf.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public", "brand");
const FONT_DIR = process.env.BRAND_FONT_DIR || "/usr/share/fonts/opentype/inter";

export const COLORS = {
  indigo: "#5004dc", // logo fonining to'q binafshasi
  violet: "#6a11ff",
  orchid: "#9b1fff", // logo fonidagi och binafsha nur
  purple: "#8b3dff",
  blue: "#3a86ff",
  sun: "#ffc04a",
  pink: "#ff5c9a",
  ink: "#160f3b",
  muted: "#6b6790",
  white: "#ffffff",
};

// Fon (512 katakli to'r): pastki chap va yuqori o'ng burchakda och nur, o'rtasi to'q; ustida ikki yumshoq tekislik —
// lenta qiyaligidagi soya va yuqori o'ngdagi yumaloq burchakli panel (logoning o'z rasmidagi kabi).
const defs = `<defs>
    <linearGradient id="hq-bg" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0" stop-color="${COLORS.orchid}"/><stop offset=".32" stop-color="#5d06ea"/><stop offset=".62" stop-color="${COLORS.indigo}"/><stop offset="1" stop-color="#8812ff"/>
    </linearGradient>
    <linearGradient id="hq-shade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3200a8" stop-opacity="0"/><stop offset=".55" stop-color="#3200a8" stop-opacity=".22"/></linearGradient>
    <linearGradient id="hq-glow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".08"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <clipPath id="hq-round"><rect width="512" height="512" rx="115.2"/></clipPath>
  </defs>`;

// ---------- Belgi (512 katakli to'r, markaz 256,256) ----------
// Har bir bo'lak — burchaklari yumaloqlangan ko'pburchak: [nuqta, radius]. Asosiy shakl 180° burilishga simmetrik,
// o'ng pastki bo'lak — chap yuqori bo'lakning 180° burilgani.
const MARK = {
  x: 128, // chap chet (o'ng chet = 512 - x)
  y: 126, // yuqori chet (pastki chet = 512 - y)
  stem: 70, // ustun eni; lenta qalinligi ham shunga yaqin
  slope: -0.634, // lenta diagonali (≈32.4°)
  ribbon: 41.5, // lenta yuqori chizig'i markazdan shuncha yuqorida (x = 256 da)
  wave: { slope: 0.26, rise: 36.5 }, // lentaning ustunga tutashgan yotiqroq qismi
  gap: 16, // yon bo'lak va lenta orasidagi tirqish (vertikal bo'yicha)
  capSlope: 0.49, // yon bo'lak tepasining qiyaligi
  r: { joint: 19.5, wave: 43, inner: 9.5, side: 18, cap: 53 },
};

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
const unit = (a) => {
  const l = Math.hypot(a[0], a[1]);
  return [a[0] / l, a[1] / l];
};
/** p1 + t·d1 va p2 + u·d2 to'g'ri chiziqlarining kesishgan nuqtasi */
function meet(p1, d1, p2, d2) {
  const t = cross(sub(p2, p1), d2) / cross(d1, d2);
  return [p1[0] + t * d1[0], p1[1] + t * d1[1]];
}
const num = (v) => String(Math.round(v * 100) / 100);
const pt = (p) => `${num(p[0])} ${num(p[1])}`;

/** Burchaklari r radiusli yoy bilan yumaloqlangan yopiq ko'pburchak → SVG yo'li */
function roundedPath(corners) {
  const n = corners.length;
  const ends = corners.map(([p, r], i) => {
    if (!r) return { a: p, b: p, r: 0 };
    const u = unit(sub(corners[(i + n - 1) % n][0], p));
    const v = unit(sub(corners[(i + 1) % n][0], p));
    const d = r / Math.tan(Math.acos(Math.max(-1, Math.min(1, u[0] * v[0] + u[1] * v[1]))) / 2);
    const sweep = cross([-u[0], -u[1]], v) > 0 ? 1 : 0;
    return { a: [p[0] + u[0] * d, p[1] + u[1] * d], b: [p[0] + v[0] * d, p[1] + v[1] * d], r, sweep };
  });
  let d = `M${pt(ends[0].b)}`;
  let last = pt(ends[0].b);
  for (let i = 1; i <= n; i++) {
    const e = ends[i % n];
    if (pt(e.a) !== last) d += ` L${pt(e.a)}`;
    if (e.r) d += ` A${num(e.r)} ${num(e.r)} 0 0 ${e.sweep} ${pt(e.b)}`;
    last = pt(e.b);
  }
  return d + " Z";
}

function markPaths() {
  const { x: L0, y: T, stem, slope, r } = MARK;
  const L1 = L0 + stem;
  const R0 = 512 - L1;
  const R1 = 512 - L0;
  const turn = ([x, y]) => [512 - x, 512 - y];
  const down = [0, 1];
  const diag = [1, slope];
  const ribbon = [256, 256 - MARK.ribbon];
  const wave = [256, 256 - MARK.wave.rise];
  const waveDir = [1, MARK.wave.slope];
  // Chap ustun → lenta → o'ng ustun qalpog'igacha; qolgan yarmi — 180° burilgani
  const half = [
    [meet([L0, 0], down, ribbon, diag), r.joint],
    [meet(ribbon, diag, wave, waveDir), r.wave],
    [meet(wave, waveDir, [R0, 0], down), r.inner],
    [[R0, T], stem / 2],
    [[R1, T], stem / 2],
  ];
  const main = [...half, ...half.map(([p, k]) => [turn(p), k])];
  // Chap yuqori bo'lak: tepasi qiya va yumaloq, pasti lentaga parallel
  const cut = [256, 256 - MARK.ribbon - MARK.gap];
  const side = [
    [[L1, T], 0],
    [meet([L1, 0], down, cut, diag), r.side],
    [meet(cut, diag, [L0, 0], down), 0],
    [meet([L0, 0], down, [L1, T], [-1, MARK.capSlope]), r.cap],
  ];
  return [main, side, side.map(([p, k]) => [turn(p), k])].map(roundedPath);
}

const MARK_SHAPES = markPaths()
  .map((d) => `<path d="${d}"/>`)
  .join("\n    ");

function glyph(size, scale = 1, fill = COLORS.white) {
  const k = (size / 512) * scale;
  const t = (size - 512 * k) / 2;
  return `<g transform="translate(${t.toFixed(2)} ${t.toFixed(2)}) scale(${k.toFixed(4)})" fill="${fill}">${MARK_SHAPES}</g>`;
}

function tile(size, rounded = true) {
  return `<g transform="scale(${(size / 512).toFixed(4)})"${rounded ? ' clip-path="url(#hq-round)"' : ""}>
    <rect width="512" height="512" fill="url(#hq-bg)"/>
    <path d="M0 512 L512 178 V512 Z" fill="url(#hq-shade)"/>
    <path d="M308 512 V108 A72 72 0 0 1 346.2 44.4 L430.2 0 H512 V512 Z" fill="url(#hq-glow)"/>
  </g>`;
}

/** Faqat belgi (fonsiz), binafsha gradientda — oq fonli reklama va hujjatlar uchun */
export function symbolSvg({ size = 512 } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs><linearGradient id="hq-sym" gradientUnits="userSpaceOnUse" x1="128" y1="126" x2="384" y2="386">
    <stop offset="0" stop-color="${COLORS.orchid}"/><stop offset=".5" stop-color="${COLORS.violet}"/><stop offset="1" stop-color="${COLORS.indigo}"/></linearGradient></defs>
  ${glyph(size, 1.28, "url(#hq-sym)")}
</svg>`;
}

/** Belgi: rounded=true — yumaloq kvadrat (sayt, reklama), false — to'liq kvadrat (telefon burchagini o'zi yumaloqlaydi) */
export function markSvg({ size = 512, rounded = true, scale = 1 } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${defs}
  ${tile(size, rounded)}
  ${glyph(size, scale)}
</svg>`;
}

// ---------- Yozuv ----------
let fonts = null;
function font(weight) {
  fonts ??= {
    bold: loadFont(path.join(FONT_DIR, "InterDisplay-Bold.otf")),
    semibold: loadFont(path.join(FONT_DIR, "InterDisplay-SemiBold.otf")),
  };
  return fonts[weight];
}

/** «HanUstoz»: Han — siyoh, Ustoz — binafsha (dark=true: hammasi oq). y = asosiy chiziq */
function wordmark(x, y, size, dark) {
  const f = font("bold");
  const tracking = -0.024;
  const han = textPath(f, "Han", { size, tracking });
  const ustoz = textPath(f, "Ustoz", { size, tracking });
  const gap = tracking * size;
  return {
    width: han.width + gap + ustoz.width,
    svg: `<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)})">
    <path d="${han.d}" fill="${dark ? COLORS.white : COLORS.ink}"/>
    <path transform="translate(${(han.width + gap).toFixed(2)} 0)" d="${ustoz.d}" fill="${dark ? COLORS.white : COLORS.violet}"/>
  </g>`,
  };
}

const TAGLINE = "KOREYS TILI · TOPIK · EPS";
function tagline(x, y, size, dark) {
  const t = textPath(font("semibold"), TAGLINE, { size, tracking: 0.18 });
  return { width: t.width, svg: `<path transform="translate(${x.toFixed(2)} ${y.toFixed(2)})" d="${t.d}" fill="${dark ? "#c9c3ff" : COLORS.muted}"/>` };
}

const CAP = 0.727; // Inter bosh harf balandligi (em ulushida)

/** Gorizontal logo: belgi + «HanUstoz» (+ ixtiyoriy shior). dark=true — to'q fon uchun */
export function lockupSvg({ dark = false, withTagline = false, height = 160 } = {}) {
  const size = height * 0.69; // yozuv o'lchami
  const gapMark = height * 0.26;
  const x = height + gapMark;
  let body;
  let width;
  if (!withTagline) {
    const base = height / 2 + (size * CAP) / 2;
    const w = wordmark(x, base, size, dark);
    width = x + w.width;
    body = w.svg;
  } else {
    const tSize = height * 0.135;
    const gap = height * 0.12;
    const block = size * CAP + gap + tSize * CAP;
    const top = (height - block) / 2;
    const w = wordmark(x, top + size * CAP, size, dark);
    const t = tagline(x + size * 0.02, top + size * CAP + gap + tSize * CAP, tSize, dark);
    width = x + Math.max(w.width, t.width);
    body = w.svg + t.svg;
  }
  const W = Math.ceil(width + height * 0.04);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${height}" viewBox="0 0 ${W} ${height}">
  ${defs}
  ${tile(height)}
  ${glyph(height)}
  ${body}
</svg>`;
}

/** Vertikal logo (ijtimoiy tarmoq posti, kvadrat joylar): belgi tepada, yozuv va shior pastda */
export function stackedSvg({ dark = false, width = 640 } = {}) {
  const mark = width * 0.36;
  const size = width * 0.165;
  const tSize = width * 0.032;
  const f = font("bold");
  const wW = textPath(f, "Han", { size, tracking: -0.024 }).width + textPath(f, "Ustoz", { size, tracking: -0.024 }).width - 0.024 * size;
  const tW = textPath(font("semibold"), TAGLINE, { size: tSize, tracking: 0.18 }).width;
  const markY = width * 0.08;
  const base = markY + mark + width * 0.1 + size * CAP;
  const tBase = base + width * 0.075;
  const H = Math.ceil(tBase + width * 0.08);
  const mx = (width - mark) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${H}" viewBox="0 0 ${width} ${H}">
  ${defs}
  <g transform="translate(${mx.toFixed(2)} ${markY.toFixed(2)})">${tile(mark)}${glyph(mark)}</g>
  ${wordmark((width - wW) / 2, base, size, dark).svg}
  ${tagline((width - tW) / 2, tBase, tSize, dark).svg}
</svg>`;
}

const FILES = {
  "logo-mark.svg": () => markSvg({ size: 512, rounded: true }),
  "logo-symbol.svg": () => symbolSvg({ size: 512 }),
  "app-icon.svg": () => markSvg({ size: 512, rounded: false }),
  "app-icon-maskable.svg": () => markSvg({ size: 512, rounded: false, scale: 0.8 }),
  "logo-horizontal.svg": () => lockupSvg({ dark: false }),
  "logo-horizontal-white.svg": () => lockupSvg({ dark: true }),
  "logo-tagline.svg": () => lockupSvg({ dark: false, withTagline: true }),
  "logo-tagline-white.svg": () => lockupSvg({ dark: true, withTagline: true }),
  "logo-stacked.svg": () => stackedSvg({ dark: false }),
};

const PNGS = [
  ["app-icon.svg", "icon-180.png", 180, 180],
  ["app-icon.svg", "icon-192.png", 192, 192],
  ["app-icon.svg", "icon-512.png", 512, 512],
  ["app-icon-maskable.svg", "icon-maskable-512.png", 512, 512],
  ["logo-mark.svg", "logo-1024.png", 1024, 1024],
  ["logo-symbol.svg", "logo-symbol-1024.png", 1024, 1024],
  ["logo-horizontal.svg", "logo-horizontal.png", null, 320],
  ["logo-horizontal-white.svg", "logo-horizontal-white.png", null, 320],
  ["logo-tagline.svg", "logo-tagline.png", null, 320],
  ["logo-tagline-white.svg", "logo-tagline-white.png", null, 320],
  ["logo-stacked.svg", "logo-stacked.png", 1280, null],
];

mkdirSync(OUT, { recursive: true });
const svgs = Object.fromEntries(Object.entries(FILES).map(([n, f]) => [n, f()]));
for (const [name, svg] of Object.entries(svgs)) writeFileSync(path.join(OUT, name), svg + "\n");
// Favicon (Next.js src/app/icon.svg) va eski /icon.svg manzili — sayt belgisi bilan bir xil
for (const f of ["src/app/icon.svg", "public/icon.svg"]) writeFileSync(path.join(ROOT, f), svgs["logo-mark.svg"] + "\n");
console.log("SVG:", Object.keys(svgs).join(", "), "+ src/app/icon.svg, public/icon.svg");

if (process.argv.includes("--png")) {
  const { createRequire } = await import("node:module");
  const { chromium } = createRequire(import.meta.url)("playwright");
  const browser = await chromium.launch();
  for (const [src, out, w0, h0] of PNGS) {
    const svg = svgs[src];
    const vw = Number(svg.match(/width="(\d+)"/)[1]);
    const vh = Number(svg.match(/height="(\d+)"/)[1]);
    const width = w0 ?? Math.round((vw / vh) * h0);
    const height = h0 ?? Math.round((vh / vw) * w0);
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace(/width="\d+" height="\d+"/, `width="${width}" height="${height}"`)}</body></html>`);
    await page.screenshot({ path: path.join(OUT, out), omitBackground: true, clip: { x: 0, y: 0, width, height } });
    await page.close();
  }
  await browser.close();
  console.log("PNG:", PNGS.map((p) => p[1]).join(", "));
}
