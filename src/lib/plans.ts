// Obuna tariflari va narxlari — server ham (to'lov so'rovi), brauzer ham (obuna sahifasi) shu fayldan foydalanadi.
// Narxni o'zgartirish uchun faqat shu jadvalni tahrirlang.

export type Region = "uz" | "kr";
export type PlanId = "m1" | "m3" | "m6";

export const PLANS: { id: PlanId; days: number; label: string; badge?: string }[] = [
  { id: "m1", days: 30, label: "1 oy" },
  { id: "m3", days: 90, label: "3 oy", badge: "Ommabop" },
  { id: "m6", days: 180, label: "6 oy", badge: "Eng foydali" },
];

/** price — oddiy narx; promo — ilk PROMO_LIMIT ta obunachi uchun (birinchi to'lovida) */
export const PRICES: Record<Region, Record<PlanId, { price: number; promo: number }>> = {
  // O'zbekiston — so'm
  uz: {
    m1: { price: 49_000, promo: 29_000 },
    m3: { price: 129_000, promo: 79_000 },
    m6: { price: 199_000, promo: 129_000 },
  },
  // Koreya — von (u yerda daromad yuqori, narx biroz qimmatroq)
  kr: {
    m1: { price: 12_900, promo: 7_900 },
    m3: { price: 32_900, promo: 19_900 },
    m6: { price: 54_900, promo: 34_900 },
  },
};

/** Chegirma necha kishiga (birinchi to'lov qilgan foydalanuvchilar soni bo'yicha) */
export const PROMO_LIMIT = 100;

export const REGIONS: { id: Region; flag: string; label: string }[] = [
  { id: "uz", flag: "🇺🇿", label: "O‘zbekiston" },
  { id: "kr", flag: "🇰🇷", label: "Koreya" },
];

export const planOf = (id: string | undefined) => PLANS.find((p) => p.id === id) ?? null;
export const isRegion = (r: unknown): r is Region => r === "uz" || r === "kr";

/** 49 000 so‘m / 12 900 ₩ */
export function fmtMoney(n: number, region: Region) {
  const s = String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return region === "uz" ? `${s} so‘m` : `${s} ₩`;
}

/** Narx: chegirma huquqi bo'lsa — chegirmali */
export const priceOf = (region: Region, plan: PlanId, promo: boolean) => (promo ? PRICES[region][plan].promo : PRICES[region][plan].price);
