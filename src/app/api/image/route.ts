import { connection } from "next/server";
import { errorResponse, hasKey, rateLimit } from "@/lib/gemini";
import { imagePromptsOf, MAX_IMAGE_PROMPT } from "@/lib/images";
import { cachedImage, createImage } from "@/lib/server/images";
import { chargeQuota, requireAiAccess } from "@/lib/server/guard";
import { trackUsage } from "@/lib/server/usage";
import { TOPIK1 } from "@/data/topik1";
import { TOPIK2 } from "@/data/topik2";
import { EPS } from "@/data/eps";

export const maxDuration = 60;

// Tayyor variantlardagi rasmlar — hammaga ochiq (soni cheklangan, bir marta yaratilib keshda turadi).
// AI variantlardagi rasmlar — faqat kirgan va sinovi tugamagan foydalanuvchilarga, kunlik limit bilan.
const BUILTIN = new Set(imagePromptsOf([TOPIK1, TOPIK2, EPS]));

export async function GET(req: Request) {
  await connection();
  try {
    const prompt = (new URL(req.url).searchParams.get("p") ?? "").trim();
    if (!prompt || prompt.length > MAX_IMAGE_PROMPT) return Response.json({ error: "Rasm tavsifi noto'g'ri" }, { status: 400 });
    const builtin = BUILTIN.has(prompt);
    const cache = builtin ? "public, max-age=31536000, immutable" : "private, max-age=31536000, immutable";

    let img = await cachedImage(prompt);
    if (!img) {
      if (!hasKey()) return Response.json({ error: "Rasm yaratish o'chirilgan", code: "NO_KEY" }, { status: 503 });
      if (!builtin) {
        const user = await requireAiAccess(req);
        await chargeQuota(user, "image");
      }
      rateLimit(req, "img", 40, 10 * 60_000);
      img = await createImage(prompt);
      await trackUsage("image");
    }
    return new Response(new Uint8Array(img.data), { headers: { "Content-Type": img.mime, "Cache-Control": cache } });
  } catch (e) {
    return errorResponse(e);
  }
}
