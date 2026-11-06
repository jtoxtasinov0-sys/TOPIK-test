import { connection } from "next/server";
import { AiError, errorResponse, rateLimit } from "@/lib/gemini";
import { isRegion, PROMO_LIMIT } from "@/lib/plans";
import { authEnabled, currentUser } from "@/lib/server/guard";
import { cancelPayment, openPayment, payConfig, promoLeft, startPayment, submitPayment, type Payment } from "@/lib/server/payments";
import { accessOf } from "@/lib/server/users";

const NO_STORE = { "Cache-Control": "private, no-store" };

/** Brauzerga: ichki maydonlarsiz */
const view = (p: Payment | null) =>
  p && { id: p.id, region: p.region, plan: p.plan, days: p.days, amount: p.amount, promo: p.promo, code: p.code, status: p.status, createdAt: p.createdAt, paidAt: p.paidAt, receipt: !!p.receipt };

// Obuna: narxlar, chegirma, karta raqami va foydalanuvchining ochiq so'rovi
export async function GET(req: Request) {
  await connection();
  try {
    const cfg = payConfig();
    const left = await promoLeft();
    const base = { authEnabled: authEnabled(), promo: { left, limit: PROMO_LIMIT }, available: { uz: !!cfg.uz, kr: !!cfg.kr }, contact: cfg.contact };
    const user = base.authEnabled ? await currentUser(req) : null;
    if (!user) return Response.json({ ...base, user: null }, { headers: NO_STORE });
    return Response.json(
      {
        ...base,
        user: { email: user.email },
        // Karta raqamlari — faqat kirganlarga
        cards: { uz: cfg.uz, kr: cfg.kr },
        eligible: !user.firstPaidAt && left > 0,
        access: accessOf(user),
        open: view(await openPayment(user.id)),
      },
      { headers: NO_STORE }
    );
  } catch (e) {
    return errorResponse(e);
  }
}

type Body = { action?: "start" | "submit" | "cancel"; region?: string; plan?: string; id?: string; receipt?: { data?: string; mime?: string } };

export async function POST(req: Request) {
  try {
    const user = authEnabled() ? await currentUser(req) : null;
    if (!user) throw new AiError("Obuna uchun Google orqali kiring", 401, "AUTH");
    rateLimit(req, "pay", 30, 10 * 60_000);
    const b = (await req.json()) as Body;
    if (b.action === "start") {
      if (!isRegion(b.region)) throw new AiError("Hudud noto‘g‘ri", 400);
      if (!payConfig()[b.region]) throw new AiError("Bu hudud uchun to‘lov hali sozlanmagan — admin bilan bog‘laning", 400, "NO_PAY");
      return Response.json({ open: view(await startPayment(user, b.region, b.plan ?? "")) });
    }
    if (b.action === "submit") {
      const data = typeof b.receipt?.data === "string" && b.receipt.data ? Buffer.from(b.receipt.data, "base64") : null;
      const receipt = data ? { data, mime: String(b.receipt?.mime ?? "") } : undefined;
      return Response.json({ open: view(await submitPayment(user, String(b.id ?? ""), receipt)) });
    }
    if (b.action === "cancel") {
      await cancelPayment(user, String(b.id ?? ""));
      return Response.json({ open: null });
    }
    throw new AiError("Noma’lum amal", 400);
  } catch (e) {
    return errorResponse(e);
  }
}
