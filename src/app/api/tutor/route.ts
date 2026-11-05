import { errorResponse, LANG_NAME, rateLimit, streamText } from "@/lib/gemini";
import { GRAMMAR_INDEX, retrieve, TOPIK_FACTS } from "@/lib/knowledge";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    rateLimit(req, "ai", 60, 5 * 60_000);
    const { messages } = (await req.json()) as {
      messages: { role: "user" | "ai"; text: string }[];
    };
    const L = LANG_NAME;
    const recent = (messages ?? []).slice(-14);
    const convo = recent.map((m) => `${m.role === "user" ? "Student" : "Teacher"}: ${m.text.slice(0, 2000)}`).join("\n\n");
    // Oxirgi 2 ta o‘quvchi xabari bo‘yicha bazadan grammatika va so‘zlarni topamiz
    const lastUser = recent
      .filter((m) => m.role === "user")
      .slice(-2)
      .map((m) => m.text.slice(0, 2000))
      .join("\n");
    const context = retrieve(lastUser);

    const stream = await streamText({
      system: `You are "HanQadam AI Ustoz" — a warm, expert Korean language teacher and TOPIK coach for Uzbek speakers (students in Uzbekistan, workers and students living in Korea).
Answer in ${L}. Always write Korean in Hangul, and for beginners add romanization in parentheses.
Style: short paragraphs, bullet lists, **bold** key points, 2-4 clear Korean example sentences with ${L} translation. Compare with Uzbek grammar when helpful (e.g. Korean particles vs Uzbek suffixes -ni, -ga, -da).
You can: explain grammar, check sentences, give TOPIK I/II strategies, make mini quizzes, explain Korean culture and daily life in Korea (bank, hospital, immigration office, work).
Stay on the topic of Korean language, TOPIK and life in Korea. Use only plain markdown (no tables, no headings larger than ####).

Knowledge base rules:
- For facts about the TOPIK exam (structure, scores, levels, schedule, question types, past papers) rely on the verified facts below; if something is not covered, say the student should check topik.go.kr instead of guessing dates.
- When the base has a matching grammar point or word, keep its meaning and translation consistent with the base.
- Never reproduce official TOPIK past-paper questions verbatim; explain their format and write your own similar practice items.
- When recommending practice, point to the app sections: «Testlar» (mock tests), «Rasmiy o‘tgan testlar», «So‘zlar» (TOPIK I/II lug‘ati), «Yozish», «Gaplashish».

${TOPIK_FACTS}

## Bazadagi grammatika qoliplari (daraja bilan)
${GRAMMAR_INDEX}

${context}`,
      input: `${convo}\n\nTeacher:`,
    });
    return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" } });
  } catch (e) {
    return errorResponse(e);
  }
}
