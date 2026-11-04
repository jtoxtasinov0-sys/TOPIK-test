import "server-only";

// Gemini Interactions API (REST) — https://aistudio.google.com/docs/interactions-overview
// Kalit faqat serverda turadi (GEMINI_API_KEY), brauzerga hech qachon chiqmaydi.

const BASE = "https://generativelanguage.googleapis.com/v1beta/interactions";

export const MODELS = {
  text: process.env.GEMINI_MODEL || "gemini-3.8-flash",
  transcribe: process.env.GEMINI_TRANSCRIBE_MODEL || "gemini-3.5-transcribe",
  tts: process.env.GEMINI_TTS_MODEL || "gemini-3.8-flash-tts",
};

export class AiError extends Error {
  constructor(message: string, public status = 500, public code?: string) {
    super(message);
  }
}

export function hasKey() {
  return !!process.env.GEMINI_API_KEY;
}

export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image"; data: string; mime_type: string }
  | { type: "audio"; data: string; mime_type: string };

type Step = { type?: string; content?: { type?: string; text?: string; data?: string }[] };
type InteractionResponse = {
  steps?: Step[];
  outputs?: { type?: string; text?: string; data?: string }[];
  error?: { message?: string };
};

async function call(body: Record<string, unknown>, timeoutMs = 90000): Promise<InteractionResponse> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new AiError("GEMINI_API_KEY sozlanmagan", 503);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
        "Api-Revision": "2026-05-20",
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const json = (await res.json().catch(() => ({}))) as InteractionResponse;
    if (!res.ok) {
      throw new AiError(json?.error?.message || `Gemini xatosi (${res.status})`, res.status === 429 ? 429 : 502);
    }
    return json;
  } catch (e) {
    if (e instanceof AiError) throw e;
    if ((e as Error).name === "AbortError") throw new AiError("Gemini javobi kechikdi", 504);
    throw new AiError("Gemini bilan bog'lanib bo'lmadi", 502);
  } finally {
    clearTimeout(timer);
  }
}

function outputContents(r: InteractionResponse) {
  const fromSteps = (r.steps ?? []).filter((s) => !s.type || s.type === "model_output").flatMap((s) => s.content ?? []);
  return fromSteps.length ? fromSteps : r.outputs ?? [];
}

function outputText(r: InteractionResponse) {
  return outputContents(r)
    .filter((c) => c.type === "text" && c.text)
    .map((c) => c.text)
    .join("");
}

function parseJson<T>(text: string): T {
  const clean = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  try {
    return JSON.parse(clean) as T;
  } catch {
    const s = clean.indexOf("{");
    const e = clean.lastIndexOf("}");
    if (s >= 0 && e > s) return JSON.parse(clean.slice(s, e + 1)) as T;
    throw new AiError("AI javobini o'qib bo'lmadi", 502);
  }
}

/** Tuzilgan (JSON) javob */
export async function generateJson<T>(opts: {
  system: string;
  input: string | ContentPart[];
  schema: Record<string, unknown>;
  thinking?: "low" | "medium" | "high";
  timeoutMs?: number;
}): Promise<T> {
  const r = await call(
    {
      model: MODELS.text,
      system_instruction: opts.system,
      input: opts.input,
      response_format: { type: "text", mime_type: "application/json", schema: opts.schema },
      ...(opts.thinking ? { generation_config: { thinking_level: opts.thinking } } : {}),
    },
    opts.timeoutMs
  );
  return parseJson<T>(outputText(r));
}

/** Oddiy matnli javob */
export async function generateText(opts: { system: string; input: string | ContentPart[]; thinking?: "low" | "medium" | "high" }) {
  const r = await call({
    model: MODELS.text,
    system_instruction: opts.system,
    input: opts.input,
    ...(opts.thinking ? { generation_config: { thinking_level: opts.thinking } } : {}),
  });
  return outputText(r);
}

/** Matnni oqim (stream) ko'rinishida qaytaradi — AI Ustoz chati uchun */
export async function streamText(opts: { system: string; input: string }): Promise<ReadableStream<Uint8Array>> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new AiError("GEMINI_API_KEY sozlanmagan", 503);
  const res = await fetch(BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": key,
      "Api-Revision": "2026-05-20",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      model: MODELS.text,
      system_instruction: opts.system,
      input: opts.input,
      stream: true,
      generation_config: { thinking_level: "low" },
    }),
  });
  if (!res.ok || !res.body) {
    const j = (await res.json().catch(() => ({}))) as InteractionResponse;
    throw new AiError(j?.error?.message || `Gemini xatosi (${res.status})`, res.status === 429 ? 429 : 502);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  const enc = new TextEncoder();
  let buf = "";
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      buf += dec.decode(value, { stream: true });
      const events = buf.split(/\r?\n\r?\n/);
      buf = events.pop() ?? "";
      for (const ev of events) {
        const data = ev
          .split(/\r?\n/)
          .filter((l) => l.startsWith("data:"))
          .map((l) => l.slice(5).trim())
          .join("");
        if (!data || data === "[DONE]") continue;
        try {
          const j = JSON.parse(data) as { event_type?: string; delta?: { type?: string; text?: string } };
          if (j.event_type === "step.delta" && j.delta?.type === "text" && j.delta.text) {
            controller.enqueue(enc.encode(j.delta.text));
          }
        } catch {}
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });
}

