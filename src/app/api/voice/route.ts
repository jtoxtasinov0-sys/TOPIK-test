import { errorResponse, generateJson, LANG_NAME, normalizeMime, rateLimit, transcribe, type ContentPart } from "@/lib/gemini";
import { voiceSchema } from "@/lib/schemas";
import { aiAccess } from "@/lib/server/guard";

export const maxDuration = 60;

// Ovozli ustoz: o'quvchi o'zbekcha (yoki koreyscha) gapiradi, ustoz o'zbekcha tushuntirib, koreyscha so'zlarni o'rgatadi.
// Javob tillar bo'yicha bo'laklarga bo'lingan holda qaytadi — brauzer uni ovoz chiqarib o'qiydi.

type Body = {
  audio?: { data: string; mime: string };
  text?: string;
  level?: "beginner" | "intermediate" | "advanced";
  history?: { role: "me" | "ai"; text: string }[];
};

type VoiceReply = {
  segments: { lang: "uz" | "ko"; text: string }[];
  practice?: { ko?: string; rom?: string; uz?: string };
};

const LEVEL = {
  beginner: "complete beginner: knows little or no Korean. Teach 1 short word or phrase at a time, polite -요 style",
  intermediate: "intermediate (TOPIK 2-3): can handle short everyday sentences; teach natural phrases and grammar points",
  advanced: "advanced (TOPIK 4-6): use more Korean in your answers, natural expressions and nuance",
};

const HANGUL = /[가-힣]/;

export async function POST(req: Request) {
  try {
    rateLimit(req, "voice", 50, 5 * 60_000);
    await aiAccess(req, "speak");
    const b = (await req.json()) as Body;
    if (b.audio && b.audio.data.length > 8_000_000) return Response.json({ error: "Audio juda uzun" }, { status: 400 });

    // 1) Nutqni matnga aylantirish (o'zbekcha, koreyscha yoki ruscha)
    let transcript = (b.text ?? "").trim().slice(0, 1000);
    let mime = "";
    if (!transcript && b.audio?.data) {
      mime = normalizeMime(b.audio.mime);
      transcript = await transcribe(b.audio.data, mime, ["uz-UZ", "ko-KR", "ru-RU"]);
    }
    if (!transcript) return Response.json({ transcript: "", empty: true });

    const L = LANG_NAME;
    const history = (b.history ?? [])
      .slice(-16)
      .map((h) => `${h.role === "ai" ? "Teacher" : "Student"}: ${String(h.text).slice(0, 1200)}`)
      .join("\n");

    const system = `You are "HanUstoz", a warm, patient Korean language teacher for Uzbek speakers. You are talking with the student BY VOICE: everything in "segments" is read aloud by text-to-speech, so write it as natural speech.
The student speaks ${L} (sometimes Russian or Korean). You explain in ${L} and use Korean only for the words and phrases you are teaching.
Student level: ${LEVEL[b.level ?? "beginner"] ?? LEVEL.beginner}.

How to answer:
- Keep it short and spoken: 2-5 short sentences in total. No markdown, lists, emojis, brackets or romanization inside segments.
- segments: what you say, in order, split by language. lang "uz" = ${L}; lang "ko" = Korean in Hangul only. Put every Korean word or phrase in its own "ko" segment so it is pronounced by a native voice. Never put Hangul inside an "uz" segment.
- If the student asks how to say something in Korean: say the Korean, explain it briefly in ${L} (polite vs casual form if relevant), then ask them to repeat it.
- If the student says something in Korean (repeating or practising): tell them in ${L} whether it was right, gently correct the grammar or pronunciation (use the audio if it is attached), then continue.
- Lessons: if the student asks for a lesson ("dars", "o'rgat") or to continue, teach one small step per turn: 1-2 new phrases, ask them to repeat, check, then move on. Use the conversation history to continue the same lesson. End every turn with a question or a prompt for the student.
- practice: the main Korean phrase of this turn for the student to repeat — ko (Hangul), rom (Revised Romanization), uz (${L} meaning). Use empty strings if there is nothing to repeat.
- Stay on Korean language, TOPIK and life in Korea. If asked about something else, kindly bring the talk back to learning Korean.`;

    const parts: ContentPart[] = [
      {
        type: "text",
        text: `Conversation so far:\n${history || "(none — this is the first message)"}\n\nStudent just said${mime ? " (transcribed by speech recognition)" : ""}: "${transcript}"`,
      },
    ];
    // Koreyscha gapirgan bo'lsa — talaffuzni baholash uchun asl audioni ham beramiz
    if (mime && HANGUL.test(transcript) && b.audio && b.audio.data.length < 2_500_000) {
      parts.push({ type: "text", text: "Student's original audio (use it for pronunciation feedback):" });
      parts.push({ type: "audio", data: b.audio.data, mime_type: mime });
    }

    const r = await generateJson<VoiceReply>({ system, input: parts, schema: voiceSchema, thinking: "low", timeoutMs: 50000 });
    const segments = (r.segments ?? [])
      .map((s) => ({ lang: s.lang === "ko" ? ("ko" as const) : ("uz" as const), text: String(s.text ?? "").trim() }))
      .filter((s) => s.text);
    if (!segments.length) return Response.json({ error: "AI javob bermadi, qayta urinib ko‘ring" }, { status: 502 });
    const practice = r.practice?.ko?.trim() ? { ko: r.practice.ko.trim(), rom: r.practice.rom ?? "", uz: r.practice.uz ?? "" } : undefined;
    return Response.json({ transcript, segments, practice });
  } catch (e) {
    return errorResponse(e);
  }
}
