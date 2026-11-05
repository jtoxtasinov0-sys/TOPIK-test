import "server-only";
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { generateImage } from "@/lib/gemini";
import { IMAGE_STYLE, IMAGE_STYLE_VERSION } from "@/lib/images";

// Rasm keshi: xotira (tez) + disk. Dokploy'da /app/data/images (Volume) — qayta deploy'da o'chmaydi.
// Disk yozib bo'lmasa (masalan Vercel), faqat xotirada saqlanadi.

export type StoredImage = { data: Buffer; mime: string };

const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const MIME = Object.fromEntries(Object.entries(EXT).map(([m, e]) => [e, m]));

const g = globalThis as unknown as { __hqImg?: Map<string, StoredImage>; __hqImgJobs?: Map<string, Promise<StoredImage>> };
const mem = (g.__hqImg ??= new Map());
const jobs = (g.__hqImgJobs ??= new Map());

export function imageDir() {
  if (process.env.IMAGE_DIR) return process.env.IMAGE_DIR;
  const db = process.env.FILE_DB_PATH || path.join(process.cwd(), ".data", "db.json");
  return path.join(path.dirname(db), "images");
}

export const imageKey = (prompt: string) => createHash("sha1").update(`${IMAGE_STYLE_VERSION}|${prompt}`).digest("hex");

function remember(key: string, img: StoredImage) {
  mem.set(key, img);
  if (mem.size > 80) mem.delete(mem.keys().next().value as string);
}

async function fromDisk(key: string): Promise<StoredImage | null> {
  for (const ext of Object.keys(MIME)) {
    try {
      const data = await readFile(path.join(imageDir(), `${key}.${ext}`));
      return { data, mime: MIME[ext] };
    } catch {}
  }
  return null;
}

async function toDisk(key: string, img: StoredImage) {
  try {
    const dir = imageDir();
    await mkdir(dir, { recursive: true });
    const file = path.join(dir, `${key}.${EXT[img.mime] ?? "png"}`);
    await writeFile(`${file}.tmp`, img.data);
    await rename(`${file}.tmp`, file);
  } catch {}
}

/** Keshdan olish (yaratmasdan) */
export async function cachedImage(prompt: string): Promise<StoredImage | null> {
  const key = imageKey(prompt);
  const hit = mem.get(key);
  if (hit) return hit;
  const disk = await fromDisk(key);
  if (disk) remember(key, disk);
  return disk;
}

/** Keshda bo'lmasa — Gemini chizadi. Bir vaqtda kelgan bir xil so'rovlar bitta yaratishni kutadi */
export async function createImage(prompt: string): Promise<StoredImage> {
  const key = imageKey(prompt);
  const running = jobs.get(key);
  if (running) return running;
  const job = (async () => {
    const img = await generateImage(`${IMAGE_STYLE}\nScene: ${prompt}`);
    remember(key, img);
    await toDisk(key, img);
    return img;
  })().finally(() => jobs.delete(key));
  jobs.set(key, job);
  return job;
}

/** Faqat testlar uchun */
export function clearImageMemory() {
  mem.clear();
  jobs.clear();
}
