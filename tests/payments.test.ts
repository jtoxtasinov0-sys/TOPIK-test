// Obuna to'lovlari testi: tarif tanlash → shaxsiy kod → «To'ladim» (chek rasmi) → admin tasdiqlaydi → AI ochiladi.
// Chegirma (ilk 100 kishi), Koreya hisobi, rad etish, qo'lda berish va PDF hisobot.

import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, before, describe, test } from "node:test";

process.env.AUTH_SECRET = "test-secret-0123456789abcdef";
process.env.GOOGLE_CLIENT_ID = "cid.apps.googleusercontent.com";
process.env.GOOGLE_CLIENT_SECRET = "csecret";
process.env.ADMIN_EMAILS = "boss@gmail.com";
process.env.PAY_UZ_CARD = "8600 1111 2222 3333";
process.env.PAY_UZ_NAME = "ALIYEV VALI";
process.env.PAY_KR_ACCOUNT = "KB국민 123456-01-123456";
process.env.PAY_KR_NAME = "ALIYEV VALI";
process.env.PAY_CONTACT = "@hanustoz_admin";
process.env.TELEGRAM_BOT_TOKEN = "123:abc";
process.env.TELEGRAM_CHAT_ID = "777";
process.env.RECEIPT_DIR = path.join(await mkdtemp(path.join(tmpdir(), "hq-receipts-")), "r");

const { createMemoryStore, setStore, getStore } = await import("../src/lib/server/store");
const { signToken, SESSION_COOKIE } = await import("../src/lib/server/session");
const users = await import("../src/lib/server/users");
const payRoute = await import("../src/app/api/pay/route");
const adminPay = await import("../src/app/api/admin/payments/route");
const receiptRoute = await import("../src/app/api/admin/receipt/route");
const reportRoute = await import("../src/app/api/admin/report/route");
const meRoute = await import("../src/app/api/me/route");
const { PAID_USERS } = await import("../src/lib/server/payments");
const { DAY_MS } = await import("../src/lib/access");
const { PRICES } = await import("../src/lib/plans");

const BASE = "https://hanustoz.uz";
const realFetch = globalThis.fetch;
let telegram: { url: string; body: { chat_id: string; text: string } }[] = [];
let ip = 0;

