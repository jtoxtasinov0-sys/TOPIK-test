// API yo'llari testi: Google login → sessiya → /api/me → AI paywall → to'lov havolasi.
// Google token endpointi soxta fetch bilan almashtiriladi.

import assert from "node:assert/strict";
import { before, describe, test } from "node:test";

process.env.AUTH_SECRET = "test-secret-0123456789abcdef";
process.env.GOOGLE_CLIENT_ID = "cid.apps.googleusercontent.com";
process.env.GOOGLE_CLIENT_SECRET = "csecret";
process.env.APP_URL = "https://hanqadam.uz";
process.env.PAYME_MERCHANT_ID = "m-123";
process.env.PAYME_KEY = "k";
process.env.GEMINI_API_KEY = "";

const { createMemoryStore, setStore } = await import("../src/lib/server/store");
const googleRoute = await import("../src/app/api/auth/google/route");
const callbackRoute = await import("../src/app/api/auth/callback/route");
const meRoute = await import("../src/app/api/me/route");
const explainRoute = await import("../src/app/api/explain/route");
const checkoutRoute = await import("../src/app/api/billing/checkout/route");
const logoutRoute = await import("../src/app/api/auth/logout/route");
const users = await import("../src/lib/server/users");
const { DAY_MS, TRIAL_DAYS } = await import("../src/lib/plans");

const BASE = "https://hanqadam.uz";
const cookieOf = (res: Response, name: string) =>
  res.headers.getSetCookie().find((c) => c.startsWith(`${name}=`))?.split(";")[0] ?? "";

before(() => setStore(createMemoryStore()));

describe("Google login oqimi", () => {
  let session = "";

  test("kirish → callback → sessiya", async () => {
    const start = await googleRoute.GET(new Request(`${BASE}/api/auth/google?next=/speak`));
    assert.equal(start.status, 302);
    const loc = new URL(start.headers.get("location")!);
    assert.equal(loc.host, "accounts.google.com");
    assert.equal(loc.searchParams.get("redirect_uri"), `${BASE}/api/auth/callback`);
    assert.equal(loc.searchParams.get("code_challenge_method"), "S256");
    const oauth = cookieOf(start, "hq_oauth");
    assert.ok(oauth);

    // Soxta Google token javobi (nonce ko'rsatilgan so'rovdan olinadi)
    const nonce = loc.searchParams.get("nonce");
    const realFetch = globalThis.fetch;
    let tokenBody = "";
    globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
      assert.equal(String(url), "https://oauth2.googleapis.com/token");
      tokenBody = String(init?.body);
      const claims = { iss: "https://accounts.google.com", aud: process.env.GOOGLE_CLIENT_ID, sub: "g-42", email: "Vali@gmail.com", email_verified: true, name: "Vali", exp: Math.floor(Date.now() / 1000) + 600, nonce };
      return Response.json({ id_token: `e30.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.sig` });
    }) as typeof fetch;
    try {
      // Noto'g'ri state rad etiladi
      const bad = await callbackRoute.GET(new Request(`${BASE}/api/auth/callback?code=c&state=WRONG`, { headers: { cookie: oauth } }));
      assert.equal(bad.headers.get("location"), "/login?error=state");

      const state = loc.searchParams.get("state");
      const cb = await callbackRoute.GET(new Request(`${BASE}/api/auth/callback?code=abc&state=${state}`, { headers: { cookie: oauth } }));
      assert.equal(cb.status, 302);
      assert.equal(cb.headers.get("location"), "/account?welcome=1&next=%2Fspeak");
      assert.match(tokenBody, /code_verifier=/);
      session = cookieOf(cb, "hq_session");
      assert.ok(session);
      assert.match(cb.headers.getSetCookie().join("\n"), /hq_session=.*HttpOnly.*SameSite=Lax/);
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  test("/api/me sinovni ko'rsatadi", async () => {
    const res = await meRoute.GET(new Request(`${BASE}/api/me`, { headers: { cookie: session } }));
    const me = (await res.json()) as { user: { email: string }; access: { status: string; daysLeft: number }; providers: { payme: boolean } };
    assert.equal(me.user.email, "vali@gmail.com");
    assert.equal(me.access.status, "trial");
    assert.equal(me.access.daysLeft, TRIAL_DAYS);
    assert.equal(me.providers.payme, true);

    const anon = (await (await meRoute.GET(new Request(`${BASE}/api/me`))).json()) as { user: unknown; authEnabled: boolean };
    assert.equal(anon.user, null);
    assert.equal(anon.authEnabled, true);
  });

  test("AI yo'llari: kirmagan → 401, sinov tugagan → 402", async () => {
    const body = JSON.stringify({ context: "x", answer: 1, lang: "uz" });
    const anon = await explainRoute.POST(new Request(`${BASE}/api/explain`, { method: "POST", body }));
    assert.equal(anon.status, 401);
    assert.equal(((await anon.json()) as { code: string }).code, "AUTH");

    // Sinov davomida o'tadi (GEMINI kaliti yo'q → 503, ya'ni paywall'dan o'tdi)
    const ok = await explainRoute.POST(new Request(`${BASE}/api/explain`, { method: "POST", body, headers: { cookie: session } }));
    assert.equal(ok.status, 503);

    // Sinovni o'tmishga suramiz
    const u = (await users.getUser("g-42"))!;
    const { getStore } = await import("../src/lib/server/store");
    await getStore().set("user:g-42", { ...u, trialEndsAt: Date.now() - DAY_MS });
    const expired = await explainRoute.POST(new Request(`${BASE}/api/explain`, { method: "POST", body, headers: { cookie: session } }));
    assert.equal(expired.status, 402);
    assert.equal(((await expired.json()) as { code: string }).code, "PAYWALL");
  });

  test("to'lov havolasi Payme formatida", async () => {
    const res = await checkoutRoute.POST(
      new Request(`${BASE}/api/billing/checkout`, { method: "POST", body: JSON.stringify({ plan: "m1", provider: "payme", lang: "uz" }), headers: { cookie: session } })
    );
    const j = (await res.json()) as { url: string; orderId: string };
    assert.ok(j.url.startsWith("https://checkout.paycom.uz/"));
    const decoded = Buffer.from(j.url.split("/").pop()!, "base64").toString();
    assert.equal(decoded, `m=m-123;ac.order_id=${j.orderId};a=4900000;l=uz;c=${BASE}/account`);

    const click = await checkoutRoute.POST(
      new Request(`${BASE}/api/billing/checkout`, { method: "POST", body: JSON.stringify({ plan: "m1", provider: "click" }), headers: { cookie: session } })
    );
    assert.equal(click.status, 400, "Click sozlanmagan");
  });

  test("chiqish cookie'ni o'chiradi", async () => {
    const res = await logoutRoute.POST(new Request(`${BASE}/api/auth/logout`, { method: "POST", headers: { "x-forwarded-proto": "https" } }));
    assert.match(res.headers.get("set-cookie") ?? "", /hq_session=; Path=\/; Max-Age=0/);
  });
});
