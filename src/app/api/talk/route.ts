import { AiError, errorResponse, generateJson, hasKey, LANG_NAME, MODELS, normalizeMime, partialField, rateLimit, streamText, type ContentPart } from "@/lib/gemini";
import { talkSchema } from "@/lib/schemas";
import { aiAccess, authEnabled, refundQuota } from "@/lib/server/guard";
import { readSession } from "@/lib/server/session";
import { jsonEvents, ndjson } from "@/lib/server/events";
import type { User } from "@/lib/server/users";
import { splitTalk, talkChunks } from "@/lib/speech";
import { teacherNotes } from "@/lib/knowledge";
import { partnerOf, topicOf, type TalkLevel, type TalkStyle } from "@/data/talk";

export const maxDuration = 60;

// Erkin suhbat: o'quvchi koreys do'st (민준 / 지수) bilan koreyscha gaplashadi.
// Bilmagan so'zini o'zbekcha aytsa yoki tushunmasa — do'st qisqa o'zbekcha tushuntiradi va yana koreyscha davom etadi.
// Tezlik uchun BITTA Gemini so'rovi: model audioni o'zi eshitadi ("heard") va shu zahoti javob yozadi.
// stream: true bo'lsa javob NDJSON oqimi bo'lib keladi — tarjima va maslahatlarni kutmasdan:
//   {"t":"heard"} — o'quvchi gapi (darhol ko'rsatiladi)
//   {"t":"reply"} — do'st javobi; server shu zahoti uning ovozini (TTS) o'zi tayyorlay boshlaydi
//   {"t":"done"}  — to'liq natija (lotincha yozuv, tarjima, tuzatish, maslahatlar) yoki {empty}/{error}
//   {"t":"audio"} — javob bo'lagining tayyor ovozi (base64 WAV): brauzer /api/tts ga alohida so'rov yubormaydi

type Body = {
  stream?: boolean;
  start?: boolean;
  audio?: { data: string; mime: string };
  text?: string;
  partner?: string;
  topic?: string;
  level?: TalkLevel;
  style?: TalkStyle;
  history?: { role: "me" | "ai"; text: string }[];
};

type Raw = {
  heard?: string;
  help?: { lang?: string; text?: string }[];
  teach?: { ko?: string; rom?: string; uz?: string };
  reply?: string;
  reply_rom?: string;
  reply_uz?: string;
  fix?: { ko?: string; uz?: string };
  hints?: { ko?: string; uz?: string }[];
};

const LEVEL: Record<TalkLevel, string> = {
  beginner: "beginner (TOPIK 1): knows basic words and -아요/어요 sentences. Use very short, simple sentences and basic everyday words",
  intermediate: "intermediate (TOPIK 2-3): handles everyday talk. Use natural everyday sentences with common connectors (-고, -아서/어서, -는데, -(으)면)",
  advanced: "advanced (TOPIK 4-6): talks fluently. Speak like with a Korean friend: natural expressions, occasional idioms and light slang",
};

const LENGTH: Record<TalkLevel, string> = {
  beginner: "1-2 very short sentences, at most 12 Korean words in total",
  intermediate: "1-2 sentences, at most 25 Korean words in total",
  advanced: "1-3 sentences, at most 35 Korean words in total",
};

const STYLE: Record<TalkStyle, string> = {
  polite: "polite 해요체 (-아요/어요), friendly — like new friends",
  casual: "반말 (-아/어, -야, -니?) like close friends of the same age; the student may also use 반말",
};

