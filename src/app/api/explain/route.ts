import { errorResponse, generateJson, LANG_NAME, rateLimit } from "@/lib/gemini";
import { explainSchema } from "@/lib/schemas";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    rateLimit(req, "ai", 60, 5 * 60_000);
    const { context, answer, user } = (await req.json()) as {
      context: string;
      answer: number;
      user?: number;
    };
    if (!context || context.length > 6000) return Response.json({ error: "Kontekst noto'g'ri" }, { status: 400 });
    const L = LANG_NAME;

    const result = await generateJson({
      system: `You are an expert TOPIK (Test of Proficiency in Korean) teacher for ${L}-speaking learners from Uzbekistan and Central Asia.
Explain TOPIK questions clearly and kindly. Write ALL explanations in ${L}. Keep Korean words in Hangul.
- translation: full natural translation of the Korean script/passage into ${L} (keep speaker labels).
- correct_reason: why the correct option is right, citing the exact Korean phrase that proves it.
- wrong_options: briefly why the other options are wrong.
- vocab: 4-8 key words (Korean → ${L} meaning).
- grammar: 1-3 grammar patterns used (e.g. "-(으)려고 하다") with meaning and short usage note in ${L}.
- tip: one practical exam strategy tip for this question type, in ${L}.`,
      input: `TOPIK question:\n${context}\n\nCorrect answer: option ${answer}.${user ? ` The learner chose option ${user}.` : ""}`,
      schema: explainSchema,
      thinking: "low",
    });
    return Response.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
