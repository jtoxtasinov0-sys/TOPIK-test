import { connection } from "next/server";
import { exchangeCode } from "@/lib/server/google";
import { authEnabled } from "@/lib/server/guard";
import {
  baseUrl,
  clearCookie,
  isSecure,
  OAUTH_COOKIE,
  parseCookies,
  redirectWithCookies,
  safeEqual,
  safeNext,
  sessionCookie,
  verifyToken,
} from "@/lib/server/session";
import { upsertGoogleUser } from "@/lib/server/users";

export const maxDuration = 30;

// Google bu yerga ?code=...&state=... bilan qaytaradi
export async function GET(req: Request) {
  await connection();
  const url = new URL(req.url);
  const secure = isSecure(req);
  const clearOauth = clearCookie(OAUTH_COOKIE, secure, "/api/auth");
  const fail = (code: string) => redirectWithCookies(`/login?error=${code}`, [clearOauth]);

  if (!authEnabled()) return fail("config");
  if (url.searchParams.get("error")) return fail("denied");

  const saved = verifyToken<{ state: string; nonce: string; verifier: string; next: string }>(
    parseCookies(req.headers.get("cookie"))[OAUTH_COOKIE]
  );
  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code") ?? "";
  if (!saved || !code || !safeEqual(state, saved.state)) return fail("state");

  try {
    const profile = await exchangeCode({
      code,
      verifier: saved.verifier,
      nonce: saved.nonce,
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      redirectUri: `${baseUrl(req)}/api/auth/callback`,
    });
    const { user, created } = await upsertGoogleUser(profile);
    const next = safeNext(saved.next);
    // Yangi foydalanuvchiga sinov boshlanganini ko'rsatamiz
    const location = created ? `/account?welcome=1&next=${encodeURIComponent(next)}` : next;
    return redirectWithCookies(location, [clearOauth, sessionCookie(user.id, secure)]);
  } catch (e) {
    console.error("Google login xatosi:", e instanceof Error ? e.message : e);
    return fail(e instanceof Error && e.name === "StoreError" ? "db" : "google");
  }
}