const HANGUL = /[가-힣]/;
const plain = (s: unknown) =>
  String(s ?? "")
    .replace(/[*_#`]/g, "")
    .trim();
const same = (a: string, b: string) => a.replace(/[\s.,!?~…]/g, "") === b.replace(/[\s.,!?~…]/g, "");

/**
 * Uyg'otish: suhbat sahifasi ochilganda brauzer shu yerga so'rov yuboradi — server (va bilim bazasi)
 * birinchi gapgacha tayyor turadi. AI chaqirilmaydi, hech narsa hisoblanmaydi.
 */
export function GET() {
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  try {
    rateLimit(req, "talk", 80, 5 * 60_000);
    const b = (await req.json()) as Body;
    if (b.audio && b.audio.data.length > 8_000_000) return Response.json({ error: "Audio juda uzun" }, { status: 400 });

    const start = !!b.start;
    const typed = start ? "" : (b.text ?? "").trim().slice(0, 600);
    const audio = !start && !typed && b.audio?.data ? { data: b.audio.data, mime: normalizeMime(b.audio.mime) } : null;
    if (!start && !typed && !audio) return Response.json({ transcript: "", empty: true });
    // Kirmagan bo'lsa — bazaga ham, Gemini'ga ham murojaat qilmasdan rad etamiz
    if (authEnabled() && !readSession(req)) await aiAccess(req, "talk");

    const L = LANG_NAME;
    const p = partnerOf(b.partner);
    const topic = topicOf(b.topic);
    const level: TalkLevel = b.level && b.level in LEVEL ? b.level : "beginner";
    const style: TalkStyle = b.style === "casual" ? "casual" : "polite";
    const past = (b.history ?? []).slice(-20);
    const history = past.map((h) => `${h.role === "ai" ? p.name : "Student"}: ${String(h.text).slice(0, 600)}`).join("\n");

    // Bilim bazasi: o'zbeklarga xos xatolar va mos grammatika (yozilgan matn va so'nggi suhbat bo'yicha)
    const recent = [typed, ...past.slice(-3).map((h) => String(h.text).slice(0, 400))].filter(Boolean).join("\n");
    const notes = teacherNotes(recent, { grammar: 1, mistakes: 2, work: 0, maxChars: 900 });

    const system = `You are ${p.about}. You are chatting BY VOICE with an Uzbek student who practises speaking Korean (말하기). Act like a real Korean friend in a relaxed, quick back-and-forth conversation — not like a teacher or an interviewer. Your Korean lines are read aloud by text-to-speech, so write natural spoken Korean.
Topic: ${topic.en}.
Student level: ${LEVEL[level]}.
Speech style: ${STYLE[style]}.

Every turn:
- heard: exactly what the student said, in the original language and script (Korean in Hangul, Uzbek in Latin). If the audio has no clear speech: heard = "", reply = "".
- reply: your next line in KOREAN ONLY — Hangul, no romanization, emojis, brackets or markdown. ${LENGTH[level]}. React to what the student really said (show interest, agree, share a short opinion or experience of your own), then keep the talk going with ONE question. Vary your questions and do not repeat ones from the conversation.
- reply_rom: Revised Romanization of reply. reply_uz: natural ${L} translation of reply.
- hints: 2 short, natural Korean answers the student could give to your reply, at their level, with ${L} meaning.

When the student needs help (important):
- If the student speaks ${L} or Russian — the whole message or some words inside a Korean sentence — or asks how to say something ("... koreyschada qanday?", "... nima degani?"): fill "help". help = what you say in ${L}, split into segments: lang "uz" for ${L}, lang "ko" for every Korean word or phrase (Hangul only, never Hangul inside "uz"). Briefly (at most ~25 words) give the Korean they were missing. Put the full natural Korean sentence they wanted to say in "teach" (ko, rom, uz). Then in "reply" continue the conversation in Korean: answer what they meant and ask the next question (you may invite them to say the taught sentence, e.g. "한번 말해 볼래요?").
- If they did not understand you ("tushunmadim", "nima dedingiz?", "모르겠어요", "다시요"): help = one short ${L} sentence with the meaning of your last line; teach.ko = ""; reply = the same thing again in simpler, shorter Korean.
- Otherwise: help = [] and teach.ko = "".

Corrections without breaking the flow:
- If the student spoke Korean with a clear mistake (particle, grammar, word choice, speech level, unnatural phrase), put the natural correct version of THEIR sentence in fix.ko and one short ${L} explanation in fix.uz (at most 15 words). Do not talk about the mistake in reply. If their Korean was fine or the mistake is tiny: fix.ko = "", fix.uz = "".
- Typical Uzbek-speaker mistakes: 에 vs 에서, 은/는 vs 이/가, missing particles, 당신 for "you", mixing 반말 and 존댓말.

Keep it friendly and appropriate. If the student brings up something inappropriate or dangerous, change the topic naturally. If asked directly, say honestly that you are HanUstoz's AI conversation partner.${notes ? `\n\nKnowledge base notes (HanUstoz, use them for corrections if relevant):\n${notes}` : ""}`;

    const task = start
      ? `Start the conversation now: greet the student in Korean, say your name in a few words and ask your first question about the topic. heard = "", help = [].`
      : audio
        ? `The student's voice message is attached. Write what they said in "heard", then answer them.`
        : `Student typed: "${typed}"\nSet heard to exactly this text and answer them.`;
    const parts: ContentPart[] = [{ type: "text", text: `Conversation so far:\n${history || "(none — this is the beginning)"}\n\n${task}` }];
    if (audio) parts.push({ type: "audio", data: audio.data, mime_type: audio.mime });

    const ask = { system, input: parts, schema: talkSchema, model: MODELS.talk, thinking: "minimal" as const };
    const ctx: Ctx = { start, typed };

    if (b.stream && Date.now() > streamOffUntil) {
      // Kirish tekshiruvi (baza) va Gemini oqimini ochish parallel — javob tezroq boshlanadi
      const opened = streamText(ask).catch((e: unknown) => (e instanceof Error ? e : new Error(String(e))));
      let user: User | null;
      try {
        user = await aiAccess(req, "talk");
      } catch (e) {
        void opened.then((x) => (x instanceof Error ? undefined : x.cancel().catch(() => {})));
        throw e;
      }
      const src = await opened;
      // Javob ovozi ham shu oqimda: brauzer o'ynatadigan bo'laklar bilan aynan bir xil (do'st ovozi, boshlang'ichga — sekinroq)
      if (!(src instanceof Error))
        return ndjson(talkEvents(src, { ...ctx, user, signal: req.signal, tts: hasKey() ? { voice: p.voice, slow: level === "beginner", user } : undefined }));
      if (src instanceof AiError && [429, 503, 504].includes(src.status)) throw src;
      // Oqim + JSON sxemasi ishlamasa — bir muddat oddiy so'rovga o'tamiz
      streamOffUntil = Date.now() + 10 * 60_000;
    } else {
      await aiAccess(req, "talk");
    }

    const out = finish(await generateJson<Raw>({ ...ask, timeoutMs: 45000 }), ctx);
    return "error" in out ? Response.json(out, { status: 502 }) : Response.json(out);
  } catch (e) {
    return errorResponse(e);
  }
}

/** Oqim (JSON + sxema) ishlamay qolsa — shu vaqtgacha oddiy so'rov ishlatiladi */
let streamOffUntil = 0;

type Ctx = {
  start: boolean;
  typed: string;
  tts?: { voice: "m" | "f"; slow: boolean; user: User | null };
  /** oqim uchun: limitni qaytarish (so'rov javobdan oldin bekor qilinsa) */
  user?: User | null;
  signal?: AbortSignal;
};
type Help = { lang: "uz" | "ko"; text: string };

const helpOf = (r: Partial<Raw>): Help[] =>
  (r.help ?? [])
    .map((s) => ({ lang: s.lang === "ko" ? ("ko" as const) : ("uz" as const), text: plain(s.text) }))
    .filter((s) => s.text);

const teachOf = (r: Partial<Raw>, help: Help[]) => {
  const ko = help.length ? plain(r.teach?.ko) : "";
  return ko ? { ko, rom: plain(r.teach?.rom), uz: plain(r.teach?.uz) } : undefined;
};

/** Modelning to'liq javobidan mijozga boradigan natija */
function finish(r: Raw, { start, typed }: Ctx) {
  const transcript = start ? "" : typed || plain(r.heard);
  if (!start && !transcript) return { transcript: "", empty: true as const };

  const help = helpOf(r);
  const reply = plain(r.reply);
  if (!reply && !help.length) return { error: "AI javob bermadi, qayta urinib ko‘ring" };

  // Tuzatish faqat koreyscha gapga va haqiqatan o'zgargan bo'lsa
  const fixKo = plain(r.fix?.ko);
  const fix = fixKo && HANGUL.test(transcript) && !same(fixKo, transcript) ? { ko: fixKo, uz: plain(r.fix?.uz) } : undefined;
  const hints = (r.hints ?? [])
    .map((h) => ({ ko: plain(h.ko), uz: plain(h.uz) }))
    .filter((h) => h.ko)
    .slice(0, 3);

  return { transcript, help, teach: teachOf(r, help), reply, rom: plain(r.reply_rom), uz: plain(r.reply_uz), fix, hints };
}

/**
 * Gemini JSON oqimini suhbat hodisalariga aylantiradi: "heard" va "reply" maydonlari to'liq kelishi bilan
 * darhol yuboriladi, qolgani (tarjima, tuzatish, maslahatlar) — "done" da.
 * Tezlik uchun: javobning birinchi gapi yozilib bo'lishi bilan (javobning qolgani hali yozilayotganda) uning ovozi
 * tayyorlana boshlaydi — bu bo'lak brauzer o'ynatadigan birinchi bo'lak bilan aynan bir xil (splitTalk).
 */
function talkEvents(src: ReadableStream<Uint8Array>, ctx: Ctx): ReadableStream<Uint8Array> {
  const voiceMsg = !ctx.start && !ctx.typed;
  let heard = false;
  // Brauzer so'rovni javob yozilmasdan bekor qilsa (erkin suhbatda oldindan yuborilgan yozuv — o'quvchi yana
  // gapira boshladi) — kunlik limit qaytariladi: Gemini javobni yozib ulgurmagan
  let replied = false;
  let refunded = false;
  const cancelled = () => {
    if (replied || refunded) return;
    refunded = true;
    void refundQuota(ctx.user ?? null, "talk");
  };
  ctx.signal?.addEventListener("abort", cancelled, { once: true });
  let early = ""; // oldindan ovozlanayotgan birinchi gap
  // Oldindan tayyorlangan ovoz brauzer uni kutayotganini bilgachgina («reply» dan keyin) yuboriladi
  let replySent!: () => void;
  const sent = new Promise<void>((r) => (replySent = r));
  return jsonEvents<Raw>(
    src,
    ctx.tts ? { user: ctx.tts.user } : null,
    (f, api, raw) => {
      if (voiceMsg && !heard && "heard" in f) {
        const transcript = plain(f.heard);
        if (!transcript) return "stop"; // nutq eshitilmadi — "done" da {empty}
        api.emit({ t: "heard", transcript });
        heard = true;
      }
      if (voiceMsg && !heard) return;
      const tts = ctx.tts;
      if (!("reply" in f)) {
        // Javob hali yozilmoqda: o'zbekcha yordam yo'q bo'lsa — birinchi gap tayyor bo'lishi bilan ovozlaymiz
        if (tts && !early && "help" in f && !helpOf(f).length) {
          const parts = splitTalk(plain(partialField(raw, "reply") ?? ""));
          if (parts.length > 1) {
            early = parts[0];
            api.voice([{ text: early, opts: { talk: true, voice: tts.voice, slow: tts.slow } }], sent);
          }
        }
        return;
      }
      if (!("help" in f)) return;
      const help = helpOf(f);
      const reply = plain(f.reply);
      if (!reply && !help.length) return;
      // Javob ovozi: brauzer o'ynatadigan bo'laklar bilan aynan bir xil (do'st ovozi, boshlang'ichga — sekinroq)
      const chunks = tts ? talkChunks({ help, reply, voice: tts.voice, slow: tts.slow }) : [];
      api.voice(chunks.filter((c) => c.text !== early || !c.opts.talk));
      api.emit({ t: "reply", transcript: ctx.start ? "" : ctx.typed || plain(f.heard), help, teach: teachOf(f, help), reply, tts: chunks });
      replied = true;
      replySent();
      return "enough";
    },
    (raw, api) => {
      replied = true;
      replySent();
      api.emit({ t: "done", ...finish(raw, ctx) });
    },
    cancelled
  );
}
