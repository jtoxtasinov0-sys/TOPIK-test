import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Imzolangan (HMAC-SHA256) tokenlar va cookie yordamchilari. Kutubxonasiz, faqat node:crypto.

export const SESSION_COOKIE = "hq_session";
export const OAUTH_COOKIE = "hq_oauth";
export const SESSION_TTL_SEC = 60 * 60 * 24 * 60; // 60 kun

const DEV_SECRET = "hanqadam-dev-secret-faqat-lokal-uchun";

function secret() {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET sozlanmagan (kamida 16 belgi)");
  return DEV_SECRET;
}

export const b64url = (buf: Buffer | string) => (typeof buf === "string" ? Buffer.from(buf, "utf8") : buf).toString("base64url");

export function randomToken(bytes = 32) {
  return b64url(randomBytes(bytes));
}

export function pkceChallenge(verifier: string) {
  return b64url(createHash("sha256").update(verifier).digest());
}

function hmac(data: string) {
  return createHmac("sha256", secret()).update(data).digest();
}

export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** payload + muddati → "base64url(json).base64url(imzo)" */
export function signToken(payload: Record<string, unknown>, ttlSec: number, now = Date.now()) {
  const body = b64url(JSON.stringify({ ...payload, exp: Math.floor(now / 1000) + ttlSec }));
  return `${body}.${b64url(hmac(body))}`;
}

export function verifyToken<T extends Record<string, unknown>>(token: string | undefined | null, now = Date.now()): (T & { exp: number }) | null {
  if (!token || token.length > 4096) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = hmac(body);
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T & { exp: number };
    if (typeof data.exp !== "number" || data.exp * 1000 <= now) return null;
    return data;
  } catch {
    return null;
  }
}

// ---------------- Cookie ----------------
export function parseCookies(header: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (header ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (!k || k in out) continue;
    try {
      out[k] = decodeURIComponent(part.slice(i + 1).trim());
    } catch {
      out[k] = part.slice(i + 1).trim();
    }
  }
  return out;
}

export function serializeCookie(
  name: string,
  value: string,
  o: { maxAge?: number; path?: string; secure?: boolean; httpOnly?: boolean; sameSite?: "Lax" | "Strict" | "None" } = {}
) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${o.path ?? "/"}`];
  if (o.maxAge !== undefined) parts.push(`Max-Age=${o.maxAge}`);
  if (o.httpOnly !== false) parts.push("HttpOnly");
  if (o.secure) parts.push("Secure");
  parts.push(`SameSite=${o.sameSite ?? "Lax"}`);
  return parts.join("; ");
}

/** So'rov HTTPS orqali kelganmi (Vercel / reverse proxy ortida ham) */
export function isSecure(req: Request) {
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (proto) return proto === "https";
  return new URL(req.url).protocol === "https:";
}

/** Saytning tashqi manzili: APP_URL bo'lsa o'sha, bo'lmasa so'rov sarlavhalaridan */
export function baseUrl(req: Request) {
  const env = process.env.APP_URL?.trim();
  if (env) return env.replace(/\/+$/, "");
  const u = new URL(req.url);
  const host = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || req.headers.get("host") || u.host;
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || u.protocol.replace(":", "");
  return `${proto}://${host}`;
}

/** Faqat sayt ichidagi yo'llarga qaytarish (open redirect bo'lmasligi uchun) */
export function safeNext(next: string | null | undefined, fallback = "/") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\") || next.length > 300) return fallback;
  return next;
}

// ---------------- Sessiya ----------------
export type Session = { uid: string; exp: number };

export function readSession(req: Request): Session | null {
  const token = parseCookies(req.headers.get("cookie"))[SESSION_COOKIE];
  const s = verifyToken<{ uid: string }>(token);
  return s && typeof s.uid === "string" ? s : null;
}

export function sessionCookie(uid: string, secure: boolean) {
  return serializeCookie(SESSION_COOKIE, signToken({ uid }, SESSION_TTL_SEC), { maxAge: SESSION_TTL_SEC, secure });
}

export function clearCookie(name: string, secure: boolean, path = "/") {
  return serializeCookie(name, "", { maxAge: 0, secure, path });
}

/** Redirect + cookie (Response.redirect sarlavhalari o'zgarmas, shuning uchun qo'lda) */
export function redirectWithCookies(location: string, cookies: string[] = []) {
  const headers = new Headers({ Location: location, "Cache-Control": "no-store" });
  for (const c of cookies) headers.append("Set-Cookie", c);
  return new Response(null, { status: 302, headers });
}
