import { connection } from "next/server";
import { AiError, errorResponse, rateLimit } from "@/lib/gemini";
import { SYNC_KEYS } from "@/lib/sync-keys";
import { currentUser } from "@/lib/server/guard";
import { getStore } from "@/lib/server/store";

// Natijalarni bulutda saqlash: kirgan foydalanuvchi uchun bepul (obuna shart emas)
const MAX_BYTES = 256 * 1024;
type Blob = { data: Record<string, unknown>; updatedAt: number };
const key = (uid: string) => `sync:${uid}`;

async function me(req: Request) {
  const u = await currentUser(req);
  if (!u) throw new AiError("Kirish talab qilinadi", 401, "AUTH");
  return u;
}

export async function GET(req: Request) {
  await connection();
  try {
    const u = await me(req);
    const blob = await getStore().get<Blob>(key(u.id));
    return Response.json(blob ?? { data: null, updatedAt: 0 }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PUT(req: Request) {
  try {
    rateLimit(req, "sync", 60, 5 * 60_000);
    const u = await me(req);
    const raw = await req.text();
    if (raw.length > MAX_BYTES) return Response.json({ error: "Ma'lumot juda katta" }, { status: 413 });
    const body = JSON.parse(raw) as { data?: Record<string, unknown> };
    if (!body.data || typeof body.data !== "object") return Response.json({ error: "Ma'lumot noto'g'ri" }, { status: 400 });
    const data: Record<string, unknown> = {};
    for (const k of SYNC_KEYS) if (k in body.data) data[k] = body.data[k];
    const updatedAt = Date.now();
    await getStore().set(key(u.id), { data, updatedAt } satisfies Blob);
    return Response.json({ updatedAt });
  } catch (e) {
    return errorResponse(e);
  }
}
