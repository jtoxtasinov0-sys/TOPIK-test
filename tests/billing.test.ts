// Server mantiqi testlari: sessiya, sinov muddati, Payme va Click oqimlari.
// Ishga tushirish: npm test  (Node 22.18+, qo'shimcha kutubxonasiz)

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { beforeEach, describe, test } from "node:test";

process.env.AUTH_SECRET = "test-secret-0123456789abcdef";
process.env.PAYME_MERCHANT_ID = "test-merchant";
process.env.PAYME_KEY = "test-payme-key";
process.env.CLICK_SERVICE_ID = "111";
process.env.CLICK_MERCHANT_ID = "222";
process.env.CLICK_SECRET_KEY = "click-secret";
process.env.ADMIN_EMAILS = "boss@gmail.com";

const { createMemoryStore, setStore } = await import("../src/lib/server/store");
const session = await import("../src/lib/server/session");
const { computeAccess, DAY_MS, extendedUntil, PLANS, TRIAL_DAYS, formatSum, discountPct } = await import("../src/lib/plans");
const users = await import("../src/lib/server/users");
const billing = await import("../src/lib/server/billing");
const { handlePayme, PAYME_TIMEOUT_MS } = await import("../src/lib/server/payme");
const { handleClick, clickSign } = await import("../src/lib/server/click");
const { validateIdToken } = await import("../src/lib/server/google");
const { mergeData } = await import("../src/lib/sync-merge");

const T0 = Date.UTC(2026, 10, 1, 9, 0, 0);
const auth = "Basic " + Buffer.from("Paycom:test-payme-key").toString("base64");

beforeEach(() => setStore(createMemoryStore()));

async function newUserAndOrder(planIdx = 0, provider: "payme" | "click" = "payme") {
  const { user } = await users.upsertGoogleUser({ sub: "g-1", email: "Ali@Gmail.com", name: "Ali" }, T0);
  const order = await billing.createOrder(user, PLANS[planIdx], provider, T0);
  return { user, order };
}

async function rpc(method: string, params: Record<string, unknown>, now = T0, header = auth) {
  return (await handlePayme(JSON.stringify({ id: 1, method, params }), header, now)) as {
    result?: Record<string, unknown>;
    error?: { code: number; data?: string };
  };
}

describe("session", () => {
  test("token imzo, muddat va buzilish", () => {
    const t = session.signToken({ uid: "u1" }, 60, T0);
    assert.equal(session.verifyToken<{ uid: string }>(t, T0)?.uid, "u1");
    assert.equal(session.verifyToken(t, T0 + 61_000), null, "muddati o'tgan");
    const [body, sig] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ uid: "admin", exp: 9e9 })).toString("base64url");
    assert.equal(session.verifyToken(`${forged}.${sig}`, T0), null, "soxta payload");
    assert.equal(session.verifyToken(`${body}.x${sig.slice(1)}`, T0), null, "soxta imzo");
  });

  test("cookie va next yo'li", () => {
    assert.deepEqual(session.parseCookies("a=1; hq_session=x%3Dy; b"), { a: "1", hq_session: "x=y" });
    assert.match(session.serializeCookie("n", "v", { maxAge: 10, secure: true }), /^n=v; Path=\/; Max-Age=10; HttpOnly; Secure; SameSite=Lax$/);
    assert.equal(session.safeNext("/test?x=1"), "/test?x=1");
    assert.equal(session.safeNext("//evil.com"), "/");
    assert.equal(session.safeNext("https://evil.com"), "/");
    assert.equal(session.safeNext("/\\evil.com"), "/");
  });
});

describe("plans", () => {
  test("narxlar va chegirma", () => {
    assert.equal(formatSum(129000), "129 000");
    assert.ok(discountPct(PLANS[2]) > discountPct(PLANS[1]));
  });

  test("sinov → obuna → tugash", () => {
    const u = { trialEndsAt: T0 + TRIAL_DAYS * DAY_MS, paidUntil: 0 };
    assert.equal(computeAccess(u, T0).status, "trial");
    assert.equal(computeAccess(u, T0).daysLeft, TRIAL_DAYS);
    assert.equal(computeAccess(u, u.trialEndsAt + 1).status, "expired");
    // Sinov paytida to'lansa, muddat sinovdan keyin qo'shiladi
    const paidUntil = extendedUntil(u, 30, T0 + 5 * DAY_MS);
    assert.equal(paidUntil, u.trialEndsAt + 30 * DAY_MS);
    assert.equal(computeAccess({ ...u, paidUntil }, T0 + 5 * DAY_MS).status, "active");
  });
});

