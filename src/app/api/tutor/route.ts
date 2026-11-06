import { errorResponse, LANG_NAME, rateLimit, streamText } from "@/lib/gemini";
import { TEACHING_METHOD, teacherNotes, TOPIK_FACTS, vocabNotes } from "@/lib/knowledge";
import { aiAccess } from "@/lib/server/guard";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    rateLimit(req, "ai", 60, 5 * 60_000);
    await aiAccess(req, "tutor");
    const { messages, student } = (await req.json()) as {
      messages: { role: "user" | "ai"; text: string }[];
      student?: string; // brauzerdan: maqsad daraja, imtihon sanasi, oxirgi natijalar
    };
    const L = LANG_NAME;
    const recent = (messages ?? []).slice(-12);
    const convo = recent.map((m) => `${m.role === "user" ? "Student" : "Teacher"}: ${m.text.slice(0, 2000)}`).join("\n\n");

    // Bilim bazasidan: oxirgi ikki savolga mos grammatika, o'zbeklarga xos xatolar, ish joyi ma'lumotlari va lug'at
    const asked = recent
      .filter((m) => m.role === "user")
      .slice(-2)
      .map((m) => m.text.slice(0, 2000))
      .join("\n");
    const notes = [teacherNotes(asked), vocabNotes(asked)].filter(Boolean).join("\n\n");
    const profile = typeof student === "string" ? student.slice(0, 800) : "";

    const stream = await streamText({
      system: `You are "AI Ustoz" of HanUstoz — a warm, expert Korean language teacher and TOPIK / EPS-TOPIK coach for Uzbek speakers (students in Uzbekistan, workers and students living in Korea).
Answer in ${L}. Always write Korean in Hangul, and for beginners add romanization in parentheses.
Be quick and to the point: answer the exact question first, keep the whole reply short (usually under 180 words) unless the student asks for a long lesson or plan.
Translation requests ("koreyschada qanday bo'ladi?", "tarjima qil", a sentence to translate): start straight away with the natural Korean translation in **bold** (polite -요 style unless asked otherwise) and romanization for beginners, then at most 3 short notes on the key words or grammar.
Style: short paragraphs, bullet lists, **bold** key points, 2-4 clear Korean example sentences with ${L} translation. Compare with Uzbek grammar when helpful (e.g. Korean particles vs Uzbek suffixes -ni, -ga, -da).
You can: explain grammar, check sentences, give TOPIK I/II and EPS-TOPIK strategies, make mini quizzes, teach step-by-step lessons, explain Korean culture, work rules and daily life in Korea (bank, hospital, immigration office, factory).
Stay on the topic of Korean language, TOPIK, EPS-TOPIK and life in Korea. Use only plain markdown (no tables, no headings larger than ####).
When recommending practice, point to the app sections: «Testlar» (mock tests), «Rasmiy o‘tgan testlar» (/test/past), «So‘zlar» (TOPIK I/II lug‘ati), «Grammatika», «Yozish», «Gaplashish».

${TEACHING_METHOD}

${TOPIK_FACTS}${profile ? `\n\nStudent profile (from the app): ${profile}` : ""}${notes ? `\n\nKnowledge base notes (HanUstoz):\n${notes}` : ""}`,
      input: `${convo}\n\nTeacher:`,
    });
    return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" } });
  } catch (e) {
    return errorResponse(e);
  }
}
