// Server mantiqi testlari: sessiya, Google id_token, bepul sinov, sinxron va ombor.
// Ishga tushirish: npm test  (Node 22.18+, qo'shimcha kutubxonasiz)

import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";

process.env.AUTH_SECRET = "test-secret-0123456789abcdef";
process.env.ADMIN_EMAILS = "boss@gmail.com";

const { createMemoryStore, setStore } = await import("../src/lib/server/store");
const session = await import("../src/lib/server/session");
const { computeAccess, DAY_MS, TRIAL_DAYS } = await import("../src/lib/access");
const users = await import("../src/lib/server/users");
const { validateIdToken } = await import("../src/lib/server/google");
const { mergeData } = await import("../src/lib/sync-merge");

const T0 = Date.UTC(2026, 10, 1, 9, 0, 0);
beforeEach(() => setStore(createMemoryStore()));

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

describe("bepul sinov", () => {
  test("sinov → tugash", () => {
    const u = { trialEndsAt: T0 + TRIAL_DAYS * DAY_MS };
    assert.deepEqual(computeAccess(u, T0), { status: "trial", until: u.trialEndsAt, daysLeft: TRIAL_DAYS });
    assert.equal(computeAccess(u, u.trialEndsAt - DAY_MS + 1).daysLeft, 1);
    assert.equal(computeAccess(u, u.trialEndsAt + 1).status, "expired");
    assert.equal(computeAccess(u, u.trialEndsAt + 1).daysLeft, 0);
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
    assert.equal(users.canUseAi(b.user, T0 + 40 * DAY_MS), false);
  });

  test("admin har doim kira oladi", async () => {
    const { user } = await users.upsertGoogleUser({ sub: "g-9", email: "boss@gmail.com" }, T0);
    assert.equal(users.canUseAi(user, T0 + 365 * DAY_MS), true);
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
