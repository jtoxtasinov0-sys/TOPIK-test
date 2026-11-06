import "server-only";
import { encodeJpeg } from "./jpeg";
import { cropSquare, decodePng, encodePng, resizeBitmap, toGrayIfPossible, type Bitmap } from "./png";

// Telefon uchun kichik nusxa: kerakli kenglikka kichraytirib, eng yengil formatda.
// - PNG asl rasm: kutubxonasiz — JPEG yoki PNG (qaysi biri kichik bo'lsa; shaffof rasm doim PNG)
// - JPEG/WebP asl rasm: serverda sharp bo'lsa u bilan, bo'lmasa — null (asl rasm qaytadi)

export type Thumb = { data: Buffer; mime: string };
export const JPEG_QUALITY = 82;

/** RGBA, lekin hamma joyi to'liq ko'rinadigan bo'lsa — RGB. Shaffof joyi bo'lsa — null */
function opaque(img: Bitmap): Bitmap | null {
  if (img.channels !== 4) return img;
  const n = img.width * img.height;
  for (let i = 0; i < n; i++) if (img.data[i * 4 + 3] !== 255) return null;
  const rgb = new Uint8Array(n * 3);
  for (let i = 0; i < n; i++) rgb.set(img.data.subarray(i * 4, i * 4 + 3), i * 3);
  return { width: img.width, height: img.height, channels: 3, data: rgb };
}

/** PNG → kichik nusxa (JPEG yoki PNG). PNG'ni o'qib bo'lmasa — null */
export function thumbFromPng(buf: Uint8Array, width: number, opts: { square?: boolean } = {}): Thumb | null {
  const img = decodePng(buf);
  if (!img) return null;
  const small = resizeBitmap(opts.square ? cropSquare(img) : img, width);
  const flat = opaque(small);
  if (!flat) return { data: encodePng(small), mime: "image/png" };
  const ready = toGrayIfPossible(flat);
  const jpg = encodeJpeg(ready, JPEG_QUALITY);
  const png = encodePng(ready);
  // Oq-qora chiziqli rasmlarda PNG ko'pincha yengilroq, 3D ikonkalarda — JPEG
  return png.length <= jpg.length ? { data: png, mime: "image/png" } : { data: jpg, mime: "image/jpeg" };
}

type SharpPipe = {
  rotate(): SharpPipe;
  resize(o: { width: number; height?: number; fit?: "cover" | "inside"; withoutEnlargement?: boolean }): SharpPipe;
  jpeg(o: { quality: number; mozjpeg?: boolean }): SharpPipe;
  toBuffer(): Promise<Buffer>;
};
type SharpFn = (input: Buffer, opts?: { failOn?: "none" }) => SharpPipe;

const g = globalThis as unknown as { __hqSharp?: Promise<SharpFn | null> };

/** sharp (Next.js bilan birga o'rnatiladi) — bo'lmasa null, sayt baribir ishlayveradi */
function loadSharp(): Promise<SharpFn | null> {
  g.__hqSharp ??= import("sharp")
    .then((m) => {
      const mod = m as unknown as { default?: SharpFn } & SharpFn;
      return typeof mod.default === "function" ? mod.default : typeof mod === "function" ? mod : null;
    })
    .catch(() => null);
  return g.__hqSharp;
}

/** Asl rasmdan kichik nusxa. Yasab bo'lmasa — null (chaqiruvchi asl rasmni qaytaradi) */
export async function makeThumb(original: Thumb, width: number, opts: { square?: boolean } = {}): Promise<Thumb | null> {
  if (original.mime === "image/png") return thumbFromPng(original.data, width, opts);
  try {
    const sharp = await loadSharp();
    if (!sharp) return null;
    const data = await sharp(original.data, { failOn: "none" })
      .rotate()
      .resize(opts.square ? { width, height: width, fit: "cover", withoutEnlargement: true } : { width, withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer();
    return { data, mime: "image/jpeg" };
  } catch {
    return null;
  }
}
