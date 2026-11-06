import "server-only";
import { randomBytes, randomInt } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { DAY_MS } from "@/lib/access";
import { AiError } from "@/lib/gemini";
import { fmtMoney, planOf, priceOf, PROMO_LIMIT, type PlanId, type Region } from "@/lib/plans";
import { getStore } from "./store";
import { findUserByEmail, getUser, saveUser, type User } from "./users";

// Qo'lda tasdiqlanadigan obuna to'lovlari:
//  1) foydalanuvchi tarif tanlaydi → shaxsiy kodli so'rov (O'zbekiston: summaning oxirgi 3 raqami, Koreya: 입금자명);
//  2) kartaga o'tkazadi va «To'ladim» bosadi (chek rasmi bilan) → admin Telegram'da xabar oladi;
//  3) admin bank ilovasida tushumni tekshirib, admin panelda tasdiqlaydi → obuna muddati uzayadi.

/** new — kod berildi, to'lov kutilmoqda; paid — «To'ladim» bosildi (tekshirilmoqda); cancelled — foydalanuvchi bekor qildi */
export type PayStatus = "new" | "paid" | "approved" | "rejected" | "cancelled";

export type Payment = {
  id: string;
  uid: string;
  email: string;
  region: Region;
  plan: PlanId;
  days: number;
  /** O'tkazilishi kerak bo'lgan aniq summa (so'm yoki von) */
  amount: number;
  /** Ilk 100 kishilik chegirma narxi */
  promo: boolean;
  /** Shaxsiy to'lov kodi (100–999) */
  code: string;
  status: PayStatus;
  createdAt: number;
  paidAt?: number;
  doneAt?: number;
  /** Tasdiqlangandan keyin obuna shu vaqtgacha */
  until?: number;
  receipt?: "disk" | "kv";
  receiptMime?: string;
  /** Admin qo'lda bergan (sovg'a / tuzatish) — tushum va chegirma hisobiga kirmaydi */
  manual?: boolean;
  note?: string;
};

const payKey = (id: string) => `pay:${id}`;
const openKey = (uid: string) => `payopen:${uid}`;
const receiptKvKey = (id: string) => `receipt:${id}`;
export const PAYMENTS_INDEX = "payments";
/** Kamida bir marta to'lagan foydalanuvchilar (chegirma hisoblagichi) */
export const PAID_USERS = "paidusers";

/** Karta / hisob raqamlari — server sozlamalaridan (Dokploy → Environment) */
export function payConfig() {
  const uz = process.env.PAY_UZ_CARD?.trim();
  const kr = process.env.PAY_KR_ACCOUNT?.trim();
  return {
    uz: uz ? { number: uz, name: process.env.PAY_UZ_NAME?.trim() ?? "" } : null,
    kr: kr ? { number: kr, name: process.env.PAY_KR_NAME?.trim() ?? "" } : null,
    /** Savol va muammolar uchun (masalan, Telegram: @hanustoz_admin) */
    contact: process.env.PAY_CONTACT?.trim() ?? "",
  };
}

export const krDepositName = (code: string) => `HU${code}`;

export async function promoLeft() {
  return Math.max(0, PROMO_LIMIT - (await getStore().zcard(PAID_USERS)));
}

export async function getPayment(id: string) {
  return /^[a-z0-9]{6,32}$/.test(id) ? getStore().get<Payment>(payKey(id)) : null;
}

const isOpen = (p: Payment | null) => !!p && (p.status === "new" || p.status === "paid");

/** Foydalanuvchining hali ko'rib chiqilmagan so'rovi */
export async function openPayment(uid: string) {
  const id = await getStore().get<string>(openKey(uid));
  const p = id ? await getPayment(id) : null;
  return isOpen(p) ? p : null;
}

async function save(p: Payment) {
  await getStore().set(payKey(p.id), p);
  return p;
}

/** Yangi to'lov so'rovi: narx (chegirma huquqi bo'lsa — chegirmali) va shaxsiy kod */
export async function startPayment(user: User, region: Region, planId: string, now = Date.now()) {
  const plan = planOf(planId);
  if (!plan) throw new AiError("Tarif noto‘g‘ri", 400);
  const old = await openPayment(user.id);
  if (old?.status === "paid") throw new AiError("To‘lovingiz tekshirilmoqda — tasdiqlangach yangi tarif tanlashingiz mumkin", 409, "PENDING");
  if (old) await save({ ...old, status: "cancelled", doneAt: now });
  const promo = !user.firstPaidAt && (await promoLeft()) > 0;
  const code = String(randomInt(100, 1000));
  const base = priceOf(region, plan.id, promo);
  const p: Payment = {
    id: randomBytes(9).toString("hex"),
    uid: user.id,
    email: user.email,
    region,
    plan: plan.id,
    days: plan.days,
    // O'zbekistonda kod summaga qo'shiladi (49 137 so'm) — tushumni bank ilovasida darhol topish uchun
    amount: region === "uz" ? base + Number(code) : base,
    promo,
    code,
    status: "new",
    createdAt: now,
  };
  await save(p);
  await getStore().zadd(PAYMENTS_INDEX, now, p.id);
  await getStore().set(openKey(user.id), p.id);
  return p;
}

