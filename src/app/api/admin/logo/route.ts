import { connection } from "next/server";
import { AiError, errorResponse, generateImage, rateLimit } from "@/lib/gemini";
import { LOGO_BRIEF, logoPrompt, MAX_LOGO_IMAGES, MAX_LOGO_VARIANTS } from "@/lib/logo";
import { requireAdmin } from "@/lib/server/guard";
import { trackUsage } from "@/lib/server/usage";

export const maxDuration = 60;

type Body = { brief?: string; images?: { data?: string; mime?: string }[]; count?: number };

// Admin: namuna rasmlar + topshiriq → Gemini bir nechta logo varianti chizadi (har biri boshqa g'oya bilan)
export async function POST(req: Request) {
  await connection();
  try {
    await requireAdmin(req);
    rateLimit(req, "logo", 20, 10 * 60_000);
    const b = (await req.json()) as Body;
    const brief = (b.brief ?? "").trim() || LOGO_BRIEF;
    if (brief.length > 4000) throw new AiError("Topshiriq juda uzun", 400);
    const images = (b.images ?? [])
      .filter((im) => typeof im?.data === "string" && /^image\/(png|jpeg|webp)$/.test(String(im.mime)))
      .slice(0, MAX_LOGO_IMAGES)
      .map((im) => ({ data: String(im.data), mime: String(im.mime) }));
    if (images.some((im) => im.data.length > 6_000_000)) throw new AiError("Rasm juda katta", 400);
    const count = Math.min(MAX_LOGO_VARIANTS, Math.max(1, Math.floor(Number(b.count) || MAX_LOGO_VARIANTS)));

    const results = await Promise.allSettled(
      Array.from({ length: count }, (_, i) => generateImage(logoPrompt(brief, i, count), { aspectRatio: "1:1", images }))
    );
    const out = results.map((r) =>
      r.status === "fulfilled" ? { data: r.value.data.toString("base64"), mime: r.value.mime } : { error: (r.reason as Error)?.message || "Xato" }
    );
    const ok = out.filter((x) => "data" in x).length;
    for (let i = 0; i < ok; i++) await trackUsage("image");
    if (!ok) throw new AiError((out[0] as { error: string }).error, 502);
    return Response.json({ results: out }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    return errorResponse(e);
  }
}
