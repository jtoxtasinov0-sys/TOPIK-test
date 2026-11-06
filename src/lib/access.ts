// Bepul sinov, obuna muddati va kirish huquqini hisoblash — server ham, brauzer ham shu fayldan foydalanadi.

// Bepul sinov necha kun: NEXT_PUBLIC_TRIAL_DAYS (masalan 14). Faqat yangi ro'yxatdan o'tganlarga ta'sir qiladi.
const envDays = Number(process.env.NEXT_PUBLIC_TRIAL_DAYS);
export const TRIAL_DAYS = Number.isInteger(envDays) && envDays > 0 && envDays <= 365 ? envDays : 7;
export const DAY_MS = 86_400_000;

/** trial — bepul sinov; paid — to'langan obuna; expired — ikkalasi ham tugagan */
export type AccessStatus = "trial" | "paid" | "expired";
export type Access = {
  status: AccessStatus;
  /** AI imkoniyatlari shu vaqtgacha ochiq (ms) */
  until: number;
  daysLeft: number;
};

export function computeAccess(u: { trialEndsAt: number; paidUntil?: number }, now = Date.now()): Access {
  const paid = u.paidUntil || 0;
  const trial = u.trialEndsAt || 0;
  // Obuna sinov tugagandan keyin boshlanadi (sinov kunlari yo'qolmaydi) — shuning uchun obuna har doim keyinroq tugaydi
  const status: AccessStatus = paid > now ? "paid" : trial > now ? "trial" : "expired";
  const until = status === "paid" ? paid : trial;
  return { status, until, daysLeft: until > now ? Math.ceil((until - now) / DAY_MS) : 0 };
}
