import { AiError, errorResponse, rateLimit } from "@/lib/gemini";
import { planById } from "@/lib/plans";
import { clickCheckoutUrl, createOrder, paymeCheckoutUrl, providers, type Provider } from "@/lib/server/billing";
import { currentUser } from "@/lib/server/guard";
import { baseUrl } from "@/lib/server/session";

// Tarif tanlanganda buyurtma yaratib, Payme yoki Click to'lov sahifasi havolasini qaytaradi
export async function POST(req: Request) {
  try {
    rateLimit(req, "checkout", 20, 10 * 60_000);
    const user = await currentUser(req);
    if (!user) throw new AiError("Avval Google orqali kiring", 401, "AUTH");
    const body = (await req.json().catch(() => ({}))) as { plan?: string; provider?: Provider; lang?: "uz" | "ru" };
    const plan = planById(body.plan);
    if (!plan) return Response.json({ error: "Tarif noto'g'ri" }, { status: 400 });
    const provider: Provider | null = body.provider === "payme" || body.provider === "click" ? body.provider : null;
    if (!provider || !providers()[provider]) {
      return Response.json({ error: "Bu to'lov usuli hozircha ulanmagan", code: "NO_PROVIDER" }, { status: 400 });
    }
    const order = await createOrder(user, plan, provider);
    const back = `${baseUrl(req)}/account`;
    const url = provider === "payme" ? paymeCheckoutUrl(order, back, body.lang === "ru" ? "ru" : "uz") : clickCheckoutUrl(order, back);
    return Response.json({ url, orderId: order.id });
  } catch (e) {
    return errorResponse(e);
  }
}
