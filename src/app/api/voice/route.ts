import { AiError, errorResponse, generateJson, hasKey, LANG_NAME, normalizeMime, rateLimit, streamText, type ContentPart } from "@/lib/gemini";
import { voiceSchema } from "@/lib/schemas";
import { jsonEvents, ndjson } from "@/lib/server/events";
import { aiAccess, authEnabled } from "@/lib/server/guard";
import { readSession } from "@/lib/server/session";
import type { User } from "@/lib/server/users";
import { teacherNotes } from "@/lib/knowledge";
import { tutorChunks } from "@/lib/speech";

export const maxDuration = 60;

// Ovozli ustoz: o'quvchi o'zbekcha (yoki koreyscha) gapiradi, ustoz o'zbekcha tushuntirib, koreyscha so'zlarni o'rgatadi.
// Tezlik uchun BITTA Gemini so'rovi: model audioni o'zi eshitadi ("heard") va shu zahoti javob yozadi.
// Javob tillar bo'yicha bo'laklarga bo'lingan holda qaytadi — brauzer uni ovoz chiqarib o'qiydi.
// stream: true — NDJSON oqimi: heard (o'quvchi gapi), reply (ustoz javobi; ovozi serverda shu zahoti tayyorlanadi),
// audio (tayyor ovoz bo'laklari), done (to'liq natija: + practice) — erkin suhbatdagi kabi.

type Body = {
  stream?: boolean;
  audio?: { data: string; mime: string };
  text?: string;
  level?: "beginner" | "intermediate" | "advanced";
  history?: { role: "me" | "ai"; text: string }[];
};

type VoiceReply = {
  heard?: string;
  segments?: { lang?: string; text?: string }[];
  practice?: { ko?: string; rom?: string; uz?: string };
};

const LEVEL = {
  beginner: "complete beginner: knows little or no Korean. Teach 1 short word or phrase at a time, polite -요 style",
  intermediate: "intermediate (TOPIK 2-3): can handle short everyday sentences; teach natural phrases and grammar points",
  advanced: "advanced (TOPIK 4-6): use more Korean in your answers, natural expressions and nuance",
};

