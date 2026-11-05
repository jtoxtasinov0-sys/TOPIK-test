import { AiError, errorResponse, generateJson, rateLimit } from "@/lib/gemini";
import { groupSchema, writingTaskSchema } from "@/lib/schemas";
import type { Group, Question, WritingTask } from "@/lib/exam";
import { aiAccess } from "@/lib/server/guard";

export const maxDuration = 60;

const SYSTEM = `You are an expert TOPIK item writer at NIIED level. You create brand-new, ORIGINAL practice items that follow the official TOPIK format exactly.
Rules:
- Keep EXACTLY the same question numbers, question count, question types, per-question prompt wording, option count (4), option style and difficulty as the template.
- Write completely NEW content (new situations, names, topics, numbers). Never copy the template sentences.
- Use natural, correct standard Korean. Listening scripts use lines like "남자: ..." / "여자: ..." (or a single narrator line without label when the template does).
- Exactly one option is correct; "answer" is its 1-based index. Vary the correct answer position across questions.
- For picture options ("optionStyle":"picture"), each option is a short emoji scene (3-5 emojis) that clearly depicts a different situation; only one matches the dialogue.
- For chart options, fill optionCharts with 4 charts; only one matches the script.
- Keep markers like ( ), ㉠ ㉡ ㉢ ㉣, (가)(나)(다)(라) and <u>underlined</u> text in the same way as the template.
- Return only fields that the template uses.`;

const EXAM_LABEL: Record<string, string> = {
  topik1: "TOPIK I (levels 1-2, beginner)",
  topik2: "TOPIK II (levels 3-6)",
  eps: `EPS-TOPIK (고용허가제 한국어능력시험) for foreign workers coming to Korea on the E-9 visa. Difficulty about TOPIK level 1-2.
Topics: daily life, the dormitory, the factory/farm/construction site, tools and equipment, industrial safety (safety signs: 금지·경고·지시·안내), work rules (근무 시간, 야근, 특근, 급여, 휴가), labor rights, Korean culture and manners.
Use short, clear sentences and the polite -아요/어요 or -(스)ㅂ니다 style. For "picture" fields write a short emoji scene (1-4 emojis) that clearly shows the object, action or safety sign.`,
};

export async function POST(req: Request) {
  try {
    rateLimit(req, "gen", 120, 10 * 60_000);
    await aiAccess(req, "generate");
    const body = (await req.json()) as { exam: string; group?: Group; writing?: WritingTask };

    if (body.writing) {
      const w = body.writing;
      const out = await generateJson<Partial<WritingTask>>({
        system: SYSTEM,
        input: `Create a NEW TOPIK II writing task ${w.n} with the same format and difficulty as this template (JSON). Return passage/chart/notes/topic fields as used by the template.\n${JSON.stringify(w)}`,
        schema: writingTaskSchema,
        thinking: "low",
      });
      return Response.json({ ...w, ...out, n: w.n, pts: w.pts, kind: w.kind, instruction: w.instruction });
    }

    const g = body.group;
    if (!g || !Array.isArray(g.questions) || g.questions.length > 6) {
      return Response.json({ error: "Shablon noto'g'ri" }, { status: 400 });
    }
    const out = await generateJson<Partial<Group>>({
      system: SYSTEM,
      input: `Exam: ${EXAM_LABEL[body.exam] ?? EXAM_LABEL.topik2}.
Instruction for this block: ${g.instruction}
Template block (JSON):
${JSON.stringify({ ...g, instruction: undefined })}

Create a NEW block with question numbers ${g.questions.map((q) => q.n).join(", ")}.`,
      schema: groupSchema,
      thinking: "low",
      timeoutMs: 55000,
    });

    // Tekshiruv: raqamlar, variantlar va javoblar to'g'ri bo'lishi shart
    const qs = (out.questions ?? []) as Question[];
    if (qs.length !== g.questions.length) throw new AiError("AI savollar sonini buzdi", 502);
    const questions: Question[] = g.questions.map((tq, i) => {
      const q = qs[i];
      const options = (q.options ?? []).slice(0, 4);
      if (options.length !== 4 || !(q.answer >= 1 && q.answer <= 4)) throw new AiError("AI noto'g'ri savol yaratdi", 502);
      if (tq.picture && !q.picture?.trim()) throw new AiError("AI rasmni yaratmadi", 502);
      return {
        ...q,
        n: tq.n,
        pts: tq.pts,
        options,
        optionStyle: tq.optionStyle,
        prompt: q.prompt ?? tq.prompt,
        picture: tq.picture ? q.picture : undefined,
        optionCharts: tq.optionStyle === "chart" ? q.optionCharts?.slice(0, 4) : undefined,
      };
    });
    const group: Group = {
      from: g.from,
      to: g.to,
      instruction: g.instruction,
      example: g.example ? out.example || g.example : undefined,
      script: g.script ? out.script : undefined,
      passage: g.passage ? out.passage : undefined,
      given: g.given ? out.given : undefined,
      notice: g.notice ? out.notice : undefined,
      chart: g.chart ? out.chart : undefined,
      questions,
    };
    return Response.json(group);
  } catch (e) {
    return errorResponse(e);
  }
}
