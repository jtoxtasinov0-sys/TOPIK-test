import { errorResponse, rateLimit } from "@/lib/gemini";
import { CLIENT_EVENTS, trackUsage, type UsageEvent } from "@/lib/server/usage";

// Brauzerdan keladigan oddiy hodisalar (masalan, mock test yakunlandi). Faqat son oshadi, shaxsiy ma'lumot saqlanmaydi.
export async function POST(req: Request) {
  try {
    rateLimit(req, "usage", 20, 10 * 60_000);
    const { event } = (await req.json().catch(() => ({}))) as { event?: string };
    if (!event || !CLIENT_EVENTS.includes(event as UsageEvent)) return Response.json({ error: "Noma'lum hodisa" }, { status: 400 });
    await trackUsage(event as UsageEvent);
    return new Response(null, { status: 204 });
  } catch (e) {
    return errorResponse(e);
  }
}
