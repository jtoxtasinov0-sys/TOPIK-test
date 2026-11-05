// HanUstoz logotipi: vektor (SVG) manbalar va PNG eksportlar (public/brand/).
// Ishlatish: node scripts/brand.mjs        — faqat SVG
//            node scripts/brand.mjs --png  — SVG + PNG (Playwright/Chromium kerak)
// Belgi: to'rt yumaloq bo'lakdan H — chap pastki va o'ng yuqori bo'lak to'lqinli lenta bilan silliq qo'shilgan
// (suhbat, oqim: o'quvchidan ustozga). Fon — binafsha → ko'k gradient, belgi oq.
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
  violet: "#6a11ff",
  purple: "#8b3dff",
  blue: "#3a86ff",
  sun: "#ffc04a",
  pink: "#ff5c9a",
  ink: "#160f3b",
  muted: "#6b6790",
  white: "#ffffff",
};

const defs = `<defs>
    <linearGradient id="hq-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${COLORS.violet}"/><stop offset=".55" stop-color="#5b2dff"/><stop offset="1" stop-color="${COLORS.blue}"/>
    </linearGradient>
  </defs>`;

// ---------- Belgi (512 katakli to'r) ----------
// Chap yuqori va o'ng pastki bo'laklar alohida; chap pastki bo'lak → to'lqinli lenta → o'ng yuqori bo'lak — bitta silliq shakl.
const MARK_SHAPES = `<rect x="128" y="128" width="64" height="116" rx="32"/>
    <rect x="320" y="270" width="64" height="116" rx="32"/>
    <path d="M128 354 A32 32 0 0 0 192 354 V324 C192 304 206 288 228 286 C244 284 252 296 268 294 C286 292 296 270 312 252 C324 238 336 232 352 232 A32 32 0 0 0 384 200 V160 A32 32 0 0 0 320 160 V188 C320 204 310 214 298 226 C284 240 276 254 258 256 C240 258 232 246 216 248 C198 250 184 286 160 286 A32 32 0 0 0 128 318 Z"/>`;

function glyph(size, scale = 1, fill = COLORS.white) {
  const k = (size / 512) * scale;
  const t = (size - 512 * k) / 2;
  return `<g transform="translate(${t.toFixed(2)} ${t.toFixed(2)}) scale(${k.toFixed(4)})" fill="${fill}">${MARK_SHAPES}</g>`;
}

function tile(size, rounded = true) {
  const r = rounded ? size * 0.225 : 0;
  return `<rect width="${size}" height="${size}" rx="${r}" fill="url(#hq-bg)"/>`;
}

/** Faqat belgi (fonsiz), gradient rangda — oq fonli reklama va hujjatlar uchun */
export function symbolSvg({ size = 512 } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs><linearGradient id="hq-sym" gradientUnits="userSpaceOnUse" x1="128" y1="128" x2="384" y2="386">
    <stop offset="0" stop-color="${COLORS.violet}"/><stop offset="1" stop-color="${COLORS.blue}"/></linearGradient></defs>
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
console.log("SVG:", Object.keys(svgs).join(", "));

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
