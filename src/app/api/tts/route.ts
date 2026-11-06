import { errorResponse, hasKey, rateLimit } from "@/lib/gemini";
import { requireAiAccess } from "@/lib/server/guard";
import { hasSpeech, speech } from "@/lib/server/tts";

export const maxDuration = 60;

/** Uyg'otish: suhbat sahifasi ochilganda — birinchi ovozgacha server tayyor turadi. AI chaqirilmaydi */
export function GET() {
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  try {
    if (!hasKey()) return Response.json({ error: "TTS o'chirilgan", code: "NO_KEY" }, { status: 503 });
    // Gemini ovozi — kirgan va sinovi tugamaganlar uchun; qolganlarga brauzer ovozi ishlaydi
    const user = await requireAiAccess(req);
    const { text, slow, voice, tutor, talk } = (await req.json()) as { text?: string; slow?: boolean; voice?: "f" | "m"; tutor?: boolean; talk?: boolean };
    if (typeof text !== "string" || !text.trim() || text.length > 2500) {
      return Response.json({ error: "Matn noto'g'ri" }, { status: 400 });
    }
    const o = { slow: !!slow, voice, tutor: !!tutor, talk: !!talk };
    if (!hasSpeech(text, o)) rateLimit(req, "tts", 90, 5 * 60_000);
    const buf = await speech(text, o, user);
    return new Response(new Uint8Array(buf), {
      headers: { "Content-Type": "audio/wav", "Cache-Control": "private, max-age=604800" },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