export async function POST(req: Request) {
  try {
    rateLimit(req, "voice", 60, 5 * 60_000);
    // Kirmagan bo'lsa — bazaga ham, Gemini'ga ham murojaat qilmasdan rad etamiz
    if (authEnabled() && !readSession(req)) await aiAccess(req, "speak");
    const b = (await req.json()) as Body;
    if (b.audio && b.audio.data.length > 8_000_000) return Response.json({ error: "Audio juda uzun" }, { status: 400 });

    const typed = (b.text ?? "").trim().slice(0, 1000);
    const audio = !typed && b.audio?.data ? { data: b.audio.data, mime: normalizeMime(b.audio.mime) } : null;
    if (!typed && !audio) return Response.json({ transcript: "", empty: true });

    const L = LANG_NAME;
    const history = (b.history ?? [])
      .slice(-16)
      .map((h) => `${h.role === "ai" ? "Teacher" : "Student"}: ${String(h.text).slice(0, 1200)}`)
      .join("\n");

    // Bilim bazasi: o'quvchi yozgan matn va so'nggi suhbat bo'yicha (audio mazmuni hali noma'lum)
    const recentText = [typed, ...(b.history ?? []).slice(-3).map((h) => String(h.text).slice(0, 600))].filter(Boolean).join("\n");
    const notes = teacherNotes(recentText, { grammar: 2, mistakes: 2, work: 1, maxChars: 1600 });

    const system = `You are "Ustoz", a friendly young male Korean language teacher for Uzbek speakers at HanUstoz. You are talking with the student BY VOICE: everything in "segments" is read aloud by text-to-speech, so write natural, warm, spoken language — like a real teacher in a one-to-one lesson.
The student speaks ${L} (sometimes Russian or Korean). You explain in ${L} and use Korean only for the words and phrases you teach.
Student level: ${LEVEL[b.level ?? "beginner"] ?? LEVEL.beginner}.

How to answer:
- heard: exactly what the student said in the attached audio, in the original language and script (Korean in Hangul, Uzbek in Latin). If there is no clear speech, heard = "" and segments = [].
- Be brief so the answer is spoken quickly: 1-3 short sentences, about 35 words at most. No markdown, lists, emojis, brackets or romanization inside segments.
- segments: what you say, in order, split by language. lang "uz" = ${L}; lang "ko" = Korean in Hangul only. Put every Korean word or phrase in its own "ko" segment so it is pronounced by a native voice. Never put Hangul inside an "uz" segment.
- If the student asks how to say something in Korean: say the Korean, explain it in one short sentence (polite vs casual if it matters), then ask them to repeat it.
- If the student says something in Korean (repeating or practising): listen to the audio, say in ${L} whether it was right, correct the pronunciation or grammar in one sentence, then continue.
- Lessons: if the student asks for a lesson ("dars", "o'rgat") or to continue, teach one small step per turn: 1-2 new phrases, ask them to repeat, check, then move on. Use the conversation history to continue the same lesson. End every turn with a question or a prompt for the student.
- practice: the main Korean phrase of this turn for the student to repeat — ko (Hangul), rom (Revised Romanization), uz (${L} meaning). Use empty strings if there is nothing to repeat.
- Stay on Korean language, TOPIK and life in Korea. If asked about something else, kindly bring the talk back to learning Korean.
- Teach like a professional: one small step per turn, compare with Uzbek when it helps, gently correct typical Uzbek-speaker mistakes (ㅓ/ㅗ, ㅡ, ㄱ/ㅋ/ㄲ, ㄹ, 받침, 에 vs 에서, 당신 for "siz").${notes ? `\n\nKnowledge base notes (HanUstoz, use them if relevant):\n${notes}` : ""}`;

    const parts: ContentPart[] = [
      {
        type: "text",
        text:
          `Conversation so far:\n${history || "(none — this is the first message)"}\n\n` +
          (audio ? "The student's voice message is attached. Write what they said in \"heard\", then answer them." : `Student typed: "${typed}"\nSet heard to exactly this text and answer them.`),
      },
    ];
    if (audio) parts.push({ type: "audio", data: audio.data, mime_type: audio.mime });

    const ask = { system, input: parts, schema: voiceSchema, thinking: "minimal" as const };

    if (b.stream && Date.now() > streamOffUntil) {
      // Kirish tekshiruvi (baza) va Gemini oqimini ochish parallel
      const opened = streamText(ask).catch((e: unknown) => (e instanceof Error ? e : new Error(String(e))));
      let user: User | null;
      try {
        user = await aiAccess(req, "speak");
      } catch (e) {
        void opened.then((x) => (x instanceof Error ? undefined : x.cancel().catch(() => {})));
        throw e;
      }
      const src = await opened;
      if (!(src instanceof Error)) return ndjson(voiceEvents(src, typed, hasKey() ? { user } : null));
      if (src instanceof AiError && [429, 503, 504].includes(src.status)) throw src;
      streamOffUntil = Date.now() + 10 * 60_000;
    } else {
      await aiAccess(req, "speak");
    }

    const out = finish(await generateJson<VoiceReply>({ ...ask, timeoutMs: 45000 }), typed);
    return "error" in out ? Response.json(out, { status: 502 }) : Response.json(out);
  } catch (e) {
    return errorResponse(e);
  }
}

/** Oqim (JSON + sxema) ishlamay qolsa — shu vaqtgacha oddiy so'rov ishlatiladi */
let streamOffUntil = 0;

const segmentsOf = (r: Partial<VoiceReply>) =>
  (r.segments ?? [])
    .map((s) => ({ lang: s.lang === "ko" ? ("ko" as const) : ("uz" as const), text: String(s.text ?? "").trim() }))
    .filter((s) => s.text);

function finish(r: VoiceReply, typed: string) {
  const transcript = typed || String(r.heard ?? "").trim();
  if (!transcript) return { transcript: "", empty: true as const };
  const segments = segmentsOf(r);
  if (!segments.length) return { error: "AI javob bermadi, qayta urinib ko‘ring" };
  const practice = r.practice?.ko?.trim() ? { ko: r.practice.ko.trim(), rom: r.practice.rom ?? "", uz: r.practice.uz ?? "" } : undefined;
  return { transcript, segments, practice };
}

/** Ustoz javobi oqimi: gap eshitilishi bilan — heard, javob bo'laklari tayyor bo'lishi bilan — reply (+ ovozi) */
function voiceEvents(src: ReadableStream<Uint8Array>, typed: string, tts: { user: User | null } | null) {
  let heard = !!typed;
  return jsonEvents<VoiceReply>(
    src,
    tts,
    (f, api) => {
      if (!heard && "heard" in f) {
        const transcript = String(f.heard ?? "").trim();
        if (!transcript) return "stop"; // nutq eshitilmadi — "done" da {empty}
        api.emit({ t: "heard", transcript });
        heard = true;
      }
      if (!heard || !("segments" in f)) return;
      const segments = segmentsOf(f);
      if (!segments.length) return;
      const ttsList = tts ? api.voice(tutorChunks(segments)) : [];
      api.emit({ t: "reply", transcript: typed || String(f.heard ?? "").trim(), segments, tts: ttsList });
      return "enough";
    },
    (raw, api) => api.emit({ t: "done", ...finish(raw, typed) })
  );
}