describe("users", () => {
  test("sinov bir marta beriladi, qayta kirishda o'zgarmaydi", async () => {
    const a = await users.upsertGoogleUser({ sub: "g-1", email: "Ali@Gmail.com", name: "Ali" }, T0);
    assert.equal(a.created, true);
    assert.equal(a.user.email, "ali@gmail.com");
    assert.equal(a.user.trialEndsAt, T0 + TRIAL_DAYS * DAY_MS);
    const b = await users.upsertGoogleUser({ sub: "g-1", email: "ali@gmail.com", name: "Ali V." }, T0 + 40 * DAY_MS);
    assert.equal(b.created, false);
    assert.equal(b.user.trialEndsAt, a.user.trialEndsAt);
    assert.equal(b.user.name, "Ali V.");
    assert.equal((await users.findUserByEmail("ALI@gmail.com"))?.id, "g-1");
    assert.equal(users.canUsePremium(b.user, T0 + 40 * DAY_MS), false);
  });

  test("admin har doim kira oladi", async () => {
    const { user } = await users.upsertGoogleUser({ sub: "g-9", email: "boss@gmail.com" }, T0);
    assert.equal(users.canUsePremium(user, T0 + 365 * DAY_MS), true);
  });

  test("admin kun qo'shadi va ayiradi", async () => {
    await users.upsertGoogleUser({ sub: "g-2", email: "b@gmail.com" }, T0);
    const plus = await users.addDays("g-2", 30, T0);
    assert.equal(plus?.paidUntil, T0 + (TRIAL_DAYS + 30) * DAY_MS);
    const minus = await users.addDays("g-2", -10, T0);
    assert.equal(minus?.paidUntil, T0 + (TRIAL_DAYS + 20) * DAY_MS);
  });
});

describe("google id_token", () => {
  const make = (claims: Record<string, unknown>) =>
    `e30.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.sig`;
  const ok = { iss: "https://accounts.google.com", aud: "cid", sub: "123", email: "a@gmail.com", email_verified: true, exp: T0 / 1000 + 3600, nonce: "n1" };

  test("to'g'ri token qabul qilinadi", () => {
    assert.deepEqual(validateIdToken(make(ok), { clientId: "cid", nonce: "n1" }, T0), { sub: "123", email: "a@gmail.com", name: undefined, picture: undefined });
  });

  test("noto'g'ri aud / nonce / tasdiqlanmagan email rad etiladi", () => {
    assert.throws(() => validateIdToken(make({ ...ok, aud: "other" }), { clientId: "cid", nonce: "n1" }, T0));
    assert.throws(() => validateIdToken(make(ok), { clientId: "cid", nonce: "n2" }, T0));
    assert.throws(() => validateIdToken(make({ ...ok, email_verified: false }), { clientId: "cid", nonce: "n1" }, T0));
    assert.throws(() => validateIdToken(make({ ...ok, iss: "https://evil.com" }), { clientId: "cid", nonce: "n1" }, T0));
  });
});

