import { connection } from "next/server";
import { AiError, errorResponse } from "@/lib/gemini";
import { currentUser } from "@/lib/server/guard";
import { getStore } from "@/lib/server/store";
import { accessOf, addDays, findUserByEmail, getUser, isAdminEmail, publicUser, USERS_INDEX, type User } from "@/lib/server/users";

const NO_STORE = { "Cache-Control": "private, no-store" };

async function requireAdmin(req: Request) {
  const me = await currentUser(req);
  if (!me) throw new AiError("Kirish talab qilinadi", 401, "AUTH");
  if (!isAdminEmail(me.email)) throw new AiError("Faqat admin uchun", 403, "FORBIDDEN");
  return me;
}

const view = (u: User) => ({ ...publicUser(u), lastLoginAt: u.lastLoginAt, access: accessOf(u) });

// Statistika, foydalanuvchini qidirish
export async function GET(req: Request) {
  await connection();
  try {
    await requireAdmin(req);
    const q = new URL(req.url).searchParams.get("q")?.trim();
    if (q) {
      const u = await findUserByEmail(q);
      return Response.json({ user: u ? view(u) : null }, { headers: NO_STORE });
    }
    const kv = getStore();
    const [total, newIds, recentIds] = await Promise.all([
      kv.zcard(USERS_INDEX),
      kv.zrange(USERS_INDEX, { min: Date.now() - 30 * 86_400_000 }),
      kv.zrange(USERS_INDEX, { rev: true, limit: 30 }),
    ]);
    const recent = (await Promise.all(recentIds.map(getUser))).filter((u): u is User => !!u).map(view);
    return Response.json({ total, new30: newIds.length, recent }, { headers: NO_STORE });
  } catch (e) {
    return errorResponse(e);
  }
}

// Bepul sinovni qo'lda uzaytirish/qisqartirish (masalan, faol o'quvchiga qo'shimcha kunlar)
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin(req);
    const { email, days } = (await req.json().catch(() => ({}))) as { email?: string; days?: number };
    const n = Math.trunc(Number(days));
    if (!email || !Number.isFinite(n) || n === 0 || Math.abs(n) > 3650) {
      return Response.json({ error: "Email va kunlar sonini to'g'ri kiriting" }, { status: 400 });
    }
    const u = await findUserByEmail(email);
    if (!u) return Response.json({ error: "Foydalanuvchi topilmadi (avval saytga Google orqali kirishi kerak)" }, { status: 404 });
    const next = await addDays(u.id, n);
    console.info(`Admin ${admin.email}: ${u.email} sinoviga ${n} kun`);
    return Response.json({ user: next ? view(next) : null });
  } catch (e) {
    return errorResponse(e);
  }
}
