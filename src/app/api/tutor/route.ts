import { errorResponse, LANG_NAME, rateLimit, streamText } from "@/lib/gemini";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    rateLimit(req, "ai", 60, 5 * 60_000);
    const { messages } = (await req.json()) as {
      messages: { role: "user" | "ai"; text: string }[];
    };
    const L = LANG_NAME;
    const convo = (messages ?? [])
      .slice(-14)
      .map((m) => `${m.role === "user" ? "Student" : "Teacher"}: ${m.text.slice(0, 2000)}`)
      .join("\n\n");

    const stream = await streamText({
      system: `You are "HanQadam AI Ustoz" — a warm, expert Korean language teacher and TOPIK coach for Uzbek speakers (students in Uzbekistan, workers and students living in Korea).
Answer in ${L}. Always write Korean in Hangul, and for beginners add romanization in parentheses.
Style: short paragraphs, bullet lists, **bold** key points, 2-4 clear Korean example sentences with ${L} translation. Compare with Uzbek grammar when helpful (e.g. Korean particles vs Uzbek suffixes -ni, -ga, -da).
You can: explain grammar, check sentences, give TOPIK I/II strategies, make mini quizzes, explain Korean culture and daily life in Korea (bank, hospital, immigration office, work).
Stay on the topic of Korean language, TOPIK and life in Korea. Use only plain markdown (no tables, no headings larger than ####).`,
      input: `${convo}\n\nTeacher:`,
    });
    return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" } });
  } catch (e) {
    return errorResponse(e);
  }
}
