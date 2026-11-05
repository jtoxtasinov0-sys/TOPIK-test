// Test rasmlari: savoldagi inglizcha sahna tavsifi → /api/image → Gemini chizgan rasm (serverda keshlanadi).
// Brauzer va server ikkalasi ham ishlatadi.

import type { Test } from "./exam";

/** Barcha rasmlar uchun umumiy uslub. O'zgartirilsa, versiyani oshiring — eski kesh ishlatilmaydi */
export const IMAGE_STYLE_VERSION = "v1";
export const IMAGE_STYLE =
  "Illustration for a Korean language proficiency test (TOPIK) booklet: clean black-and-white manga-style line art with soft gray shading, " +
  "everyday life in Korea, Korean people, simple uncluttered background, one clear scene that is easy to recognise. " +
  "Do not draw any text, letters, numbers, writing on signs or speech bubbles.";

export const MAX_IMAGE_PROMPT = 600;

export const imageUrl = (prompt: string) => `/api/image?p=${encodeURIComponent(prompt.trim())}`;

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
