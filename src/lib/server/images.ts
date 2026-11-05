import "server-only";
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { generateImage } from "@/lib/gemini";
import { IMAGE_STYLES, type ImageStyle } from "@/lib/images";
import { makeThumb } from "./thumb";

// Rasm keshi: xotira (tez) + disk. Dokploy'da /app/data/images (Volume) — qayta deploy'da o'chmaydi.
// Asl rasm (~1 MB) bir marta chiziladi; telefon uchun kichraytirilgan nusxalari (128–768 px, JPEG yoki PNG —
// qaysi biri yengil bo'lsa) alohida saqlanadi.
// Disk yozib bo'lmasa (masalan Vercel), faqat xotirada saqlanadi.

export type StoredImage = { data: Buffer; mime: string };

const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const MIME = Object.fromEntries(Object.entries(EXT).map(([m, e]) => [e, m]));

type ImgEvent = { at: number; style: ImageStyle; message?: string; mime?: string; bytes?: number };

const g = globalThis as unknown as {
  __hqImgLog?: { error?: ImgEvent; ok?: ImgEvent };
  __hqImg?: Map<string, StoredImage>;
  __hqImgSmall?: Map<string, StoredImage>;
  __hqImgJobs?: Map<string, Promise<StoredImage>>;
  __hqThumbJobs?: Map<string, Promise<StoredImage>>;
};
const big = (g.__hqImg ??= new Map()); // asl rasmlar — og'ir, kam saqlanadi
const small = (g.__hqImgSmall ??= new Map()); // kichraytirilgan nusxalar
const jobs = (g.__hqImgJobs ??= new Map());
const thumbJobs = (g.__hqThumbJobs ??= new Map()); // bir xil kichik nusxa bir vaqtda ikki marta yasalmasin
const log = (g.__hqImgLog ??= {});

/** Admin uchun: oxirgi muvaffaqiyatli va oxirgi xato rasm yaratish */
export function imageLog() {
  return { ...log };
}

export function imageDir() {
  if (process.env.IMAGE_DIR) return process.env.IMAGE_DIR;
  const db = process.env.FILE_DB_PATH || path.join(process.cwd(), ".data", "db.json");
  return path.join(path.dirname(db), "images");
}

/** Kesh kaliti. Test uslubi uchun eski kalit shakli saqlangan (oldin yaratilgan rasmlar yo'qolmasin) */
export function imageKey(prompt: string, style: ImageStyle = "test") {
  const s = IMAGE_STYLES[style];
  const base = style === "test" ? `${s.version}|${prompt}` : `${s.version}|${style}|${prompt}`;
  return createHash("sha1").update(base).digest("hex");
}

function remember(map: Map<string, StoredImage>, key: string, img: StoredImage, max: number) {
  map.set(key, img);
  if (map.size > max) map.delete(map.keys().next().value as string);
}

async function fromDisk(name: string): Promise<StoredImage | null> {
  for (const ext of Object.keys(MIME)) {
    try {
      const data = await readFile(path.join(imageDir(), `${name}.${ext}`));
      return { data, mime: MIME[ext] };
    } catch {}
  }
  return null;
}

async function toDisk(name: string, img: StoredImage) {
  try {
    const dir = imageDir();
    await mkdir(dir, { recursive: true });
    const file = path.join(dir, `${name}.${EXT[img.mime] ?? "png"}`);
    await writeFile(`${file}.tmp`, img.data);
    await rename(`${file}.tmp`, file);
  } catch {}
}

async function cachedOriginal(key: string): Promise<StoredImage | null> {
  const hit = big.get(key);
  if (hit) return hit;
  const disk = await fromDisk(key);
  if (disk) remember(big, key, disk, 24);
  return disk;
}

/** Kichik nusxa fayli nomi. Format o'zgarsa, THUMB versiyasini oshiring — eski (og'ir) nusxalar ishlatilmaydi */
const THUMB = "v2";
export const thumbName = (key: string, w: number) => `${key}-w${w}-${THUMB}`;
const MAX_SMALL = 600;

/** Kichraytirilgan nusxa: keshda bo'lmasa — asl rasmdan yasaladi (yasab bo'lmasa asl rasm qaytadi) */
async function variant(key: string, original: StoredImage, w?: number, style: ImageStyle = "test"): Promise<StoredImage> {
  if (!w) return original;
  const name = thumbName(key, w);
  const hit = small.get(name);
  if (hit) return hit;
  const disk = await fromDisk(name);
  if (disk) {
    remember(small, name, disk, MAX_SMALL);
    return disk;
  }
  let job = thumbJobs.get(name);
  if (!job) {
    job = (async () => {
      const img = await makeThumb(original, w, { square: style === "icon" }).catch(() => null);
      if (!img || img.data.length >= original.data.length) return original;
      remember(small, name, img, MAX_SMALL);
      await toDisk(name, img);
      return img;
    })().finally(() => thumbJobs.delete(name));
    thumbJobs.set(name, job);
  }
  return job;
}

/** Keshdan olish (yangi rasm chizmasdan) */
export async function cachedImage(prompt: string, style: ImageStyle = "test", w?: number): Promise<StoredImage | null> {
  const key = imageKey(prompt, style);
  if (w) {
    const name = thumbName(key, w);
    const hit = small.get(name) ?? (await fromDisk(name));
    if (hit) {
      remember(small, name, hit, MAX_SMALL);
      return hit;
    }
  }
  const original = await cachedOriginal(key);
  return original ? variant(key, original, w, style) : null;
}

/** Keshda bo'lmasa — Gemini chizadi. Bir vaqtda kelgan bir xil so'rovlar bitta yaratishni kutadi */
export async function createImage(prompt: string, style: ImageStyle = "test", w?: number): Promise<StoredImage> {
  const key = imageKey(prompt, style);
  let job = jobs.get(key);
  if (!job) {
    job = (async () => {
      const s = IMAGE_STYLES[style];
      try {
        const img = await generateImage(`${s.text}\nScene: ${prompt}`, { aspectRatio: s.aspect });
        log.ok = { at: Date.now(), style, mime: img.mime, bytes: img.data.length };
        remember(big, key, img, 24);
        await toDisk(key, img);
        return img;
      } catch (e) {
        log.error = { at: Date.now(), style, message: (e as Error).message || String(e) };
        throw e;
      }
    })().finally(() => jobs.delete(key));
    jobs.set(key, job);
  }
  return variant(key, await job, w, style);
}

/** Hozir chizilayotgan rasm (bo'lsa) — tugashini kutish uchun */
export function pendingImage(prompt: string, style: ImageStyle = "test"): Promise<StoredImage> | null {
  return jobs.get(imageKey(prompt, style)) ?? null;
}

/** Faqat testlar uchun */
export function clearImageMemory() {
  delete log.error;
  delete log.ok;
  big.clear();
  small.clear();
  jobs.clear();
  thumbJobs.clear();
}
