import { errorResponse, generateJson, LANG_NAME, rateLimit } from "@/lib/gemini";
import { explainSchema } from "@/lib/schemas";
import { aiAccess } from "@/lib/server/guard";
import { BASIC_GRAMMAR, teacherNotes } from "@/lib/knowledge";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    rateLimit(req, "ai", 60, 5 * 60_000);
    await aiAccess(req, "explain");
    const { context, answer, user, exam } = (await req.json()) as {
      context: string;
      answer: number;
      user?: number;
      exam?: string;
    };
    if (!context || context.length > 6000) return Response.json({ error: "Kontekst noto'g'ri" }, { status: 400 });
    const L = LANG_NAME;
    const examName = exam === "eps" ? "EPS-TOPIK" : exam === "topik1" ? "TOPIK I" : exam === "topik2" ? "TOPIK II" : "TOPIK";
    // Yo'riqnoma qatori (※ … 고르십시오) har bir savolda bor — qidiruvda faqat savol matni hisobga olinadi
    const body = context
      .split("\n")
      .filter((l) => !l.trim().startsWith("※"))
      .join("\n");
    const notes = teacherNotes(body, {
      grammar: 3,
      mistakes: 0,
      work: exam === "eps" ? 2 : 0,
      maxChars: 2500,
      filter: { minLevel: exam === "topik2" ? 2 : 1, exclude: BASIC_GRAMMAR },
    });

    const result = await generateJson({
      system: `You are an expert TOPIK and EPS-TOPIK teacher for ${L}-speaking learners from Uzbekistan and Central Asia. This question is from ${examName}.
Explain TOPIK questions clearly and kindly. Write ALL explanations in ${L}. Keep Korean words in Hangul.
- translation: full natural translation of the Korean script/passage into ${L} (keep speaker labels).
- correct_reason: why the correct option is right, citing the exact Korean phrase that proves it.
- wrong_options: briefly why the other options are wrong.
- vocab: 4-8 key words (Korean → ${L} meaning).
- grammar: 1-3 grammar patterns used (e.g. "-(으)려고 하다") with meaning and short usage note in ${L}.
- tip: one practical exam strategy tip for this question type, in ${L}.${notes ? `\n\nKnowledge base notes (HanUstoz; use the same explanations and terms when these patterns appear):\n${notes}` : ""}`,
      input: `TOPIK question:\n${context}\n\nCorrect answer: option ${answer}.${user ? ` The learner chose option ${user}.` : ""}`,
      schema: explainSchema,
      thinking: "low",
    });
    return Response.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
