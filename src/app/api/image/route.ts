import { connection } from "next/server";
import { errorResponse, hasKey, rateLimit } from "@/lib/gemini";
import { IMAGE_WIDTHS, imagePromptsOf, MAX_IMAGE_PROMPT, type ImageStyle } from "@/lib/images";
import { cachedImage, createImage } from "@/lib/server/images";
import { chargeQuota, requireAiAccess } from "@/lib/server/guard";
import { trackUsage } from "@/lib/server/usage";
import { ALL_BUILTIN_TESTS } from "@/data/tests";
import { visualPrompts } from "@/data/visuals";

export const maxDuration = 60;

// Tayyor variant rasmlari va sayt ikonkalari — hammaga ochiq (soni cheklangan, bir marta chizilib keshda turadi).
// AI variantlardagi rasmlar — faqat kirgan va sinovi tugamagan foydalanuvchilarga, kunlik limit bilan.
type PublicStyle = ImageStyle;
const BUILTIN: Record<PublicStyle, Set<string>> = {
  test: new Set(imagePromptsOf(ALL_BUILTIN_TESTS)),
  icon: new Set(visualPrompts()),
};

export async function GET(req: Request) {
  await connection();
  try {
    const params = new URL(req.url).searchParams;
    const prompt = (params.get("p") ?? "").trim();
    const style: PublicStyle = params.get("s") === "icon" ? "icon" : "test";
    const wn = Number(params.get("w"));
    const w = (IMAGE_WIDTHS as readonly number[]).includes(wn) ? wn : undefined;
    if (!prompt || prompt.length > MAX_IMAGE_PROMPT) return Response.json({ error: "Rasm tavsifi noto'g'ri" }, { status: 400 });
    const builtin = BUILTIN[style].has(prompt);
    // Ikonka uslubi faqat saytning o'z ikonkalari uchun
    if (style === "icon" && !builtin) return Response.json({ error: "Bunday ikonka yo'q" }, { status: 400 });
    const cache = builtin ? "public, max-age=31536000, immutable" : "private, max-age=31536000, immutable";

    let img = await cachedImage(prompt, style, w);
    if (!img) {
      if (!hasKey()) return Response.json({ error: "Rasm yaratish o'chirilgan", code: "NO_KEY" }, { status: 503 });
      if (!builtin) {
        const user = await requireAiAccess(req);
        await chargeQuota(user, "image");
        rateLimit(req, "img", 40, 10 * 60_000);
      } else rateLimit(req, "img-site", 150, 10 * 60_000);
      img = await createImage(prompt, style, w);
      await trackUsage("image");
    }
    return new Response(new Uint8Array(img.data), { headers: { "Content-Type": img.mime, "Cache-Control": cache } });
  } catch (e) {
    return errorResponse(e);
  }
}
