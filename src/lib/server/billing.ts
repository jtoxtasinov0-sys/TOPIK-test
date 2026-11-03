import "server-only";
import type { Plan, PlanId } from "@/lib/plans";
import { getStore, withLock } from "./store";
import { addDays, type User } from "./users";

// Buyurtmalar: foydalanuvchi tarifni tanlaydi → buyurtma yaratiladi → Payme/Click to'lovni tasdiqlaydi →
// markOrderPaid() obunani uzaytiradi. Avtomatik yechib olish yo'q: har safar oldindan to'lanadi.

export type Provider = "payme" | "click";
export type OrderStatus = "pending" | "paid" | "cancelled";
export type Order = {
  id: string;
  userId: string;
  email: string;
  planId: PlanId;
  days: number;
  /** so'mda */
  amount: number;
  provider: Provider;
  status: OrderStatus;
  createdAt: number;
  paidAt?: number;
  /** Qaysi tranzaksiya to'lagan, masalan "payme:6123..." yoki "click:2051..." */
  paidBy?: string;
};

const orderKey = (id: string) => `order:${id}`;
const userOrdersKey = (uid: string) => `uorders:${uid}`;
export const PAID_INDEX = "orders:paid";
const PENDING_TTL = 7 * 86400;

export function providers() {
  return {
    payme: !!(process.env.PAYME_MERCHANT_ID && process.env.PAYME_KEY),
    click: !!(process.env.CLICK_SERVICE_ID && process.env.CLICK_MERCHANT_ID && process.env.CLICK_SECRET_KEY),
  };
}

/** Faqat raqamlardan iborat ID — Payme/Click hisob maydoniga mos */
export function newOrderId(now = Date.now()) {
  return `${now}${Math.floor(Math.random() * 900 + 100)}`;
}

export async function createOrder(user: User, plan: Plan, provider: Provider, now = Date.now()) {
  const kv = getStore();
  const o: Order = {
    id: newOrderId(now),
    userId: user.id,
    email: user.email,
    planId: plan.id,
    days: plan.days,
    amount: plan.price,
    provider,
    status: "pending",
    createdAt: now,
  };
  await kv.set(orderKey(o.id), o, { ttlSec: PENDING_TTL });
  await kv.zadd(userOrdersKey(user.id), now, o.id);
  return o;
}

export async function getOrder(id: unknown) {
  if (typeof id !== "string" && typeof id !== "number") return null;
  const s = String(id);
  if (!/^\d{6,24}$/.test(s)) return null;
  return getStore().get<Order>(orderKey(s));
}

/**
 * Buyurtmani to'langan deb belgilaydi va obunani uzaytiradi.
 * Idempotent: qayta chaqirilsa kunlar ikkinchi marta qo'shilmaydi.
 * Buyurtma oldin boshqa tranzaksiya bilan to'langan bo'lsa, o'sha holicha qaytadi (paidBy'ni tekshiring).
 */
export async function markOrderPaid(id: string, ref: string, now = Date.now()): Promise<Order | null> {
  const kv = getStore();
  return withLock(`order:${id}`, async () => {
    const o = await getOrder(id);
    if (!o) return null;
    if (o.status === "paid") return o;
    // "applied" belgisi: kunlar qo'shilgan-u, status yozilmay qolgan holatda ham qayta qo'shilmaydi
    if (await kv.set(`order-applied:${id}`, now, { nx: true })) {
      try {
        const u = await addDays(o.userId, o.days, now);
        if (!u) throw new Error("Foydalanuvchi topilmadi");
      } catch (e) {
        await kv.del(`order-applied:${id}`);
        throw e;
      }
    }
    const paid: Order = { ...o, status: "paid", paidAt: now, paidBy: ref };
    await kv.set(orderKey(id), paid); // TTL'siz — abadiy saqlanadi
    await kv.zadd(PAID_INDEX, now, id);
    return paid;
  });
}

export async function userOrders(uid: string, limit = 10) {
  const kv = getStore();
  const ids = await kv.zrange(userOrdersKey(uid), { rev: true, limit });
  const list = await Promise.all(ids.map((id) => kv.get<Order>(orderKey(id))));
  return list.filter((o): o is Order => !!o);
}

export async function recentPaidOrders(opts: { since?: number; limit?: number } = {}) {
  const kv = getStore();
  const ids = await kv.zrange(PAID_INDEX, { rev: true, min: opts.since, limit: opts.limit });
  const list = await Promise.all(ids.map((id) => kv.get<Order>(orderKey(id))));
  return list.filter((o): o is Order => !!o);
}

// ---------------- To'lov sahifasi havolalari ----------------
export function paymeCheckoutUrl(o: Order, returnUrl: string, lang: "uz" | "ru") {
  const field = process.env.PAYME_ACCOUNT_FIELD || "order_id";
  const params = [`m=${process.env.PAYME_MERCHANT_ID}`, `ac.${field}=${o.id}`, `a=${o.amount * 100}`, `l=${lang}`, `c=${returnUrl}`].join(";");
  const host = process.env.PAYME_TEST === "1" ? "https://checkout.test.paycom.uz" : "https://checkout.paycom.uz";
  return `${host}/${Buffer.from(params).toString("base64")}`;
}

export function clickCheckoutUrl(o: Order, returnUrl: string) {
  const q = new URLSearchParams({
    service_id: process.env.CLICK_SERVICE_ID ?? "",
    merchant_id: process.env.CLICK_MERCHANT_ID ?? "",
    amount: String(o.amount),
    transaction_param: o.id,
    return_url: returnUrl,
  });
  return `https://my.click.uz/services/pay?${q}`;
}
