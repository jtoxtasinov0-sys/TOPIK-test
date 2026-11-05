import "server-only";
import { TRIAL_DAYS } from "@/lib/access";
import { AiError } from "@/lib/gemini";
import { readSession } from "./session";
import { getStore } from "./store";
import { trackUsage } from "./usage";
import { canUseAi, getUser, isAdminEmail, type User } from "./users";

/** Google login sozlanganmi. Sozlanmagan bo'lsa ilova eski "ochiq" rejimda ishlaydi (lokal ishlab chiqish uchun). */
export function authEnabled() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export async function currentUser(req: Request): Promise<User | null> {
  const s = readSession(req);
  return s ? getUser(s.uid) : null;
}

/** Faqat admin (ADMIN_EMAILS) uchun yo'llar */
export async function requireAdmin(req: Request) {
  const me = await currentUser(req);
  if (!me) throw new AiError("Kirish talab qilinadi", 401, "AUTH");
  if (!isAdminEmail(me.email)) throw new AiError("Faqat admin uchun", 403, "FORBIDDEN");
  return me;
}

/** Bitta foydalanuvchi uchun kunlik "adolatli foydalanish" limitlari (AI xarajatini nazorat qilish uchun) */
export const DAILY_LIMITS = {
  explain: 150,
  writing: 25,
  speak: 200,
  talk: 300, // erkin suhbat: qisqa va tez-tez xabarlar
  tutor: 120,
  generate: 400, // bitta to'liq AI variant ~40-60 so'rov
  tts: 800,
  image: 80, // AI variantlardagi rasmlar (tayyor variant rasmlari limitga kirmaydi)
} as const;
export type Bucket = keyof typeof DAILY_LIMITS;

/**
 * AI funksiyalari uchun tekshiruv: foydalanuvchi kirgan va bepul sinovi tugamagan bo'lishi shart.
 * Auth sozlanmagan bo'lsa — null (ochiq rejim).
 */
export async function requireAiAccess(req: Request): Promise<User | null> {
  if (!authEnabled()) return null;
  const user = await currentUser(req);
  if (!user) throw new AiError(`Bu funksiya uchun Google orqali kiring — ${TRIAL_DAYS} kun bepul`, 401, "AUTH");
  if (!canUseAi(user)) throw new AiError("Bepul sinov muddati tugagan", 402, "PAYWALL");
  return user;
}

/** Kunlik limitdan bitta so'rovni ayiradi */
export async function chargeQuota(user: User | null, bucket: Bucket) {
  if (!user || isAdminEmail(user.email)) return;
  const day = new Date().toISOString().slice(0, 10);
  const n = await getStore().incr(`q:${user.id}:${bucket}:${day}`, 2 * 86400);
  if (n > DAILY_LIMITS[bucket]) throw new AiError("Bugungi AI limiti tugadi. Ertaga yana davom eting", 429, "QUOTA");
}

/** requireAiAccess + chargeQuota + statistika (TTS bundan foydalanmaydi — u avtomatik so'raladi) */
export async function aiAccess(req: Request, bucket: Bucket) {
  let user: User | null;
  try {
    user = await requireAiAccess(req);
  } catch (e) {
    // Kirmasdan yoki sinovi tugab AI so'raganlar soni — to'lov ulanganda eng muhim ko'rsatkich
    if (e instanceof AiError && e.status === 401) await trackUsage("need_login");
    if (e instanceof AiError && e.status === 402) await trackUsage("trial_over");
    throw e;
  }
  await chargeQuota(user, bucket);
  await trackUsage(bucket);
  return user;
}