/** Brauzer MediaRecorder turini Gemini qabul qiladigan audio turiga keltiradi */
export function normalizeMime(m: string) {
  const base = m.split(";")[0].trim().toLowerCase();
  if (base === "audio/mp4" || base === "audio/x-m4a") return "audio/m4a";
  if (base === "audio/mpeg3") return "audio/mp3";
  return base || "audio/webm";
}

/** Gemini 3.5 Transcribe — nutqni matnga aylantirish */
export async function transcribe(audioBase64: string, mime: string, languages: string[] = ["ko-KR"]): Promise<string> {
  const body = (langs: string[] | null) => ({
    model: MODELS.transcribe,
    input: [{ type: "audio", data: audioBase64, mime_type: mime }],
    generation_config: {
      transcription_config: {
        ...(langs ? { language_codes: langs } : {}),
        mode: { type: "smart" },
      },
    },
  });
  try {
    return outputText(await call(body(languages), 60000)).trim();
  } catch (e) {
    // Til kodlari yoki rejim qo'llab-quvvatlanmasa — avtomatik aniqlash bilan qayta urinamiz
    if (e instanceof AiError && e.status === 503) throw e;
    return outputText(await call({ model: MODELS.transcribe, input: [{ type: "audio", data: audioBase64, mime_type: mime }] }, 60000)).trim();
  }
}

const VOICES = { 남자: "Charon", 여자: "Kore", narrator: "Kore", m: "Puck", f: "Aoede" };

/** Gemini TTS — WAV (RIFF) bufer qaytaradi */
export async function synthesize(
  turns: { speaker: string | null; text: string }[],
  opts: { slow?: boolean; voice?: "f" | "m"; tutor?: boolean } = {}
): Promise<Buffer> {
  const style = opts.tutor
    ? "A warm, patient Korean teacher talking to an Uzbek student. Speak the Uzbek sentences in natural Uzbek; pronounce every Korean word or phrase clearly and a little slower in standard Seoul Korean, modelling the pronunciation for the student"
    : opts.slow
      ? "Speak slowly and very clearly like a Korean language teacher for beginners, standard Seoul pronunciation"
      : "Natural, clear standard Korean (Seoul) pronunciation, like a TOPIK listening exam recording";
  const speakers = Array.from(new Set(turns.map((t) => t.speaker).filter(Boolean))) as string[];
  const multi = speakers.length >= 2;

  // Ikki so'zlovchi bo'lsa — multi-speaker; aks holda bitta ovoz
  const nameOf = (s: string) => (s === "남자" ? "Minjun" : "Jiyoung");
  const content = multi
    ? turns.map((t) => ({
        type: "text",
        text: t.text,
        annotations: [{ type: "speech_metadata", speaker: nameOf(t.speaker ?? "여자"), style }],
      }))
    : [
        {
          type: "text",
          text: turns.map((t) => t.text).join("\n"),
          annotations: [{ type: "speech_metadata", style }],
        },
      ];

  const single = speakers[0] as "남자" | "여자" | undefined;
  const voice = opts.voice ? VOICES[opts.voice] : single ? VOICES[single] : VOICES.narrator;
  const speech_config = multi
    ? { speakers: speakers.map((s) => ({ speaker: nameOf(s), voice: VOICES[s as "남자" | "여자"] ?? "Kore" })) }
    : [{ voice }];

  const r = await call(
    {
      model: MODELS.tts,
      input: [{ type: "user_input", content }],
      response_format: { type: "audio" },
      generation_config: { speech_config },
    },
    90000
  );
  const audio = outputContents(r).filter((c) => c.type === "audio" && c.data);
  const last = audio[audio.length - 1];
  if (!last?.data) throw new AiError("Ovoz yaratilmadi", 502);
  const buf = Buffer.from(last.data, "base64");
  return buf.subarray(0, 4).toString("ascii") === "RIFF" ? buf : pcmToWav(buf);
}

/** Agar xom PCM kelsa (24 kHz, 16-bit, mono) — WAV sarlavha qo'shamiz */
function pcmToWav(pcm: Buffer, rate = 24000) {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write("WAVE", 8);
  h.write("fmt ", 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

// ---------- Oddiy rate-limit (IP bo'yicha, xotirada) ----------
const hits = new Map<string, number[]>();

export function rateLimit(req: Request, bucket: string, max: number, windowMs: number) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) throw new AiError("Juda ko'p so'rov. Birozdan keyin urinib ko'ring.", 429);
  arr.push(now);
  hits.set(key, arr);
  if (hits.size > 5000) hits.clear();
}

export function errorResponse(e: unknown) {
  // Ma'lumotlar bazasi sozlanmagan / ishlamayapti
  if (e instanceof Error && e.name === "StoreError") {
    return Response.json({ error: e.message, code: "NO_DB" }, { status: 503 });
  }
  const status = e instanceof AiError ? e.status : 500;
  const message = e instanceof Error ? e.message : "Noma'lum xato";
  const code = e instanceof AiError && e.code ? e.code : status === 503 ? "NO_KEY" : undefined;
  return Response.json({ error: message, code }, { status });
}

/** AI tushuntirishlari tili */
export const LANG_NAME = "Uzbek (Latin script)";