// ---------- Chek rasmi ----------
const RECEIPT_MIME: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_RECEIPT = 3_000_000;

export function receiptDir() {
  if (process.env.RECEIPT_DIR) return process.env.RECEIPT_DIR;
  const db = process.env.FILE_DB_PATH || path.join(process.cwd(), ".data", "db.json");
  return path.join(path.dirname(db), "receipts");
}

/** Faqat haqiqiy rasm (JPEG / PNG / WebP) va 3 MB gacha */
export function checkReceipt(data: Buffer, mime: string) {
  const ok =
    (mime === "image/jpeg" && data[0] === 0xff && data[1] === 0xd8) ||
    (mime === "image/png" && data.subarray(0, 4).toString("hex") === "89504e47") ||
    (mime === "image/webp" && data.subarray(0, 4).toString("ascii") === "RIFF" && data.subarray(8, 12).toString("ascii") === "WEBP");
  if (!ok) throw new AiError("Chek rasmi JPG, PNG yoki WebP bo‘lishi kerak", 400);
  if (data.length > MAX_RECEIPT) throw new AiError("Chek rasmi juda katta (3 MB gacha)", 400);
}

async function saveReceipt(id: string, r: { data: Buffer; mime: string }): Promise<"disk" | "kv"> {
  try {
    const dir = receiptDir();
    await mkdir(dir, { recursive: true });
    const file = path.join(dir, `${id}.${RECEIPT_MIME[r.mime]}`);
    await writeFile(`${file}.tmp`, r.data);
    await rename(`${file}.tmp`, file);
    return "disk";
  } catch {
    // Disk yozilmaydigan serverda (masalan, Vercel) — bazada, 6 oy saqlanadi
    await getStore().set(receiptKvKey(id), { mime: r.mime, data: r.data.toString("base64") }, { ttlSec: 180 * 86_400 });
    return "kv";
  }
}

export async function readReceipt(p: Payment): Promise<{ data: Buffer; mime: string } | null> {
  if (!p.receipt || !p.receiptMime) return null;
  if (p.receipt === "disk") {
    try {
      return { data: await readFile(path.join(receiptDir(), `${p.id}.${RECEIPT_MIME[p.receiptMime] ?? "jpg"}`)), mime: p.receiptMime };
    } catch {
      return null;
    }
  }
  const r = await getStore().get<{ mime: string; data: string }>(receiptKvKey(p.id));
  return r ? { data: Buffer.from(r.data, "base64"), mime: r.mime } : null;
}

/** «To'ladim»: so'rov tekshiruvga yuboriladi (chek rasmi bilan yoki usiz). Chekni keyinroq qo'shish ham mumkin */
export async function submitPayment(user: User, id: string, receipt?: { data: Buffer; mime: string }, now = Date.now()) {
  const p = await getPayment(id);
  if (!p || p.uid !== user.id) throw new AiError("To‘lov topilmadi", 404);
  if (!isOpen(p)) throw new AiError("Bu to‘lov allaqachon ko‘rib chiqilgan", 409);
  const first = p.status === "new";
  const next: Payment = { ...p, status: "paid", paidAt: p.paidAt ?? now };
  if (receipt) {
    checkReceipt(receipt.data, receipt.mime);
    next.receipt = await saveReceipt(p.id, receipt);
    next.receiptMime = receipt.mime;
  }
  await save(next);
  if (first || receipt) void notifyAdmin(next, !first);
  return next;
}

export async function cancelPayment(user: User, id: string, now = Date.now()) {
  const p = await getPayment(id);
  if (!p || p.uid !== user.id) throw new AiError("To‘lov topilmadi", 404);
  if (p.status !== "new") throw new AiError("Bu to‘lovni bekor qilib bo‘lmaydi", 409);
  await getStore().del(openKey(user.id));
  return save({ ...p, status: "cancelled", doneAt: now });
}