describe("Payme Merchant API", () => {
  test("avtorizatsiyasiz so'rov rad etiladi", async () => {
    const r = await rpc("CheckPerformTransaction", {}, T0, "Basic " + Buffer.from("Paycom:wrong").toString("base64"));
    assert.equal(r.error?.code, -32504);
  });

  test("buyurtma va summa tekshiruvi", async () => {
    const { order } = await newUserAndOrder();
    assert.deepEqual((await rpc("CheckPerformTransaction", { amount: order.amount * 100, account: { order_id: order.id } })).result, { allow: true });
    assert.equal((await rpc("CheckPerformTransaction", { amount: 100, account: { order_id: order.id } })).error?.code, -31001);
    const nf = await rpc("CheckPerformTransaction", { amount: 100, account: { order_id: "999999999" } });
    assert.equal(nf.error?.code, -31050);
    assert.equal(nf.error?.data, "order_id");
  });

  test("to'liq oqim: Create → Perform → obuna uzayadi", async () => {
    const { order } = await newUserAndOrder(1);
    const params = { id: "pm-1", time: T0, amount: order.amount * 100, account: { order_id: order.id } };
    const c1 = await rpc("CreateTransaction", params);
    assert.equal(c1.result?.state, 1);
    const c2 = await rpc("CreateTransaction", params, T0 + 1000);
    assert.equal(c2.result?.transaction, c1.result?.transaction, "takroriy Create bir xil javob");

    // Boshqa tranzaksiya bilan shu buyurtmani to'lash mumkin emas
    const busy = await rpc("CreateTransaction", { ...params, id: "pm-2" }, T0 + 2000);
    assert.equal(busy.error?.code, -31052);

    const p1 = await rpc("PerformTransaction", { id: "pm-1" }, T0 + 5000);
    assert.equal(p1.result?.state, 2);
    const u = await users.getUser("g-1");
    assert.equal(u?.paidUntil, T0 + (TRIAL_DAYS + 90) * DAY_MS, "3 oylik tarif sinovdan keyin qo'shildi");

    const p2 = await rpc("PerformTransaction", { id: "pm-1" }, T0 + 9000);
    assert.equal(p2.result?.perform_time, p1.result?.perform_time, "takroriy Perform idempotent");
    assert.equal((await users.getUser("g-1"))?.paidUntil, u?.paidUntil, "kunlar ikki marta qo'shilmadi");

    assert.equal((await rpc("CancelTransaction", { id: "pm-1", reason: 5 })).error?.code, -31007);
    const ct = await rpc("CheckTransaction", { id: "pm-1" });
    assert.equal(ct.result?.state, 2);
    assert.equal(ct.result?.reason, null);

    const st = await rpc("GetStatement", { from: T0 - 1, to: T0 + 1 });
    const txs = st.result?.transactions as { id: string; account: Record<string, string> }[];
    assert.equal(txs.length, 1);
    assert.equal(txs[0].account.order_id, order.id);

    // To'langan buyurtma uchun yangi to'lov yo'q
    assert.equal((await rpc("CheckPerformTransaction", { amount: order.amount * 100, account: { order_id: order.id } })).error?.code, -31051);
  });

  test("bekor qilish va 12 soatlik timeout", async () => {
    const { order } = await newUserAndOrder();
    const params = { id: "pm-3", time: T0, amount: order.amount * 100, account: { order_id: order.id } };
    await rpc("CreateTransaction", params);
    const late = await rpc("PerformTransaction", { id: "pm-3" }, T0 + PAYME_TIMEOUT_MS + 1);
    assert.equal(late.error?.code, -31008);
    const ct = await rpc("CheckTransaction", { id: "pm-3" });
    assert.equal(ct.result?.state, -1);
    assert.equal(ct.result?.reason, 4);
    assert.equal((await users.getUser("g-1"))?.paidUntil, 0);

    // Bekor qilingandan keyin boshqa tranzaksiya bilan to'lash mumkin
    const again = await rpc("CreateTransaction", { ...params, id: "pm-4" }, T0 + PAYME_TIMEOUT_MS + 2);
    assert.equal(again.result?.state, 1);
    const cancel = await rpc("CancelTransaction", { id: "pm-4", reason: 3 }, T0 + PAYME_TIMEOUT_MS + 3);
    assert.equal(cancel.result?.state, -1);
    const cancel2 = await rpc("CancelTransaction", { id: "pm-4", reason: 3 }, T0 + PAYME_TIMEOUT_MS + 9);
    assert.equal(cancel2.result?.cancel_time, cancel.result?.cancel_time, "takroriy Cancel idempotent");
    assert.equal((await rpc("PerformTransaction", { id: "pm-4" })).error?.code, -31008);
  });

  test("noma'lum tranzaksiya va metod", async () => {
    assert.equal((await rpc("PerformTransaction", { id: "nope" })).error?.code, -31003);
    assert.equal((await rpc("Foo", {})).error?.code, -32601);
    assert.equal(((await handlePayme("{bad json", auth, T0)) as { error: { code: number } }).error.code, -32700);
  });
});

