import { errorResponse, generateJson, LANG_NAME, rateLimit, type ContentPart } from "@/lib/gemini";
import { writingResultSchema } from "@/lib/schemas";
import type { WritingTask } from "@/lib/exam";
import { aiAccess } from "@/lib/server/guard";

export const maxDuration = 60;

const RUBRIC: Record<number, string> = {
  51: `Task 51 (10 points): fill blanks ㉠ and ㉡ in a practical text (notice/email/message). Score each blank 0-5:
5 = content fits the context perfectly AND grammar/ending is natural and matches the text's register (formal -(스)ㅂ니다 style);
3-4 = content fits but minor grammar/ending/spelling error; 1-2 = partially fits or major error; 0 = blank or wrong.
criteria must be exactly: [{"name":"㉠"...max 5},{"name":"㉡"...max 5}].`,
  52: `Task 52 (10 points): fill blanks ㉠ and ㉡ in an explanatory text written in written style (-다/-ㄴ다). Score each blank 0-5 with the same scale as Task 51; the answer must be in written style (-다), not -아요/-습니다. criteria must be exactly: [{"name":"㉠"...max 5},{"name":"㉡"...max 5}].`,
  53: `Task 53 (30 points): describe a graph/survey in 200-300 Korean characters (spaces count, like 원고지 cells) in written style (-다), without a title.
Official criteria: "내용 및 과제 수행" (max 7): covers all given information accurately; "글의 전개 구조" (max 7): logical intro-body-conclusion, good connectors; "언어 사용" (max 16): accurate, varied grammar & vocabulary, written style, spelling.
Deduct points if fewer than 200 or more than 300 characters, if -아요/-습니다 style is used, or if a title is written.`,
  54: `Task 54 (50 points): argumentative essay in 600-700 Korean characters (spaces count) in written style (-다), answering all guiding questions, without copying the prompt.
Official criteria: "내용 및 과제 수행" (max 12): answers every guiding question with relevant, rich ideas; "글의 전개 구조" (max 12): clear 서론-본론-결론, paragraphing, cohesive devices; "언어 사용" (max 26): advanced/accurate grammar and vocabulary, appropriate written style, spelling.
Deduct points for being under 600 or over 700 characters, copying the prompt, or using -아요/-습니다 style.`,
};

export async function POST(req: Request) {
  try {
    rateLimit(req, "ai", 60, 5 * 60_000);
    await aiAccess(req, "writing");
    const body = (await req.json()) as {
      task: WritingTask;
      text?: string;
      images?: { data: string; mime: string }[];
      lang: "uz" | "ru";
    };
    const { task, text, images = [], lang } = body;
    if (!task || ![51, 52, 53, 54].includes(task.n)) return Response.json({ error: "Topshiriq noto'g'ri" }, { status: 400 });
    if (!text?.trim() && !images.length) return Response.json({ error: "Javob bo'sh" }, { status: 400 });
    if (images.length > 4) return Response.json({ error: "Ko'pi bilan 4 ta rasm" }, { status: 400 });
    const L = LANG_NAME[lang] ?? LANG_NAME.uz;

    const taskText = [
      `문제 ${task.n}. ${task.instruction}`,
      task.passage ? `지문:\n${task.passage}` : "",
      task.chart ? `그래프 자료: ${JSON.stringify(task.chart)}` : "",
      task.notes?.length ? `참고:\n${task.notes.join("\n")}` : "",
      task.topic ? `주제:\n${task.topic}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const parts: ContentPart[] = [
      { type: "text", text: `${taskText}\n\n---\n` },
      ...(images.length
        ? [
            {
              type: "text" as const,
              text: `The learner wrote the answer by hand on paper (possibly on 원고지 manuscript paper) and uploaded ${images.length} photo(s). First transcribe EXACTLY what is written (keep the learner's mistakes, do not fix them) into recognized_text. If the handwriting is unclear, make your best guess and mention it in summary.`,
            },
            ...images.map((im) => ({ type: "image" as const, data: im.data, mime_type: im.mime })),
          ]
        : []),
      ...(text?.trim() ? [{ type: "text" as const, text: `Learner's typed answer:\n${text}` }] : []),
    ];

    const result = await generateJson({
      system: `You are a certified TOPIK II writing (쓰기) examiner. Grade strictly but fairly, exactly like the official TOPIK scoring.
${RUBRIC[task.n]}
Write all comments, explanations, strengths and summary in ${L}. Keep Korean text in Hangul.
- max must be ${task.pts}. score = sum of criteria scores.
- mistakes: list up to 10 concrete errors (original Korean fragment → corrected Korean → short explanation in ${L}).
- model_answer: a high-scoring model answer in Korean for this task (for 51/52 write "㉠: ... / ㉡: ...").
- level_hint: estimated TOPIK writing level (e.g. "3급 수준") with one sentence in ${L}.
- char_count: number of characters (including spaces) of recognized_text.`,
      input: parts,
      schema: writingResultSchema,
      thinking: "medium",
      timeoutMs: 80000,
    });
    return Response.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
