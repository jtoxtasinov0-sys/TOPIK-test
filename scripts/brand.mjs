// HanUstoz logotipi: vektor (SVG) manbalar va PNG eksportlar (public/brand/).
// Ishlatish: node scripts/brand.mjs        — faqat SVG
//            node scripts/brand.mjs --png  — SVG + PNG (Playwright/Chromium kerak)
// Logo shriftsiz chizilgan: hamma harflar bir xil qalinlikdagi yumaloq chiziqlar (stroke) — har qanday dasturda bir xil ko'rinadi.

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public", "brand");

export const COLORS = {
  violet: "#6a11ff",
  purple: "#8b3dff",
  blue: "#3a86ff",
  sun: "#ffb340",
  pink: "#ff5c9a",
  ink: "#160f3b",
  white: "#ffffff",
};

// ---------- «한» belgisi (512 katakli to'r, markaziy chiziqlar) ----------
const MARK_STROKE = 34;
const MARK_LINES = "M178 110 H242 M126 166 H294 M356 96 V336 M356 218 H414 M164 358 V412 H404";
const MARK_RING = { cx: 210, cy: 268, r: 44 };
// Belgining chegaralari (chiziq qalinligi bilan) — markazlash uchun
const MARK_BOX = { x0: 126 - 17, y0: 96 - 17, x1: 414 + 17, y1: 412 + 17 };

function glyph({ scale = 1, color = COLORS.white, ring = "url(#hq-sun)", size = 512 } = {}) {
  const w = MARK_BOX.x1 - MARK_BOX.x0;
  const h = MARK_BOX.y1 - MARK_BOX.y0;
  const k = (size / 512) * scale * (330 / Math.max(w, h));
  const tx = size / 2 - ((MARK_BOX.x0 + MARK_BOX.x1) / 2) * k;
  const ty = size / 2 - ((MARK_BOX.y0 + MARK_BOX.y1) / 2) * k;
  return `<g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${k.toFixed(4)})" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="${MARK_STROKE}">
    <path d="${MARK_LINES}" stroke="${color}"/>
    <circle cx="${MARK_RING.cx}" cy="${MARK_RING.cy}" r="${MARK_RING.r}" stroke="${ring}"/>
  </g>`;
}

const defs = (id = "") => `<defs>
    <linearGradient id="hq-bg${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${COLORS.violet}"/><stop offset=".5" stop-color="${COLORS.purple}"/><stop offset="1" stop-color="${COLORS.blue}"/>
    </linearGradient>
    <radialGradient id="hq-glow${id}" cx=".22" cy=".14" r=".75">
      <stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="hq-sun" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${COLORS.sun}"/><stop offset="1" stop-color="${COLORS.pink}"/>
    </linearGradient>
  </defs>`;