const cookie = (uid: string) => `${SESSION_COOKIE}=${signToken({ uid }, 3600)}`;
const req = (pathName: string, uid?: string, body?: unknown) =>
  new Request(`${BASE}${pathName}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": `10.7.0.${++ip}`, ...(uid ? { cookie: cookie(uid) } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as Record<string, any> }); // eslint-disable-line @typescript-eslint/no-explicit-any
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200, 7)]);

before(async () => {
  setStore(createMemoryStore());
  const old = Date.now() - 30 * DAY_MS; // sinovi allaqachon tugagan
  await users.upsertGoogleUser({ sub: "u-ali", email: "ali@gmail.com", name: "Ali" }, old);
  await users.upsertGoogleUser({ sub: "u-jin", email: "jin@gmail.com", name: "Jin" }, old);
  await users.upsertGoogleUser({ sub: "u-boss", email: "boss@gmail.com", name: "Boss" }, old);
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    telegram.push({ url: String(url), body: JSON.parse(String(init?.body)) });
    return Response.json({ ok: true });
  }) as typeof fetch;
});
afterEach(() => {
  telegram = [];
});
process.on("exit", () => {
  globalThis.fetch = realFetch;
});

describe("obuna to'lovi (O'zbekiston)", () => {
  let id = "";
  let code = "";

  test("kirmagan: narx va chegirma ko'rinadi, karta raqami — yo'q", async () => {
    const { body } = await json(await payRoute.GET(req("/api/pay")));
    assert.equal(body.user, null);
    assert.deepEqual(body.promo, { left: 100, limit: 100 });
    assert.deepEqual(body.available, { uz: true, kr: true });
    assert.equal(body.cards, undefined);
    assert.equal((await payRoute.POST(req("/api/pay", undefined, { action: "start", region: "uz", plan: "m1" }))).status, 401);
  });

  test("tarif tanlash: chegirmali narx + shaxsiy kod summaning oxirgi 3 raqamida", async () => {
    const { status, body } = await json(await payRoute.POST(req("/api/pay", "u-ali", { action: "start", region: "uz", plan: "m1" })));
    assert.equal(status, 200);
    const p = body.open;
    assert.equal(p.status, "new");
    assert.equal(p.promo, true, "ilk 100 kishiga chegirma");
    assert.match(p.code, /^[1-9]\d\d$/);
    assert.equal(p.amount, PRICES.uz.m1.promo + Number(p.code));
    assert.equal(p.uid, undefined, "ichki maydonlar brauzerga chiqmaydi");
    id = p.id;
    code = p.code;
    const g = (await json(await payRoute.GET(req("/api/pay", "u-ali")))).body;
    assert.equal(g.open.id, id);
    assert.equal(g.cards.uz.number, "8600 1111 2222 3333");
    assert.equal(g.eligible, true);
    assert.equal(g.access.status, "expired");
  });

  test("noto'g'ri chek rad etiladi; «To'ladim» + chek → tekshiruvga, adminga Telegram xabari", async () => {
    const bad = await payRoute.POST(req("/api/pay", "u-ali", { action: "submit", id, receipt: { data: JPEG.toString("base64"), mime: "image/png" } }));
    assert.equal(bad.status, 400);
    const { body } = await json(await payRoute.POST(req("/api/pay", "u-ali", { action: "submit", id, receipt: { data: JPEG.toString("base64"), mime: "image/jpeg" } })));
    assert.equal(body.open.status, "paid");
    assert.equal(body.open.receipt, true);
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(telegram.length, 1);
    assert.match(telegram[0].url, /api\.telegram\.org\/bot123:abc\/sendMessage/);
    assert.equal(telegram[0].body.chat_id, "777");
    assert.match(telegram[0].body.text, /ali@gmail\.com/);
    assert.match(telegram[0].body.text, new RegExp(`Kod: ${code}`));
    // Tekshirilayotganda yangi tarif tanlab bo'lmaydi
    assert.equal((await payRoute.POST(req("/api/pay", "u-ali", { action: "start", region: "uz", plan: "m3" }))).status, 409);
  });

  test("admin: tekshiriladigan ro'yxat va chek rasmi (oddiy foydalanuvchiga — yo'q)", async () => {
    assert.equal((await adminPay.GET(req("/api/admin/payments", "u-ali"))).status, 403);
    const { body } = await json(await adminPay.GET(req("/api/admin/payments", "u-boss")));
    assert.equal(body.pending.length, 1);
    assert.equal(body.pending[0].email, "ali@gmail.com");
    assert.deepEqual(body.config, { uz: true, kr: true, contact: true, telegram: true });
    const img = await receiptRoute.GET(req(`/api/admin/receipt?id=${id}`, "u-boss"));
    assert.equal(img.headers.get("content-type"), "image/jpeg");
    assert.deepEqual(Buffer.from(await img.arrayBuffer()), JPEG);
    assert.equal((await receiptRoute.GET(req(`/api/admin/receipt?id=${id}`, "u-ali"))).status, 403);
  });

  test("tasdiqlash → obuna 30 kun, AI ochiladi, chegirma hisoblagichi kamayadi", async () => {
    const t = Date.now();
    const { body } = await json(await adminPay.POST(req("/api/admin/payments", "u-boss", { action: "approve", id })));
    assert.equal(body.payment.status, "approved");
    assert.ok(Math.abs(body.payment.until - (t + 30 * DAY_MS)) < 5000);
    const u = await users.getUser("u-ali");
    assert.equal(users.canUseAi(u!), true);
    const me = (await json(await meRoute.GET(req("/api/me", "u-ali")))).body;
    assert.equal(me.access.status, "paid");
    assert.equal(me.access.daysLeft, 30);
    const g = (await json(await payRoute.GET(req("/api/pay", "u-ali")))).body;
    assert.equal(g.promo.left, 99);
    assert.equal(g.eligible, false, "chegirma faqat birinchi to'lovga");
    assert.equal(g.open, null);
    // Ikkinchi marta tasdiqlash — muddat ikki marta qo'shilmaydi
    await adminPay.POST(req("/api/admin/payments", "u-boss", { action: "approve", id }));
    assert.equal((await users.getUser("u-ali"))!.paidUntil, u!.paidUntil);
  });

  test("uzaytirish: keyingi to'lov oddiy narxda va oldingi obuna tugashidan qo'shiladi", async () => {
    const p = (await json(await payRoute.POST(req("/api/pay", "u-ali", { action: "start", region: "uz", plan: "m3" })))).body.open;
    assert.equal(p.promo, false);
    assert.equal(p.amount, PRICES.uz.m3.price + Number(p.code));
    const before = (await users.getUser("u-ali"))!.paidUntil!;
    await payRoute.POST(req("/api/pay", "u-ali", { action: "submit", id: p.id }));
    const done = (await json(await adminPay.POST(req("/api/admin/payments", "u-boss", { action: "approve", id: p.id })))).body.payment;
    assert.equal(done.until, before + 90 * DAY_MS);
  });
});

describe("Koreya, rad etish, qo'lda berish", () => {
  test("Koreya: aniq narx (von), kod — 입금자명; rad etilsa ochiq so'rov yopiladi", async () => {
    const p = (await json(await payRoute.POST(req("/api/pay", "u-jin", { action: "start", region: "kr", plan: "m6" })))).body.open;
    assert.equal(p.amount, PRICES.kr.m6.promo);
    await payRoute.POST(req("/api/pay", "u-jin", { action: "submit", id: p.id }));
    await new Promise((r) => setTimeout(r, 10));
    assert.match(telegram[0].body.text, new RegExp(`입금자명: HU${p.code}`));
    assert.match(telegram[0].body.text, /Chek rasmi yo‘q/);
    const r = (await json(await adminPay.POST(req("/api/admin/payments", "u-boss", { action: "reject", id: p.id, note: "pul kelmadi" })))).body.payment;
    assert.equal(r.status, "rejected");
    assert.equal((await json(await payRoute.GET(req("/api/pay", "u-jin")))).body.open, null);
    assert.equal(users.canUseAi((await users.getUser("u-jin"))!), false);
  });

  test("bekor qilish: faqat «To'ladim» bosilmagan so'rov", async () => {
    const p = (await json(await payRoute.POST(req("/api/pay", "u-jin", { action: "start", region: "kr", plan: "m1" })))).body.open;
    assert.equal((await json(await payRoute.POST(req("/api/pay", "u-jin", { action: "cancel", id: p.id })))).body.open, null);
    assert.equal((await json(await payRoute.GET(req("/api/pay", "u-jin")))).body.open, null);
  });

  test("qo'lda berish: Gmail bo'yicha, tushum va chegirma hisobiga kirmaydi", async () => {
    const before = await getStore().zcard(PAID_USERS);
    const g = (await json(await adminPay.POST(req("/api/admin/payments", "u-boss", { action: "grant", email: "JIN@gmail.com", days: 7, note: "sovg‘a" })))).body.payment;
    assert.equal(g.manual, true);
    assert.equal(users.canUseAi((await users.getUser("u-jin"))!), true);
    assert.equal(await getStore().zcard(PAID_USERS), before);
    assert.equal((await adminPay.POST(req("/api/admin/payments", "u-boss", { action: "grant", email: "yoq@gmail.com", days: 7 }))).status, 404);
  });

  test("chegirma 100 kishidan keyin tugaydi", async () => {
    for (let i = 0; i < 100; i++) await getStore().zadd(PAID_USERS, Date.now(), `fake-${i}`);
    const g = (await json(await payRoute.GET(req("/api/pay", "u-jin")))).body;
    assert.equal(g.promo.left, 0);
    assert.equal(g.eligible, false);
    const p = (await json(await payRoute.POST(req("/api/pay", "u-jin", { action: "start", region: "kr", plan: "m1" })))).body.open;
    assert.equal(p.amount, PRICES.kr.m1.price);
  });
});

describe("PDF hisobot", () => {
  const ymd = (ms: number) => new Date(ms + 5 * 3_600_000).toISOString().slice(0, 10);

  test("yuklab olinadigan PDF: tuzilmasi to'g'ri, to'lovlar va jami ichida", async () => {
    const today = ymd(Date.now());
    const res = await reportRoute.GET(req(`/api/admin/report?from=${ymd(Date.now() - 30 * DAY_MS)}&to=${today}`, "u-boss"));
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-type"), "application/pdf");
    assert.match(res.headers.get("content-disposition") ?? "", /attachment; filename="hanustoz-hisobot-.*\.pdf"/);
    const buf = Buffer.from(await res.arrayBuffer());
    const s = buf.toString("latin1");
    assert.ok(s.startsWith("%PDF-1.4"));
    assert.ok(s.trimEnd().endsWith("%%EOF"));
    // xref: har bir obyekt ko'rsatilgan joyda boshlanadi
    const start = Number(/startxref\n(\d+)/.exec(s)![1]);
    assert.equal(s.slice(start, start + 4), "xref");
    const offsets = [...s.slice(start).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
    offsets.forEach((o, i) => assert.equal(s.slice(o, o + `${i + 1} 0 obj`.length), `${i + 1} 0 obj`));
    assert.ok(s.includes("(ali@gmail.com) Tj"));
    assert.ok(s.includes("jin@gmail.com"), "rad etilgan so'rov ham ro'yxatda");
    assert.ok(s.includes("Tasdiqlangan to\x91lovlar"), "o‘ — WinAnsi'da to'g'ri belgi");
    assert.equal((await reportRoute.GET(req(`/api/admin/report?from=${today}&to=${today}`, "u-ali"))).status, 403);
    assert.equal((await reportRoute.GET(req(`/api/admin/report?from=bad&to=${today}`, "u-boss"))).status, 400);
  });
});
