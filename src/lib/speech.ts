// Ovoz bo'laklari: brauzer (o'ynatish) ham, server (javob bilan birga ovozni oldindan tayyorlash) ham
// shu funksiyalar bilan bir xil bo'laklaydi — server tayyorlagan ovoz brauzer kutgan bo'lakka aynan mos keladi.
// Bu fayl "use client" ham, "server-only" ham emas: ikkala tomonda ishlaydi.

/** tutor — ustoz (o'zbekcha + koreyscha) uslubi; talk — erkin suhbatdagi do'stona koreyscha uslub */
export type TtsOpts = { slow?: boolean; voice?: "f" | "m"; tutor?: boolean; talk?: boolean };
export type Segment = { lang: "uz" | "ko"; text: string };
export type SpeechChunk = { text: string; opts: TtsOpts };

/**
 * Koreyscha javob qisqa (40-60 belgi) bo'lsa ham birinchi gapni ajratamiz: u tezroq tayyorlanib darhol o'ynaydi,
 * qolgani shu vaqtda parallel tayyorlanadi. Juda qisqa bo'laklar (<4 belgi, masalan «네!») ajratilmaydi.
 */
export function splitTalk(text: string): string[] {
  const t = text.trim();
  const m = /^(.{4,}?[.!?…]+["”']?)\s+(\S[\s\S]{5,})$/.exec(t);
  return m ? [m[1].trim(), m[2].trim()] : t ? [t] : [];
}

export type TalkSpeech = { help?: Segment[]; reply: string; voice: "m" | "f"; slow?: boolean; whole?: boolean };

/**
 * Erkin suhbat uchun o'qiladigan bo'laklar: avval o'zbekcha yordam (ustoz uslubida), keyin koreyscha javob — bitta suhbatdosh ovozi.
 * whole — javob bo'linmaydi (birinchi salom: ovozi oldindan tayyor, bitta bo'lak bo'lib uzilishsiz o'ynaydi).
 */
export function talkChunks(t: TalkSpeech): SpeechChunk[] {
  const help = (t.help ?? []).map((s) => s.text).join(" ").trim();
  const reply = t.reply.trim();
  const parts = t.whole ? (reply ? [reply] : []) : splitTalk(reply);
  return [
    ...(help ? [{ text: help, opts: { tutor: true, voice: t.voice } }] : []),
    ...parts.map((p) => ({ text: p, opts: { talk: true, voice: t.voice, slow: !!t.slow } })),
  ];
}

/** Ustoz ovozi: Gemini "Puck" (yigit ovozi) */
export const TUTOR_TTS: TtsOpts = { tutor: true, voice: "m" };

/** Gap oxiri (min..max oralig'ida, keyin kamida 20 belgi qoladigan) — topilmasa 0 */
function sentenceCut(t: string, min: number, max: number) {
  const re = /[.!?…]+["”']?\s+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    const cut = m.index + m[0].length;
    if (cut >= min && t.length - cut >= 20) return cut;
    if (cut > max) break;
  }
  return 0;
}

/**
 * Tezroq boshlash uchun javobni bo'laklarga ajratadi: birinchi (qisqa) gap tez tayyorlanib darhol o'ynaydi,
 * qolganlari shu vaqtda parallel tayyorlanadi. Uzun javob — uch bo'lakka.
 */
export function splitForSpeech(text: string): string[] {
  const t = text.trim();
  if (t.length < 60) return [t];
  const cut = sentenceCut(t, 14, 160);
  if (!cut) return [t];
  const head = t.slice(0, cut).trim();
  const rest = t.slice(cut).trim();
  if (rest.length < 150) return [head, rest];
  const cut2 = sentenceCut(rest, 50, 220);
  return cut2 ? [head, rest.slice(0, cut2).trim(), rest.slice(cut2).trim()] : [head, rest];
}

/** Ovozli ustoz javobi uchun o'qiladigan bo'laklar (yigit ovozi, ustoz uslubi) */
export function tutorChunks(segs: Segment[]): SpeechChunk[] {
  const text = segs.map((s) => s.text).join(" ").trim();
  return text ? splitForSpeech(text).map((p) => ({ text: p, opts: TUTOR_TTS })) : [];
}
