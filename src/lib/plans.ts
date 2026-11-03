// Tariflar, narxlar va kirish huquqini hisoblash — server ham, brauzer ham shu fayldan foydalanadi.
// Narxni o'zgartirish uchun faqat shu yerdagi PLANS ro'yxatini tahrirlang.

export const TRIAL_DAYS = 30;
export const DAY_MS = 86_400_000;

export type PlanId = "m1" | "m3" | "m6";
export type Plan = {
  id: PlanId;
  months: number;
  days: number;
  /** Narx so'mda */
  price: number;
  badge?: "popular" | "best";
};

export const PLANS: Plan[] = [
  { id: "m1", months: 1, days: 30, price: 49_000 },
  { id: "m3", months: 3, days: 90, price: 129_000, badge: "popular" },
  { id: "m6", months: 6, days: 180, price: 229_000, badge: "best" },
];

export const MONTHLY_PRICE = PLANS[0].price;

export function planById(id: unknown): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}

/** 49000 → "49 000" (server va brauzerda bir xil chiqishi uchun Intl ishlatilmaydi) */
export function formatSum(n: number) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** Oyiga o'rtacha narx (chegirmani ko'rsatish uchun) */
export function perMonth(p: Plan) {
  return Math.round(p.price / p.months / 100) * 100;
}

export function discountPct(p: Plan) {
  const full = MONTHLY_PRICE * p.months;
  return full > p.price ? Math.round((1 - p.price / full) * 100) : 0;
}

export type AccessStatus = "trial" | "active" | "expired";
export type Access = {
  status: AccessStatus;
  /** Kirish huquqi shu vaqtgacha (ms) */
  until: number;
  daysLeft: number;
  trialEndsAt: number;
  paidUntil: number;
};

export function computeAccess(u: { trialEndsAt: number; paidUntil: number }, now = Date.now()): Access {
  const trialEndsAt = u.trialEndsAt || 0;
  const paidUntil = u.paidUntil || 0;
  const until = Math.max(trialEndsAt, paidUntil);
  const status: AccessStatus = paidUntil > now ? "active" : trialEndsAt > now ? "trial" : "expired";
  const daysLeft = until > now ? Math.ceil((until - now) / DAY_MS) : 0;
  return { status, until, daysLeft, trialEndsAt, paidUntil };
}

/**
 * To'lovdan keyin obuna qachongacha bo'lishi: sinov yoki oldingi to'lov tugashini kutib,
 * keyin qo'shiladi — foydalanuvchi bironta kunini yo'qotmaydi.
 */
export function extendedUntil(u: { trialEndsAt: number; paidUntil: number }, days: number, now = Date.now()) {
  return Math.max(now, u.trialEndsAt || 0, u.paidUntil || 0) + days * DAY_MS;
}
