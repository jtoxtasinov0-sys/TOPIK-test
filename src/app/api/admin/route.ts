import { connection } from "next/server";
import { AiError, errorResponse } from "@/lib/gemini";
import { currentUser } from "@/lib/server/guard";
import { getStore } from "@/lib/server/store";
import { accessOf, findUserByEmail, getUser, isAdminEmail, publicUser, USERS_INDEX, type User } from "@/lib/server/users";

const NO_STORE = { "Cache-Control": "private, no-store" };

async function requireAdmin(req: Request) {
  const me = await currentUser(req);
  if (!me) throw new AiError("Kirish talab qilinadi", 401, "AUTH");
  if (!isAdminEmail(me.email)) throw new AiError("Faqat admin uchun", 403, "FORBIDDEN");
  return me;
}

const view = (u: User) => ({ ...publicUser(u), lastLoginAt: u.lastLoginAt, access: accessOf(u) });

// Faqat ko'rish: statistika, so'nggi foydalanuvchilar, email bo'yicha qidirish
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
