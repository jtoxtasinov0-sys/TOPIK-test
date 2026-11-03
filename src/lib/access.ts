// Bepul sinov muddati va kirish huquqini hisoblash — server ham, brauzer ham shu fayldan foydalanadi.

export const TRIAL_DAYS = 30;
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
