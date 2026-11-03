// Bepul sinov muddati va kirish huquqini hisoblash — server ham, brauzer ham shu fayldan foydalanadi.

// Bepul sinov necha kun: NEXT_PUBLIC_TRIAL_DAYS (masalan 14). Faqat yangi ro'yxatdan o'tganlarga ta'sir qiladi.
const envDays = Number(process.env.NEXT_PUBLIC_TRIAL_DAYS);
export const TRIAL_DAYS = Number.isInteger(envDays) && envDays > 0 && envDays <= 365 ? envDays : 30;
export const DAY_MS = 86_400_000;

export type AccessStatus = "trial" | "expired";
export type Access = {
  status: AccessStatus;
  /** AI imkoniyatlari shu vaqtgacha ochiq (ms) */
  until: number;
  daysLeft: number;
};

export function computeAccess(u: { trialEndsAt: number }, now = Date.now()): Access {
  const until = u.trialEndsAt || 0;
  return {
    status: until > now ? "trial" : "expired",
    until,
    daysLeft: until > now ? Math.ceil((until - now) / DAY_MS) : 0,
  };
}
