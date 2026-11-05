import "server-only";
import { encodePng } from "./png";

// Zaxira ilova ikonkasi: Gemini ikonkasi hali chizilmagan yoki kalit yo'q bo'lsa ishlatiladi.
// Kutubxonasiz chiziladi: binafsha → ko'k gradient fonda oq «한» (shakllardan yig'ilgan), silliq chetlar (4x4 namunalar).

type Shape = (x: number, y: number) => boolean;

/** Yumaloq uchli to'rtburchak (512 o'lchamli koordinatalarda) */
const bar = (x0: number, y0: number, x1: number, y1: number): Shape => {
  const r = Math.min(x1 - x0, y1 - y0) / 2;
  return (x, y) => {
    if (x < x0 || x > x1 || y < y0 || y > y1) return false;
    const cx = Math.min(Math.max(x, x0 + r), x1 - r);
    const cy = Math.min(Math.max(y, y0 + r), y1 - r);
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
  };
};
const ring = (cx: number, cy: number, outer: number, inner: number): Shape => (x, y) => {
  const d = (x - cx) ** 2 + (y - cy) ** 2;
  return d <= outer * outer && d >= inner * inner;
};

// «한» = ㅎ (chap yuqori) + ㅏ (o'ng) + ㄴ (pastki). Hammasi markaziy 70% (xavfsiz zona) ichida.
const GLYPH: Shape[] = [
  bar(168, 110, 252, 142), // ㅎ: kichik chiziq
  bar(118, 164, 302, 196), // ㅎ: uzun chiziq
  ring(210, 268, 62, 30), // ㅎ: aylana
  bar(336, 104, 370, 344), // ㅏ: tik chiziq
  bar(356, 206, 418, 238), // ㅏ: o'ngga chiqqan chiziq
  bar(146, 352, 180, 422), // ㄴ: tik
  bar(146, 390, 404, 422), // ㄴ: yotiq
];

const STOPS: [number, [number, number, number]][] = [
  [0, [0x6a, 0x11, 0xff]],
  [0.45, [0x8b, 0x3d, 0xff]],
  [1, [0x3a, 0x86, 0xff]],
];

function gradient(t: number): [number, number, number] {
  for (let i = 1; i < STOPS.length; i++) {
    const [t1, c1] = STOPS[i];
    const [t0, c0] = STOPS[i - 1];
    if (t <= t1) {
      const k = (t - t0) / (t1 - t0);
      return [c0[0] + (c1[0] - c0[0]) * k, c0[1] + (c1[1] - c0[1]) * k, c0[2] + (c1[2] - c0[2]) * k];
    }
  }
  return STOPS[STOPS.length - 1][1];
}

const memo = new Map<number, Buffer>();

export function fallbackAppIcon(size: number): Buffer {
  const hit = memo.get(size);
  if (hit) return hit;
  const data = new Uint8Array(size * size * 3);
  const k = 512 / size;
  const S = 4; // har piksel uchun 4x4 namuna
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      // Fon: diagonal gradient + chap yuqoridan oq yaltiroq
      const t = (px + py) / (2 * (size - 1));
      let [r, g, b] = gradient(t);
      const shine = Math.max(0, 0.45 * (1 - t * 2));
      r += (255 - r) * shine;
      g += (255 - g) * shine;
      b += (255 - b) * shine;
      // Harf: qancha namuna shakl ichida bo'lsa, shuncha oq
      let hits = 0;
      for (let sy = 0; sy < S; sy++)
        for (let sx = 0; sx < S; sx++) {
          const x = (px + (sx + 0.5) / S) * k;
          const y = (py + (sy + 0.5) / S) * k;
          if (GLYPH.some((f) => f(x, y))) hits++;
        }
      const a = hits / (S * S);
      const i = (py * size + px) * 3;
      data[i] = Math.round(r + (255 - r) * a);
      data[i + 1] = Math.round(g + (255 - g) * a);
      data[i + 2] = Math.round(b + (255 - b) * a);
    }
  }
  const png = encodePng({ width: size, height: size, channels: 3, data });
  memo.set(size, png);
  return png;
}