// ---------- Admin ----------
/** Obunani uzaytirish: sinov yoki oldingi obuna tugashidan keyin qo'shiladi (kunlar yo'qolmaydi) */
async function extend(u: User, days: number, now: number, paid: boolean) {
  const start = Math.max(now, u.paidUntil ?? 0, u.trialEndsAt ?? 0);
  const until = start + days * DAY_MS;
  await saveUser({ ...u, paidUntil: until, firstPaidAt: u.firstPaidAt ?? (paid ? now : undefined) });
  if (paid && !u.firstPaidAt) await getStore().zadd(PAID_USERS, now, u.id);
  return until;
}

export async function approvePayment(id: string, now = Date.now()) {
  const p = await getPayment(id);
  if (!p) throw new AiError("To‘lov topilmadi", 404);
  if (p.status === "approved") return p;
  if (p.status === "cancelled") throw new AiError("Foydalanuvchi bu so‘rovni bekor qilgan", 409);
  const u = await getUser(p.uid);
  if (!u) throw new AiError("Foydalanuvchi topilmadi", 404);
  const until = await extend(u, p.days, now, true);
  if ((await getStore().get<string>(openKey(p.uid))) === p.id) await getStore().del(openKey(p.uid));
  return save({ ...p, status: "approved", doneAt: now, until });
}

export async function rejectPayment(id: string, note = "", now = Date.now()) {
  const p = await getPayment(id);
  if (!p) throw new AiError("To‘lov topilmadi", 404);
  if (p.status === "approved") throw new AiError("Tasdiqlangan to‘lovni rad etib bo‘lmaydi", 409);
  if ((await getStore().get<string>(openKey(p.uid))) === p.id) await getStore().del(openKey(p.uid));
  return save({ ...p, status: "rejected", doneAt: now, note: note.slice(0, 200) || p.note });
}

/** Qo'lda obuna berish (sovg'a, naqd to'lov, tuzatish): tushum va chegirma hisobiga kirmaydi */
export async function grantDays(email: string, days: number, note = "", now = Date.now()) {
  if (!Number.isInteger(days) || days < 1 || days > 730) throw new AiError("Kunlar soni 1–730 bo‘lishi kerak", 400);
  const u = await findUserByEmail(email);
  if (!u) throw new AiError("Bunday Gmail topilmadi — foydalanuvchi avval saytga kirishi kerak", 404);
  const until = await extend(u, days, now, false);
  const p: Payment = {
    id: randomBytes(9).toString("hex"),
    uid: u.id,
    email: u.email,
    region: "uz",
    plan: "m1",
    days,
    amount: 0,
    promo: false,
    code: "",
    status: "approved",
    createdAt: now,
    doneAt: now,
    until,
    manual: true,
    note: note.slice(0, 200) || "Qo‘lda berildi",
  };
  await save(p);
  await getStore().zadd(PAYMENTS_INDEX, now, p.id);
  return p;
}

/** To'lovlar ro'yxati (yangilari birinchi) */
export async function listPayments(o: { from?: number; to?: number; limit?: number } = {}) {
  const ids = await getStore().zrange(PAYMENTS_INDEX, { min: o.from, max: o.to, rev: true, limit: o.limit });
  return (await Promise.all(ids.map(getPayment))).filter((p): p is Payment => !!p);
}

/** Tasdiqlangan haqiqiy to'lovlar bo'yicha tushum (hudud valyutasida) */
export function revenueOf(list: Payment[]) {
  const out: Record<Region, number> = { uz: 0, kr: 0 };
  for (const p of list) if (p.status === "approved" && !p.manual) out[p.region] += p.amount;
  return out;
}

// ---------- Telegram xabari (ixtiyoriy) ----------
/** TELEGRAM_BOT_TOKEN va TELEGRAM_CHAT_ID berilgan bo'lsa — har bir «To'ladim» haqida adminga xabar */
async function notifyAdmin(p: Payment, receiptOnly: boolean) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chat = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chat) return;
  const plan = planOf(p.plan)?.label ?? p.plan;
  const app = (process.env.APP_URL ?? "").replace(/\/+$/, "");
  const text = [
    receiptOnly ? "🧾 Chek qo‘shildi" : "💳 Yangi to‘lov — tekshiring",
    `${p.region === "uz" ? "🇺🇿" : "🇰🇷"} ${p.email}`,
    `${plan} · ${fmtMoney(p.amount, p.region)}${p.promo ? " (chegirma)" : ""}`,
    p.region === "uz" ? `Kod: ${p.code} (summaning oxirgi 3 raqami)` : `입금자명: ${krDepositName(p.code)}`,
    p.receipt ? "Chek rasmi bor" : "Chek rasmi yo‘q",
    app ? `${app}/admin` : "",
  ]
    .filter(Boolean)
    .join("\n");
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {}
}
