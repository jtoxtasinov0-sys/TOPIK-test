import { errorResponse, generateJson, LANG_NAME, rateLimit, transcribe, type ContentPart } from "@/lib/gemini";
import { speakSchema } from "@/lib/schemas";

export const maxDuration = 60;

type Body = {
  start?: boolean;
  audio?: { data: string; mime: string };
  text?: string;
  scenario: { id: string; ko: string; role: string; goal: string };
  level: "beginner" | "intermediate" | "advanced";
  history: { role: "ai" | "me"; ko: string }[];
};

const LEVEL = {
  beginner: "absolute beginner (TOPIK 0-1): use very short, simple sentences with -아요/어요 polite style and basic words",
  intermediate: "intermediate (TOPIK 2-3): natural everyday polite Korean, moderate sentence length",
  advanced: "advanced (TOPIK 4-6): rich natural Korean, idioms allowed, formal/informal as the situation requires",
};

function normalizeMime(m: string) {
  const base = m.split(";")[0].trim().toLowerCase();
  if (base === "audio/mp4" || base === "audio/x-m4a") return "audio/m4a";
  if (base === "audio/mpeg3") return "audio/mp3";
  return base || "audio/webm";
}

export async function POST(req: Request) {
  try {
    rateLimit(req, "speak", 50, 5 * 60_000);
    const b = (await req.json()) as Body;
    const L = LANG_NAME;
    if (b.audio && b.audio.data.length > 8_000_000) return Response.json({ error: "Audio juda uzun" }, { status: 400 });

    // 1) Nutqni matnga aylantirish — Gemini 3.5 Transcribe
    let transcript = (b.text ?? "").trim();
    let mime = "";
    if (!b.start && b.audio?.data) {
      mime = normalizeMime(b.audio.mime);
      transcript = await transcribe(b.audio.data, mime, ["ko-KR", "uz-UZ", "ru-RU"]);
    }
    if (!b.start && !transcript) {
      return Response.json({ transcript: "", empty: true });
    }

    const history = (b.history ?? [])
      .slice(-12)
      .map((h) => `${h.role === "ai" ? "AI" : "Learner"}: ${h.ko}`)
      .join("\n");

    const system = `You are a friendly Korean conversation partner and speaking coach for learners from Uzbekistan / Central Asia living in or moving to Korea.
Role-play scenario: "${b.scenario.ko}". Your role: ${b.scenario.role}. Learner's goal: ${b.scenario.goal}.
Learner level: ${LEVEL[b.level] ?? LEVEL.beginner}.
Rules:
- reply_ko: your next line IN KOREAN ONLY, in character, 1-3 sentences, ending with a question or prompt that keeps the conversation going.
- reply_rom: Revised Romanization of reply_ko.
- reply_tr: translation of reply_ko into ${L}.
- feedback (only when the learner said something): score 0-100 for naturalness & grammar (be encouraging); corrected_ko = the most natural correct Korean version of what the learner meant (same as theirs if already perfect); explanation in ${L} of the main mistake(s) and the grammar point; pronunciation = a short concrete pronunciation tip in ${L} (based on the audio if provided; mention specific sounds like ㅓ/ㅗ, 받침, ㄹ etc.).
- If the learner spoke Uzbek/Russian instead of Korean, gently show in corrected_ko how to say it in Korean.
- suggestions: 2-3 short Korean phrases the learner could say next, with ${L} translation in "tr".
- done: true only when the scenario goal has been clearly achieved.`;

    const parts: ContentPart[] = [
      {
        type: "text",
        text: b.start
          ? `Start the role-play now with a natural opening line for this scenario.${history ? `\nPrevious conversation:\n${history}` : ""}`
          : `Conversation so far:\n${history || "(none)"}\n\nLearner just said (transcribed by speech recognition): "${transcript}"`,
      },
    ];
    if (!b.start && b.audio?.data && b.audio.data.length < 2_500_000) {
      parts.push({ type: "text", text: "Learner's original audio (use it for pronunciation feedback):" });
      parts.push({ type: "audio", data: b.audio.data, mime_type: mime });
    }

    const result = await generateJson<Record<string, unknown>>({
      system,
      input: parts,
      schema: speakSchema,
      thinking: "low",
      timeoutMs: 50000,
    });
    return Response.json({ transcript, ...result });
  } catch (e) {
    return errorResponse(e);
  }
}
