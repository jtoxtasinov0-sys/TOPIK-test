// Gemini chizgan rasmlar: tavsif (inglizcha) → /api/image → rasm (serverda keshlanadi va kichraytiriladi).
// Brauzer va server ikkalasi ham ishlatadi.

import type { Test } from "./exam";

export type ImageStyle = "test" | "icon";

/** Test savollari uchun uslub (rasmiy TOPIK kitobchasidagi kabi oq-qora chizma) */
export const IMAGE_STYLE =
  "Illustration for a Korean language proficiency test (TOPIK) booklet: clean black-and-white manga-style line art with soft gray shading, " +
  "everyday life in Korea, Korean people, simple uncluttered background, one clear scene that is easy to recognise. " +
  "Do not draw any text, letters, numbers, writing on signs or speech bubbles.";

/** Sayt ikonkalari uchun uslub (bitta tushunarli narsa, yumshoq 3D, sayt ranglari) */
export const ICON_STYLE =
  "A friendly 3D clay-style app icon for a Korean language learning app. One simple, instantly recognisable subject in the centre, " +
  "soft rounded shapes, pastel colours with violet, lavender and sky-blue accents, soft studio lighting, " +
  "plain very light lavender background filling the whole square, no border, no frame. " +
  "Do not draw any text, letters, numbers, flags or logos.";

/** Ilova (PWA) ikonkasi — vektor logodan (scripts/brand.mjs → public/brand). Logo o'zgarsa BRAND_VERSION ni oshiring */
export const BRAND_VERSION = "2";
export const APP_ICON_SIZES = [180, 192, 512] as const;
export const appIconUrl = (size: (typeof APP_ICON_SIZES)[number]) => `/brand/icon-${size}.png?v=${BRAND_VERSION}`;

/** Uslub o'zgartirilsa, versiyani oshiring — eski kesh ishlatilmaydi */
export const IMAGE_STYLES: Record<ImageStyle, { version: string; text: string; aspect: string }> = {
  test: { version: "v1", text: IMAGE_STYLE, aspect: "4:3" },
  icon: { version: "i1", text: ICON_STYLE, aspect: "1:1" },
};

export const IMAGE_STYLE_VERSION = IMAGE_STYLES.test.version;
export const MAX_IMAGE_PROMPT = 600;
/** Server qaytaradigan kengliklar (px). Telefon ekrani uchun 2x hisobida tanlanadi */
export const IMAGE_WIDTHS = [128, 256, 512, 768] as const;

/** Kerakli o'lchamga eng yaqin (kattaroq) ruxsat etilgan kenglik */
export function widthFor(cssPx: number, dpr = 2): number {
  const need = cssPx * dpr;
  return IMAGE_WIDTHS.find((w) => w >= need) ?? IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1];
}

export function imageUrl(prompt: string, opts: { style?: ImageStyle; w?: number } = {}) {
  let url = `/api/image?p=${encodeURIComponent(prompt.trim())}`;
  if (opts.style && opts.style !== "test") url += `&s=${opts.style}`;
  if (opts.w) url += `&w=${opts.w}`;
  return url;
}

/** Testdagi barcha rasm tavsiflari (savol rasmi + variant rasmlari) */
export function imagePromptsOf(tests: Test[]): string[] {
  const out = new Set<string>();
  for (const t of tests)
    for (const s of t.sections)
      for (const g of s.groups ?? [])
        for (const q of g.questions) {
          if (q.pictureImage?.trim()) out.add(q.pictureImage.trim());
          for (const p of q.optionImages ?? []) if (p?.trim()) out.add(p.trim());
        }
  return [...out];
}
