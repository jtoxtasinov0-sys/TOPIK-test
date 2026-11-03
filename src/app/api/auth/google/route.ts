import { connection } from "next/server";
import { googleAuthUrl } from "@/lib/server/google";
import { authEnabled } from "@/lib/server/guard";
import { baseUrl, isSecure, OAUTH_COOKIE, pkceChallenge, randomToken, redirectWithCookies, safeNext, serializeCookie, signToken } from "@/lib/server/session";

// "Google bilan kirish" — foydalanuvchini Google'ning hisob tanlash sahifasiga yuboradi
export async function GET(req: Request) {
  await connection();
  const url = new URL(req.url);
  const next = safeNext(url.searchParams.get("next"));
  if (!authEnabled()) return redirectWithCookies(`/login?error=config`);

  const state = randomToken(16);
  const nonce = randomToken(16);
  const verifier = randomToken(32);
  const redirectUri = `${baseUrl(req)}/api/auth/callback`;
  const secure = isSecure(req);

  const cookie = serializeCookie(OAUTH_COOKIE, signToken({ state, nonce, verifier, next }, 600), {
    maxAge: 600,
    path: "/api/auth",
    secure,
  });
  const location = googleAuthUrl({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    redirectUri,
    state,
    challenge: pkceChallenge(verifier),
    nonce,
  });
  return redirectWithCookies(location, [cookie]);
}
