import "server-only";

// Google OAuth 2.0 / OpenID Connect — "Authorization Code + PKCE" oqimi, kutubxonasiz.

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

export function googleAuthUrl(o: { clientId: string; redirectUri: string; state: string; challenge: string; nonce: string }) {
  const q = new URLSearchParams({
    client_id: o.clientId,
    redirect_uri: o.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: o.state,
    nonce: o.nonce,
    code_challenge: o.challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
    access_type: "online",
  });
  return `${AUTH_URL}?${q}`;
}

export type GoogleProfile = { sub: string; email: string; name?: string; picture?: string };

type IdClaims = {
  iss?: string;
  aud?: string | string[];
  sub?: string;
  exp?: number;
  email?: string;
  email_verified?: boolean | string;
  name?: string;
  picture?: string;
  nonce?: string;
};

/**
 * id_token'ni tekshiradi. Token Google'ning token endpointidan to'g'ridan-to'g'ri TLS orqali olinadi,
 * shuning uchun OIDC Core 3.1.3.7 bo'yicha imzo o'rniga TLS ishonchiga tayanamiz va da'volarni tekshiramiz.
 */
export function validateIdToken(idToken: string, o: { clientId: string; nonce: string }, now = Date.now()): GoogleProfile {
  const part = idToken.split(".")[1];
  if (!part) throw new Error("id_token noto'g'ri");
  const c = JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as IdClaims;
  const aud = Array.isArray(c.aud) ? c.aud : [c.aud];
  if (!c.iss || !ISSUERS.includes(c.iss)) throw new Error("iss noto'g'ri");
  if (!aud.includes(o.clientId)) throw new Error("aud noto'g'ri");
  if (!c.exp || c.exp * 1000 < now - 60_000) throw new Error("id_token muddati o'tgan");
  if (c.nonce !== o.nonce) throw new Error("nonce mos emas");
  if (!c.sub || !c.email) throw new Error("email yo'q");
  if (!(c.email_verified === true || c.email_verified === "true")) throw new Error("email tasdiqlanmagan");
  return { sub: c.sub, email: c.email, name: c.name, picture: c.picture };
}

export async function exchangeCode(o: { code: string; verifier: string; clientId: string; clientSecret: string; redirectUri: string; nonce: string }) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: o.code,
      client_id: o.clientId,
      client_secret: o.clientSecret,
      redirect_uri: o.redirectUri,
      grant_type: "authorization_code",
      code_verifier: o.verifier,
    }),
    cache: "no-store",
  });
  const j = (await res.json().catch(() => ({}))) as { id_token?: string; error?: string; error_description?: string };
  if (!res.ok || !j.id_token) throw new Error(j.error_description || j.error || `Google token xatosi (${res.status})`);
  return validateIdToken(j.id_token, { clientId: o.clientId, nonce: o.nonce });
}
