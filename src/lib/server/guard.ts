import "server-only";
import { AiError } from "@/lib/gemini";
import { readSession } from "./session";
import { getStore } from "./store";
import { canUsePremium, getUser, isAdminEmail, type User } from "./users";

/** Google login sozlanganmi. Sozlanmagan bo'lsa ilova eski "ochiq" rejimda ishlaydi (lokal ishlab chiqish uchun). */
export function authEnabled() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export async function currentUser(req: Request): Promise<User | null> {
  const s = readSession(req);
  return s ? getUser(s.uid) : null;
}

/** Bitta foydalanuvchi uchun kunlik "adolatli foydalanish" limitlari (AI xarajatini nazorat qilish uchun) */
export const DAILY_LIMITS = {
  explain: 150,
  writing: 25,
  speak: 200,
  tutor: 120,
  generate: 400, // bitta to'liq AI variant ~40-60 so'rov
  tts: 800,
} as const;
export type Bucket = keyof typeof DAILY_LIMITS;

/**
 * AI funksiyalari uchun tekshiruv: foydalanuvchi kirgan va sinov/obunasi faol bo'lishi shart.
 * Auth sozlanmagan bo'lsa — null (ochiq rejim).
 */
export async function requirePremium(req: Request): Promise<User | null> {
  if (!authEnabled()) return null;
  const user = await currentUser(req);
  if (!user) throw new AiError("Bu funksiya uchun Google orqali kiring — 30 kun bepul", 401, "AUTH");
  if (!canUsePremium(user)) throw new AiError("Bepul sinov muddati tugagan. Davom etish uchun obunani faollashtiring", 402, "PAYWALL");
  return user;
}

/** Kunlik limitdan bitta so'rovni ayiradi */
export async function chargeQuota(user: User | null, bucket: Bucket) {
  if (!user || isAdminEmail(user.email)) return;
  const day = new Date().toISOString().slice(0, 10);
  const n = await getStore().incr(`q:${user.id}:${bucket}:${day}`, 2 * 86400);
  if (n > DAILY_LIMITS[bucket]) throw new AiError("Bugungi AI limiti tugadi. Ertaga yana davom eting", 429, "QUOTA");
}

/** requirePremium + chargeQuota */
export async function premium(req: Request, bucket: Bucket) {
  const user = await requirePremium(req);
  await chargeQuota(user, bucket);
  return user;
}
