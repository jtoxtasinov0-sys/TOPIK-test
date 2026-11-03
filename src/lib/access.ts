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

/** Admin sinovni uzaytirganda: bugundan yoki hozirgi tugash sanasidan (qaysi biri keyin bo'lsa) qo'shiladi. Manfiy son — qisqartirish. */
export function extendTrial(trialEndsAt: number, days: number, now = Date.now()) {
  return days >= 0 ? Math.max(now, trialEndsAt || 0) + days * DAY_MS : Math.max(0, (trialEndsAt || 0) + days * DAY_MS);
}