/** Belgi: rounded=true — yumaloq kvadrat (sayt, reklama), false — to'liq kvadrat (telefon burchagini o'zi yumaloqlaydi) */
export function markSvg({ size = 512, rounded = true, scale = 1 } = {}) {
  const r = rounded ? size * 0.225 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${defs()}
  <rect width="${size}" height="${size}" rx="${r}" fill="url(#hq-bg)"/>
  <rect width="${size}" height="${size}" rx="${r}" fill="url(#hq-glow)"/>
  ${glyph({ size, scale })}
</svg>`;
}

// ---------- «HanUstoz» yozuvi: monoline geometrik harflar (bosh harf balandligi 100) ----------
const S = 16; // chiziq qalinligi
const LETTERS = {
  H: { w: 72, d: "M8 8 V92 M64 8 V92 M8 50 H64" },
  a: { w: 70, d: "M62 38 V92", circle: [35, 65, 27] },
  n: { w: 70, d: "M8 38 V92 M8 65 A27 27 0 0 1 62 65 V92" },
  U: { w: 72, d: "M8 8 V64 A28 28 0 0 0 64 64 V8" },
  s: { w: 60, d: "M50 45 C46 40 39 38 31 38 C20 38 12 43 12 51 C12 60 21 62 31 64 C42 66 51 69 51 78 C51 87 42 92 31 92 C21 92 13 89 9 83" },
  t: { w: 50, d: "M20 14 V74 Q20 92 38 92 H42 M7 38 H42" },
  o: { w: 70, d: "", circle: [35, 65, 27] },
  z: { w: 66, d: "M10 38 H56 L10 92 H56" },
};
const GAP = 9;

function word(text, color) {
  let x = 0;
  const parts = [];
  for (const ch of text) {
    const L = LETTERS[ch];
    const els = [];
    if (L.d) els.push(`<path d="${L.d}"/>`);
    if (L.circle) els.push(`<circle cx="${L.circle[0]}" cy="${L.circle[1]}" r="${L.circle[2]}"/>`);
    parts.push(`<g transform="translate(${x} 0)">${els.join("")}</g>`);
    x += L.w + GAP;
  }
  return { width: x - GAP, svg: `<g fill="none" stroke="${color}" stroke-width="${S}" stroke-linecap="round" stroke-linejoin="round">${parts.join("")}</g>` };
}

/** Gorizontal logo: belgi + «HanUstoz». dark=true — to'q fon uchun (oq yozuv) */
export function lockupSvg({ dark = false, height = 160 } = {}) {
  const han = word("Han", dark ? COLORS.white : COLORS.ink);
  // «Ustoz»: oq harflar niqob bo'ladi, ustidan bitta uzluksiz gradient (har harfda qayta boshlanmasin)
  const ustoz = word("Ustoz", COLORS.white);
  const textGrad = `<linearGradient id="hq-text" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${COLORS.violet}"/><stop offset="1" stop-color="${COLORS.blue}"/></linearGradient>
    <mask id="hq-ustoz" maskUnits="userSpaceOnUse" x="-10" y="-10" width="${ustoz.width + 20}" height="120">${ustoz.svg}</mask>`;
  const ustozPaint = dark ? ustoz.svg : `<rect x="-${S}" y="0" width="${ustoz.width + 2 * S}" height="100" fill="url(#hq-text)" mask="url(#hq-ustoz)"/>`;
  const markSize = height;
  const k = (height * 0.5) / 100; // yozuv bosh harfi — belgining yarmi
  const gapMark = height * 0.24;
  const gapWords = 9 * k * 0; // «Han» va «Ustoz» bitta so'z
  const wordW = (han.width + GAP + ustoz.width) * k;
  const W = Math.round(markSize + gapMark + wordW + S * k);
  const ty = (height - 100 * k) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${height}" viewBox="0 0 ${W} ${height}">
  ${defs()}
  <defs>${textGrad}</defs>
  <rect width="${markSize}" height="${markSize}" rx="${markSize * 0.225}" fill="url(#hq-bg)"/>
  <rect width="${markSize}" height="${markSize}" rx="${markSize * 0.225}" fill="url(#hq-glow)"/>
  ${glyph({ size: markSize })}
  <g transform="translate(${(markSize + gapMark + gapWords).toFixed(2)} ${ty.toFixed(2)}) scale(${k.toFixed(4)})">
    ${han.svg}
    <g transform="translate(${han.width + GAP} 0)">${ustozPaint}</g>
  </g>
</svg>`;
}

const FILES = {
  "logo-mark.svg": markSvg({ size: 512, rounded: true }),
  "app-icon.svg": markSvg({ size: 512, rounded: false }),
  "app-icon-maskable.svg": markSvg({ size: 512, rounded: false, scale: 0.8 }),
  "logo-horizontal.svg": lockupSvg({ dark: false }),
  "logo-horizontal-white.svg": lockupSvg({ dark: true }),
};

const PNGS = [
  ["app-icon.svg", "icon-180.png", 180, 180],
  ["app-icon.svg", "icon-192.png", 192, 192],
  ["app-icon.svg", "icon-512.png", 512, 512],
  ["app-icon-maskable.svg", "icon-maskable-512.png", 512, 512],
  ["logo-mark.svg", "logo-1024.png", 1024, 1024],
  ["logo-horizontal.svg", "logo-horizontal.png", null, 320],
  ["logo-horizontal-white.svg", "logo-horizontal-white.png", null, 320],
];

mkdirSync(OUT, { recursive: true });
for (const [name, svg] of Object.entries(FILES)) writeFileSync(path.join(OUT, name), svg + "\n");
console.log("SVG:", Object.keys(FILES).join(", "));

if (process.argv.includes("--png")) {
  const { createRequire } = await import("node:module");
  const { chromium } = createRequire(import.meta.url)("playwright");
  const browser = await chromium.launch();
  for (const [src, out, w0, h] of PNGS) {
    const svg = FILES[src];
    const vw = Number(svg.match(/width="(\d+)"/)[1]);
    const vh = Number(svg.match(/height="(\d+)"/)[1]);
    const width = w0 ?? Math.round((vw / vh) * h);
    const page = await browser.newPage({ viewport: { width, height: h }, deviceScaleFactor: 1 });
    const html = `<html><body style="margin:0;background:transparent">${svg.replace(/width="\d+" height="\d+"/, `width="${width}" height="${h}"`)}</body></html>`;
    await page.setContent(html);
    await page.screenshot({ path: path.join(OUT, out), omitBackground: true, clip: { x: 0, y: 0, width, height: h } });
    await page.close();
  }
  await browser.close();
  console.log("PNG:", PNGS.map((p) => p[1]).join(", "));
}
