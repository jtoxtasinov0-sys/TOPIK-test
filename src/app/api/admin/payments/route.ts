import { connection } from "next/server";
import { DAY_MS } from "@/lib/access";
import { AiError, errorResponse } from "@/lib/gemini";
import { requireAdmin } from "@/lib/server/guard";
import { approvePayment, grantDays, listPayments, PAID_USERS, payConfig, promoLeft, rejectPayment, revenueOf } from "@/lib/server/payments";
import { getStore } from "@/lib/server/store";

const NO_STORE = { "Cache-Control": "private, no-store" };

// Admin: tekshiriladigan to'lovlar, oxirgi natijalar, tushum va sozlamalar holati
export async function GET(req: Request) {
  await connection();
  try {
    await requireAdmin(req);
    const now = Date.now();
    const [recent, paidUsers, left] = await Promise.all([listPayments({ from: now - 120 * DAY_MS, limit: 400 }), getStore().zcard(PAID_USERS), promoLeft()]);
    const cfg = payConfig();
    const month = recent.filter((p) => (p.doneAt ?? 0) > now - 30 * DAY_MS);
    return Response.json(
      {
        pending: recent.filter((p) => p.status === "paid").sort((a, b) => (a.paidAt ?? 0) - (b.paidAt ?? 0)),
        // Kod olgan, lekin «To'ladim» bosmagan (pul o'tkazib, tugmani unutganlar ham shu yerda)
        waiting: recent.filter((p) => p.status === "new" && now - p.createdAt < 3 * DAY_MS),
        done: recent.filter((p) => p.status === "approved" || p.status === "rejected").slice(0, 40),
        stats: { paidUsers, promoLeft: left, revenue30: revenueOf(month), approved30: month.filter((p) => p.status === "approved" && !p.manual).length },
        config: { uz: !!cfg.uz, kr: !!cfg.kr, contact: !!cfg.contact, telegram: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) },
      },
      { headers: NO_STORE }
    );
  } catch (e) {
    return errorResponse(e);
  }
}

type Body = { action?: "approve" | "reject" | "grant"; id?: string; note?: string; email?: string; days?: number };

export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    const b = (await req.json()) as Body;
    if (b.action === "approve") return Response.json({ payment: await approvePayment(String(b.id ?? "")) });
    if (b.action === "reject") return Response.json({ payment: await rejectPayment(String(b.id ?? ""), String(b.note ?? "")) });
    if (b.action === "grant") return Response.json({ payment: await grantDays(String(b.email ?? "").trim(), Number(b.days), String(b.note ?? "")) });
    throw new AiError("Noma’lum amal", 400);
  } catch (e) {
    return errorResponse(e);
  }
}
