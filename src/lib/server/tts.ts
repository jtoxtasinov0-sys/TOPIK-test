import "server-only";
import { createHash } from "node:crypto";
import { synthesize } from "@/lib/gemini";
import { parseScript } from "@/lib/exam";
import type { TtsOpts } from "@/lib/speech";
import { chargeQuota } from "./guard";
import { trackUsage } from "./usage";
import type { User } from "./users";

// Gemini ovozi (TTS): /api/tts ham, erkin suhbat javobi (/api/talk oqimi) ham shu yerdan foydalanadi.
// Bir xil matn qayta-qayta so'ralganda Gemini'ga qayta murojaat qilinmaydi; bir vaqtda kelgan bir xil so'rovlar birlashtiriladi.

const cache = new Map<string, Buffer>();
const inflight = new Map<string, Promise<Buffer>>();

const keyOf = (text: string, o: TtsOpts) => createHash("sha1").update(`${o.slow ? 1 : 0}|${o.voice ?? ""}|${o.tutor ? "t" : o.talk ? "k" : ""}|${text}`).digest("hex");

/** Shu ovoz serverda tayyor turibdimi (yoki hozir tayyorlanyaptimi) */
export function hasSpeech(text: string, o: TtsOpts) {
  const key = keyOf(text, o);
  return cache.has(key) || inflight.has(key);
}

/** Matnni ovozga aylantiradi (WAV). Yangi ovoz uchun foydalanuvchining kunlik TTS limitidan ayiriladi */
export function speech(text: string, o: TtsOpts, user: User | null): Promise<Buffer> {
  const key = keyOf(text, o);
  const hit = cache.get(key);
  if (hit) return Promise.resolve(hit);
  const running = inflight.get(key);
  if (running) return running;
  const job = (async () => {
    // Tezlik: ovoz limit tekshiruvini (baza so'rovi) kutmasdan darhol tayyorlana boshlaydi — ikkalasi parallel.
    // Limit tugagan bo'lsa ovoz qaytarilmaydi (so'rovlar soni rateLimit va kirish tekshiruvi bilan cheklangan)
    const quota = chargeQuota(user, "tts");
    void trackUsage("tts").catch(() => {});
    // Ovozli ustoz (o'zbekcha + koreyscha) va erkin suhbat javobi — dialog emas, bitta ovoz bilan o'qiladi
    const turns = o.tutor || o.talk ? [{ speaker: null, text: text.trim() }] : parseScript(text);
    const [, buf] = await Promise.all([quota, synthesize(turns, { slow: !!o.slow, voice: o.voice, tutor: !!o.tutor, talk: !o.tutor && !!o.talk })]);
    cache.set(key, buf);
    if (cache.size > 400) cache.delete(cache.keys().next().value as string);
    return buf;
  })().finally(() => inflight.delete(key));
  inflight.set(key, job);
  return job;
}
