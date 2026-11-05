import "server-only";
import { DAY_MS } from "@/lib/access";
import { getStore } from "./store";

// Faollik statistikasi: har kun uchun hodisalar soni (faqat sonlar, shaxsiy ma'lumotsiz). 120 kun saqlanadi.
// Maqsad: qaysi bo'lim ko'p ishlatilishini va sinovi tugab AI so'raganlar sonini /admin da ko'rish.

export const USAGE_EVENTS = [
  "test_topik1", // TOPIK I mock test yakunlandi
  "test_topik2", // TOPIK II mock test yakunlandi
  "test_eps", // EPS-TOPIK mock test yakunlandi
  "explain",
  "writing",
  "speak",
  "tutor",
  "generate",
  "tts",
  "image", // Gemini chizgan yangi test rasmi
  "need_login", // kirmasdan AI funksiyasini bosgan
  "trial_over", // bepul sinovi tugagan, lekin AI funksiyasini bosgan
] as const;
export type UsageEvent = (typeof USAGE_EVENTS)[number];

/** Brauzer yuborishi mumkin bo'lgan hodisalar (qolganlari serverning o'zida hisoblanadi) */
export const CLIENT_EVENTS: readonly UsageEvent[] = ["test_topik1", "test_topik2", "test_eps"];

const KEEP_SEC = 120 * 86400;
const dayKey = (ms: number) => `usage:${new Date(ms).toISOString().slice(0, 10)}`;

/** Statistika xatosi asosiy ishni (AI javobini) buzmasligi kerak — xato jim o'tkazib yuboriladi */
export async function trackUsage(event: UsageEvent, now = Date.now()) {
  try {
    await getStore().hincr(dayKey(now), event, KEEP_SEC);
  } catch {}
}

export type UsageTotals = Partial<Record<UsageEvent, number>>;

/** Bugun, oxirgi 7 kun va oxirgi 30 kun bo'yicha jami */
export async function usageSummary(now = Date.now()) {
  const kv = getStore();
  const days = await Promise.all(Array.from({ length: 30 }, (_, i) => kv.hgetall(dayKey(now - i * DAY_MS))));
  const sum = (n: number) => {
    const out: UsageTotals = {};
    for (const h of days.slice(0, n)) {
      for (const [k, v] of Object.entries(h)) {
        if ((USAGE_EVENTS as readonly string[]).includes(k)) out[k as UsageEvent] = (out[k as UsageEvent] ?? 0) + v;
      }
    }
    return out;
  };
  return { today: sum(1), week: sum(7), month: sum(30) };
}
