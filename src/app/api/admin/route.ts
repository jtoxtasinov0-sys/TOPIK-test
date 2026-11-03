import { connection } from "next/server";
import { AiError, errorResponse } from "@/lib/gemini";
import { recentPaidOrders, userOrders } from "@/lib/server/billing";
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
      if (!u) return Response.json({ user: null }, { headers: NO_STORE });
      const orders = await userOrders(u.id, 20);
      return Response.json({ user: view(u), orders }, { headers: NO_STORE });
    }
    const kv = getStore();
    const since30 = Date.now() - 30 * 86_400_000;
    const [total, newIds, recentIds, paid] = await Promise.all([
      kv.zcard(USERS_INDEX),
      kv.zrange(USERS_INDEX, { min: since30 }),
      kv.zrange(USERS_INDEX, { rev: true, limit: 30 }),
      recentPaidOrders({ since: since30 }),
    ]);
    const recent = (await Promise.all(recentIds.map(getUser))).filter((u): u is User => !!u).map(view);
    return Response.json(
      {
        total,
        new30: newIds.length,
        revenue30: paid.reduce((a, o) => a + o.amount, 0),
        paid30: paid.length,
        payments: paid.slice(0, 30),
        recent,
      },
      { headers: NO_STORE }
    );
  } catch (e) {
    return errorResponse(e);
  }
}

// Qo'lda kun qo'shish/ayirish (masalan, naqd yoki Telegram orqali to'lov, promo, kompensatsiya)
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
    console.info(`Admin ${admin.email}: ${u.email} ga ${n} kun`);
    return Response.json({ user: next ? view(next) : null });
  } catch (e) {
    return errorResponse(e);
  }
}
