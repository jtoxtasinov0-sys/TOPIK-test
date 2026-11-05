import "server-only";
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { generateImage } from "@/lib/gemini";
import { IMAGE_STYLES, type ImageStyle } from "@/lib/images";
import { shrinkPng } from "./png";

// Rasm keshi: xotira (tez) + disk. Dokploy'da /app/data/images (Volume) — qayta deploy'da o'chmaydi.
// Asl rasm (~1 MB) bir marta chiziladi; telefon uchun kichraytirilgan nusxalari (128–768 px) alohida saqlanadi.
// Disk yozib bo'lmasa (masalan Vercel), faqat xotirada saqlanadi.

export type StoredImage = { data: Buffer; mime: string };

const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const MIME = Object.fromEntries(Object.entries(EXT).map(([m, e]) => [e, m]));

const g = globalThis as unknown as {
  __hqImg?: Map<string, StoredImage>;
  __hqImgSmall?: Map<string, StoredImage>;
  __hqImgJobs?: Map<string, Promise<StoredImage>>;
};
const big = (g.__hqImg ??= new Map()); // asl rasmlar — og'ir, kam saqlanadi
const small = (g.__hqImgSmall ??= new Map()); // kichraytirilgan nusxalar
const jobs = (g.__hqImgJobs ??= new Map());

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

/** Kichraytirilgan nusxa: keshda bo'lmasa — asl rasmdan yasaladi (PNG bo'lmasa asl rasm qaytadi) */
async function variant(key: string, original: StoredImage, w?: number): Promise<StoredImage> {
  if (!w) return original;
  const name = `${key}-w${w}`;
  const hit = small.get(name);
  if (hit) return hit;
  const disk = await fromDisk(name);
  if (disk) {
    remember(small, name, disk, 400);
    return disk;
  }
  if (original.mime !== "image/png") return original;
  const png = shrinkPng(original.data, w);
  if (!png || png.length >= original.data.length) return original;
  const img = { data: png, mime: "image/png" };
  remember(small, name, img, 400);
  await toDisk(name, img);
  return img;
}

/** Keshdan olish (yangi rasm chizmasdan) */
export async function cachedImage(prompt: string, style: ImageStyle = "test", w?: number): Promise<StoredImage | null> {
  const key = imageKey(prompt, style);
  if (w) {
    const name = `${key}-w${w}`;
    const hit = small.get(name) ?? (await fromDisk(name));
    if (hit) {
      remember(small, name, hit, 400);
      return hit;
    }
  }
  const original = await cachedOriginal(key);
  return original ? variant(key, original, w) : null;
}

/** Keshda bo'lmasa — Gemini chizadi. Bir vaqtda kelgan bir xil so'rovlar bitta yaratishni kutadi */
export async function createImage(prompt: string, style: ImageStyle = "test", w?: number): Promise<StoredImage> {
  const key = imageKey(prompt, style);
  let job = jobs.get(key);
  if (!job) {
    job = (async () => {
      const s = IMAGE_STYLES[style];
      const img = await generateImage(`${s.text}\nScene: ${prompt}`, { aspectRatio: s.aspect });
      remember(big, key, img, 24);
      await toDisk(key, img);
      return img;
    })().finally(() => jobs.delete(key));
    jobs.set(key, job);
  }
  return variant(key, await job, w);
}

/** Faqat testlar uchun */
export function clearImageMemory() {
  big.clear();
  small.clear();
  jobs.clear();
}