describe("Click SHOP API", () => {
  function form(f: Record<string, string>) {
    const full = { service_id: "111", click_paydoc_id: "77", sign_time: "2026-11-01 14:00:00", error: "0", error_note: "", ...f };
    return new URLSearchParams({ ...full, sign_string: clickSign(full, "click-secret") });
  }

  test("imzo noto'g'ri bo'lsa rad etiladi", async () => {
    const { order } = await newUserAndOrder(0, "click");
    const f = form({ click_trans_id: "c1", merchant_trans_id: order.id, amount: "49000", action: "0" });
    f.set("sign_string", "0".repeat(32));
    assert.equal((await handleClick(f, T0)).error, -1);
  });

  test("Prepare → Complete → obuna uzayadi", async () => {
    const { order } = await newUserAndOrder(0, "click");
    const prep = await handleClick(form({ click_trans_id: "c2", merchant_trans_id: order.id, amount: "49000.00", action: "0" }), T0);
    assert.equal(prep.error, 0);
    assert.ok(prep.merchant_prepare_id);

    const done = await handleClick(
      form({ click_trans_id: "c2", merchant_trans_id: order.id, merchant_prepare_id: String(prep.merchant_prepare_id), amount: "49000.00", action: "1" }),
      T0 + 1000
    );
    assert.equal(done.error, 0);
    assert.equal(done.merchant_confirm_id, prep.merchant_prepare_id);
    assert.equal((await users.getUser("g-1"))?.paidUntil, T0 + (TRIAL_DAYS + 30) * DAY_MS);

    const again = await handleClick(
      form({ click_trans_id: "c2", merchant_trans_id: order.id, merchant_prepare_id: String(prep.merchant_prepare_id), amount: "49000.00", action: "1" }),
      T0 + 2000
    );
    assert.equal(again.error, -4, "takroriy Complete");
    assert.equal((await users.getUser("g-1"))?.paidUntil, T0 + (TRIAL_DAYS + 30) * DAY_MS);

    const prep2 = await handleClick(form({ click_trans_id: "c3", merchant_trans_id: order.id, amount: "49000", action: "0" }), T0 + 3000);
    assert.equal(prep2.error, -4, "to'langan buyurtma");
  });

  test("summa xato va Click tomonidagi xato", async () => {
    const { order } = await newUserAndOrder(0, "click");
    assert.equal((await handleClick(form({ click_trans_id: "c4", merchant_trans_id: order.id, amount: "100", action: "0" }), T0)).error, -2);
    assert.equal((await handleClick(form({ click_trans_id: "c4", merchant_trans_id: "123456789", amount: "49000", action: "0" }), T0)).error, -5);

    const prep = await handleClick(form({ click_trans_id: "c5", merchant_trans_id: order.id, amount: "49000", action: "0" }), T0);
    const failed = await handleClick(
      form({ click_trans_id: "c5", merchant_trans_id: order.id, merchant_prepare_id: String(prep.merchant_prepare_id), amount: "49000", action: "1", error: "-5017" }),
      T0
    );
    assert.equal(failed.error, -9);
    assert.equal((await users.getUser("g-1"))?.paidUntil, 0);
  });

  test("imzo formulasi hujjatdagidek", () => {
    const f = { click_trans_id: "1", service_id: "2", merchant_trans_id: "3", amount: "4", action: "0", sign_time: "5" };
    assert.equal(clickSign(f, "S"), createHash("md5").update("12S3405").digest("hex"));
    const c = { ...f, action: "1", merchant_prepare_id: "9" };
    assert.equal(clickSign(c, "S"), createHash("md5").update("12S39415").digest("hex"));
  });
});

describe("sinxron birlashtirish", () => {
  test("tarix, so'zlar, streak va profil yo'qolmaydi", () => {
    const local = {
      "hq:history": [{ id: "a", date: 3 }, { id: "b", date: 1 }],
      "hq:words": { w1: 2, w2: 5 },
      "hq:streak": { last: "2026-11-02", count: 3 },
      "hq:profile": { name: "Ali", examDate: "", target: "" },
    };
    const server = {
      "hq:history": [{ id: "c", date: 2 }, { id: "b", date: 1 }],
      "hq:words": { w1: 4, w3: 1 },
      "hq:streak": { last: "2026-11-01", count: 9 },
      "hq:profile": { name: "", examDate: "2026-12-01", target: "3급" },
    };
    const m = mergeData(local, server);
    assert.deepEqual((m["hq:history"] as { id: string }[]).map((h) => h.id), ["a", "c", "b"]);
    assert.deepEqual(m["hq:words"], { w1: 4, w2: 5, w3: 1 });
    assert.deepEqual(m["hq:streak"], { last: "2026-11-02", count: 3 });
    assert.deepEqual(m["hq:profile"], { name: "Ali", examDate: "2026-12-01", target: "3급" });
  });
});

describe("store", () => {
  test("fayl ombori: TTL, NX, incr, zrange", async () => {
    const { mkdtemp } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const path = await import("node:path");
    const file = path.join(await mkdtemp(path.join(tmpdir(), "hq-")), "db.json");
    const kv = createMemoryStore(file);
    assert.equal(await kv.set("a", { x: 1 }, { nx: true }), true);
    assert.equal(await kv.set("a", { x: 2 }, { nx: true }), false);
    assert.equal(await kv.incr("n", 60), 1);
    assert.equal(await kv.incr("n", 60), 2);
    await kv.zadd("z", 3, "c");
    await kv.zadd("z", 1, "a");
    await kv.zadd("z", 2, "b");
    assert.deepEqual(await kv.zrange("z", { rev: true, limit: 2 }), ["c", "b"]);
    assert.deepEqual(await kv.zrange("z", { min: 2 }), ["b", "c"]);
    assert.equal(await kv.zcard("z"), 3);
    // Boshqa nusxa (masalan, boshqa route moduli) fayldan o'qiydi
    const kv2 = createMemoryStore(file);
    assert.deepEqual(await kv2.get("a"), { x: 1 });
    await kv2.set("tmp", 1, { ttlSec: 1 });
    assert.equal(await kv2.get("tmp"), 1);
  });
});
