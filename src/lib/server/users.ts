import "server-only";
import { computeAccess, DAY_MS, TRIAL_DAYS, type Access } from "@/lib/access";
import { getStore } from "./store";

export type User = {
  id: string; // Google "sub"
  email: string;
  name: string;
  picture?: string;
  createdAt: number;
  lastLoginAt: number;
  trialEndsAt: number;
};

export type PublicUser = Pick<User, "id" | "email" | "name" | "picture" | "createdAt">;

const userKey = (id: string) => `user:${id}`;
const emailKey = (email: string) => `uemail:${email.toLowerCase()}`;
export const USERS_INDEX = "users";

export function isAdminEmail(email: string | undefined) {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

export function publicUser(u: User): PublicUser {
  return { id: u.id, email: u.email, name: u.name, picture: u.picture, createdAt: u.createdAt };
}

export function accessOf(u: User, now = Date.now()): Access {
  return computeAccess(u, now);
}

/** Bepul sinov hali tugamaganmi (adminlar har doim kira oladi) */
export function canUseAi(u: User, now = Date.now()) {
  return isAdminEmail(u.email) || accessOf(u, now).status !== "expired";
}

export async function getUser(id: string) {
  return getStore().get<User>(userKey(id));
}

export async function findUserByEmail(email: string) {
  const id = await getStore().get<string>(emailKey(email.trim()));
  return id ? getUser(id) : null;
}

/**
 * Google orqali kirgan foydalanuvchini yaratadi yoki yangilaydi.
 * Birinchi kirishda 30 kunlik bepul sinov avtomatik boshlanadi (har bir Google hisobga bir marta).
 */
export async function upsertGoogleUser(p: { sub: string; email: string; name?: string; picture?: string }, now = Date.now()) {
  const kv = getStore();
  const email = p.email.toLowerCase();
  const name = (p.name || email.split("@")[0]).slice(0, 80);
  const existing = await getUser(p.sub);
  if (existing) {
    // Sinov muddati (trialEndsAt) o'zgarmaydi — faqat ism, rasm va oxirgi kirish yangilanadi
    const user: User = { ...existing, email, name, picture: p.picture, lastLoginAt: now };
    await kv.set(userKey(user.id), user);
    if (existing.email !== email) await kv.set(emailKey(email), user.id);
    return { user, created: false };
  }
  const fresh: User = {
    id: p.sub,
    email,
    name,
    picture: p.picture,
    createdAt: now,
    lastLoginAt: now,
    trialEndsAt: now + TRIAL_DAYS * DAY_MS,
  };
  // NX: bir vaqtda ikki marta kirilsa ham sinov bir marta beriladi
  const created = await kv.set(userKey(fresh.id), fresh, { nx: true });
  if (!created) return { user: (await getUser(fresh.id)) ?? fresh, created: false };
  await kv.set(emailKey(email), fresh.id);
  await kv.zadd(USERS_INDEX, now, fresh.id);
  return { user: fresh, created: true };
}
