import { createHash } from "node:crypto";
import { errorResponse, hasKey, rateLimit, synthesize } from "@/lib/gemini";
import { parseScript } from "@/lib/exam";

export const maxDuration = 60;

// Bir xil matn qayta-qayta so'ralganda Gemini'ga qayta murojaat qilmaslik uchun
const cache = new Map<string, Buffer>();

export async function POST(req: Request) {
  try {
    if (!hasKey()) return Response.json({ error: "TTS o'chirilgan", code: "NO_KEY" }, { status: 503 });
    const { text, slow, voice } = (await req.json()) as { text?: string; slow?: boolean; voice?: "f" | "m" };
    if (typeof text !== "string" || !text.trim() || text.length > 2500) {
      return Response.json({ error: "Matn noto'g'ri" }, { status: 400 });
    }
    const key = createHash("sha1").update(`${slow ? 1 : 0}|${voice ?? ""}|${text}`).digest("hex");
    let buf = cache.get(key);
    if (!buf) {
      rateLimit(req, "tts", 90, 5 * 60_000);
      buf = await synthesize(parseScript(text), { slow: !!slow, voice });
      cache.set(key, buf);
      if (cache.size > 400) cache.delete(cache.keys().next().value as string);
    }
    return new Response(new Uint8Array(buf), {
      headers: { "Content-Type": "audio/wav", "Cache-Control": "private, max-age=604800" },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
