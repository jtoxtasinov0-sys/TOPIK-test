import { connection } from "next/server";
import { DAY_MS } from "@/lib/access";
import { AiError, errorResponse } from "@/lib/gemini";
import { requireAdmin } from "@/lib/server/guard";
import { listPayments, PAID_USERS } from "@/lib/server/payments";
import { dayStart, paymentsReport } from "@/lib/server/report";
import { getStore } from "@/lib/server/store";

// To'lovlar hisoboti PDF: ?from=2026-11-01&to=2026-11-30 (Toshkent kunlari, ikkalasi ham kiradi)
export async function GET(req: Request) {
  await connection();
  try {
    await requireAdmin(req);
    const q = new URL(req.url).searchParams;
    const fromYmd = q.get("from") ?? "";
    const toYmd = q.get("to") ?? "";
    const from = dayStart(fromYmd);
    const to = dayStart(toYmd) + DAY_MS - 1;
    if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) throw new AiError("Sana noto‘g‘ri (YYYY-MM-DD)", 400);
    if (to - from > 3 * 366 * DAY_MS) throw new AiError("Davr juda uzun (3 yilgacha)", 400);
    // Oldinroq yaratilib, shu davrda tasdiqlanganlar ham kirsin
    const all = await listPayments({ from: from - 14 * DAY_MS, to });
    const when = (p: (typeof all)[number]) => (p.status === "approved" ? (p.doneAt ?? p.createdAt) : (p.paidAt ?? p.createdAt));
    const payments = all
      .filter((p) => p.status === "approved" || p.status === "paid" || p.status === "rejected")
      .filter((p) => when(p) >= from && when(p) <= to)
      .sort((a, b) => when(a) - when(b));
    const pdf = paymentsReport({ from, to, payments, paidUsers: await getStore().zcard(PAID_USERS) });
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="hanustoz-hisobot-${fromYmd}_${toYmd}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
