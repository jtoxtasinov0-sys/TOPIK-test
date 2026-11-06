import "server-only";

// Gemini Interactions API (REST) — https://aistudio.google.com/docs/interactions-overview
// Kalit faqat serverda turadi (GEMINI_API_KEY), brauzerga hech qachon chiqmaydi.

const BASE = "https://generativelanguage.googleapis.com/v1beta/interactions";

export const MODELS = {
  text: process.env.GEMINI_MODEL || "gemini-3.8-flash",
  transcribe: process.env.GEMINI_TRANSCRIBE_MODEL || "gemini-3.5-transcribe",
  tts: process.env.GEMINI_TTS_MODEL || "gemini-3.8-flash-tts",
  /** Erkin suhbat (ovozli, tez javob kerak). Bo'sh bo'lsa — asosiy matn modeli */
  talk: process.env.GEMINI_TALK_MODEL || process.env.GEMINI_MODEL || "gemini-3.8-flash",
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

export function parseJson<T>(text: string): T {
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

/**
 * Oqim bilan kelayotgan (hali tugamagan) JSON obyektidan to'liq kelib bo'lgan yuqori darajadagi maydonlarni oladi.
 * Masalan `{"heard":"안녕","reply":"반가` → { heard: "안녕" }. Erkin suhbatda javob tayyor bo'lishi bilan
 * ovozni boshlash uchun (tarjima va maslahatlar keyin keladi).
 */
export function partialJson(text: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const n = text.length;
  let i = text.indexOf("{");
  if (i < 0) return out;
  i++;
  /** i dan boshlangan qiymat oxiri (keyingi belgi indeksi); tugamagan bo'lsa -1 */
  const valueEnd = (from: number): number => {
    const c = text[from];
    if (c === '"') {
      for (let j = from + 1; j < n; j++) {
        if (text[j] === "\\") j++;
        else if (text[j] === '"') return j + 1;
      }
      return -1;
    }
    if (c === "{" || c === "[") {
      let depth = 0;
      let str = false;
      for (let j = from; j < n; j++) {
        const ch = text[j];
        if (str) {
          if (ch === "\\") j++;
          else if (ch === '"') str = false;
        } else if (ch === '"') str = true;
        else if (ch === "{" || ch === "[") depth++;
        else if (ch === "}" || ch === "]") {
          depth--;
          if (depth === 0) return j + 1;
        }
      }
      return -1;
    }
    let j = from;
    while (j < n && !/[,}\]\s]/.test(text[j])) j++;
    return j < n && j > from ? j : -1;
  };
  const skip = () => {
    while (i < n && /[\s,]/.test(text[i])) i++;
  };
  for (;;) {
    skip();
    if (i >= n || text[i] !== '"') break;
    const kEnd = valueEnd(i);
    if (kEnd < 0) break;
    const key = JSON.parse(text.slice(i, kEnd)) as string;
    i = kEnd;
    while (i < n && /\s/.test(text[i])) i++;
    if (text[i] !== ":") break;
    i++;
    while (i < n && /\s/.test(text[i])) i++;
    if (i >= n) break;
    const vEnd = valueEnd(i);
    if (vEnd < 0) break;
    try {
      out[key] = JSON.parse(text.slice(i, vEnd));
    } catch {
      break;
    }
    i = vEnd;
  }
  return out;
}

type Thinking = "minimal" | "low" | "medium" | "high";
// "minimal" (eng tez) darajani model qo'llamasa — bir marta "low" ga o'tamiz va keyin shu bilan davom etamiz
let minimalUnsupported = false;

/** Tuzilgan (JSON) javob */
export async function generateJson<T>(opts: {
  system: string;
  input: string | ContentPart[];
  schema: Record<string, unknown>;
  thinking?: Thinking;
  timeoutMs?: number;
  model?: string;
}): Promise<T> {
  const thinking = opts.thinking === "minimal" && minimalUnsupported ? "low" : opts.thinking;
  const run = (level?: Thinking) =>
    call(
      {
        model: opts.model ?? MODELS.text,
        system_instruction: opts.system,
        input: opts.input,
        response_format: { type: "text", mime_type: "application/json", schema: opts.schema },
        ...(level ? { generation_config: { thinking_level: level } } : {}),
      },
      opts.timeoutMs
    );
  let r: InteractionResponse;
  try {
    r = await run(thinking);
  } catch (e) {
    if (thinking !== "minimal" || !(e instanceof AiError) || [429, 503, 504].includes(e.status)) throw e;
    minimalUnsupported = true;
    r = await run("low");
  }
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

/** Birinchi javob (sarlavhalar) shuncha vaqtda kelmasa — kechikdi */
const STREAM_FIRST_MS = 25_000;
/** Oqim o'rtasida shuncha vaqt hech narsa kelmasa — uzib qo'yamiz (cheksiz «yuklanmoqda» bo'lmasin) */
const STREAM_IDLE_MS = 25_000;

type StreamEvent = { event_type?: string; delta?: { type?: string; text?: string }; error?: { message?: string } };

/** SSE hodisalaridan faqat javob matnini oladi ("o'ylash" va xizmat hodisalari tashlab ketiladi) */
export function sseText(events: string[]): { text: string; error?: string } {
  let text = "";
  for (const ev of events) {
    const data = ev
      .split(/\r?\n/)
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(5).trim())
      .join("");
    if (!data || data === "[DONE]") continue;
    let j: StreamEvent;
    try {
      j = JSON.parse(data) as StreamEvent;
    } catch {
      continue;
    }
    if (j.event_type === "error" || (j.error && !j.delta)) return { text, error: j.error?.message || "Gemini xatosi" };
    if ((j.event_type === "step.delta" || j.event_type === "content.delta") && j.delta?.type === "text" && j.delta.text) text += j.delta.text;
  }
  return { text };
}

/**
 * Matnni oqim (stream) ko'rinishida qaytaradi — AI Ustoz chati uchun.
 * Muhim: pull() har chaqirilganda kamida bitta bo'lak qo'shishi yoki oqimni yopishi shart — aks holda oqim
 * abadiy to'xtab qoladi. Gemini avval "o'ylash" va xizmat hodisalarini yuboradi, shuning uchun matn kelguncha
 * tarmoqdan o'qishda davom etamiz.
 */
export async function streamText(opts: {
  system: string;
  input: string | ContentPart[];
  thinking?: Thinking;
  /** Berilsa — javob shu sxema bo'yicha JSON matni bo'lib oqadi */
  schema?: Record<string, unknown>;
  model?: string;
}): Promise<ReadableStream<Uint8Array>> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new AiError("GEMINI_API_KEY sozlanmagan", 503);
  const ctrl = new AbortController();

  const open = async (level: Thinking) => {
    const timer = setTimeout(() => ctrl.abort(), STREAM_FIRST_MS);
    try {
      return await fetch(BASE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": key,
          "Api-Revision": "2026-05-20",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          model: opts.model ?? MODELS.text,
          system_instruction: opts.system,
          input: opts.input,
          stream: true,
          ...(opts.schema ? { response_format: { type: "text", mime_type: "application/json", schema: opts.schema } } : {}),
          generation_config: { thinking_level: level },
        }),
        signal: ctrl.signal,
      });
    } catch (e) {
      if ((e as Error).name === "AbortError") throw new AiError("Gemini javobi kechikdi", 504);
      throw new AiError("Gemini bilan bog'lanib bo'lmadi", 502);
    } finally {
      clearTimeout(timer);
    }
  };

  // Tezlik uchun — eng kam o'ylash; model qo'llamasa bir marta "low" ga o'tamiz
  const want = opts.thinking ?? "minimal";
  const level: Thinking = want === "minimal" && minimalUnsupported ? "low" : want;
  let res = await open(level);
  if (res.status === 400 && level === "minimal") {
    await res.body?.cancel().catch(() => {});
    minimalUnsupported = true;
    res = await open("low");
  }
  if (!res.ok || !res.body) {
    const j = (await res.json().catch(() => ({}))) as InteractionResponse;
    throw new AiError(j?.error?.message || `Gemini xatosi (${res.status})`, res.status === 429 ? 429 : 502);
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  const enc = new TextEncoder();
  let buf = "";
  let sent = false;

  const readWithTimeout = async () => {
    const timer = setTimeout(() => ctrl.abort(), STREAM_IDLE_MS);
    try {
      return await reader.read();
    } finally {
      clearTimeout(timer);
    }
  };

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        for (;;) {
          const { done, value } = await readWithTimeout();
          if (done) buf += dec.decode();
          else buf += dec.decode(value, { stream: true });
          const events = buf.split(/\r?\n\r?\n/);
          buf = done ? "" : (events.pop() ?? "");
          const { text, error } = sseText(events);
          if (text) {
            controller.enqueue(enc.encode(text));
            sent = true;
          }
          if (error) throw new AiError(error, 502);
          if (done) {
            controller.close();
            return;
          }
          if (text) return; // navbatdagi bo'lakni iste'molchi so'raganda o'qiymiz
        }
      } catch (e) {
        ctrl.abort();
        reader.cancel().catch(() => {});
        // Javobning bir qismi yetib borgan bo'lsa — shu bilan tugatamiz; umuman kelmagan bo'lsa — xato
        if (sent) controller.close();
        else controller.error(e instanceof AiError ? e : new AiError("Gemini javobi kechikdi", 504));
      }
    },
    cancel() {
      ctrl.abort();
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
  opts: { slow?: boolean; voice?: "f" | "m"; tutor?: boolean; talk?: boolean } = {}
): Promise<Buffer> {
  const style = opts.tutor
    ? "A warm, energetic young Korean teacher talking to an Uzbek student at a brisk, natural conversational pace — no long pauses, no dragging. Speak the Uzbek sentences in fluent natural Uzbek; pronounce every Korean word or phrase clearly in standard Seoul Korean"
    : opts.talk
      ? opts.slow
        ? "A friendly young Korean chatting with a foreign friend who is learning Korean: warm, natural conversational intonation, a little slower than normal and very clear, standard Seoul pronunciation"
        : "A friendly young Korean chatting with a friend: natural, lively conversational Korean at a normal speaking pace, standard Seoul pronunciation"
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

// ---------- Rasm yaratish (TOPIK uslubidagi chizmalar) ----------
// Rasm modeli generateContent orqali chaqiriladi. Model nomi GEMINI_IMAGE_MODEL dan olinadi,
// bo'lmasa kalitga ochiq modellar ro'yxatidan avtomatik tanlanadi (eng yangi "flash" rasm modeli).

const API_ROOT = "https://generativelanguage.googleapis.com/v1beta";
const IMAGE_FALLBACK_MODEL = "gemini-2.5-flash-image";
let imageModel: string | null = null;

type ModelInfo = { name?: string; supportedGenerationMethods?: string[] };

/** Ro'yxatdan eng mos rasm modelini tanlash: flash > pro, yangi versiya, preview emas */
export function pickImageModel(models: ModelInfo[]): string | null {
  const names = models
    .filter((m) => m.name && /image/i.test(m.name) && !/imagen/i.test(m.name) && (m.supportedGenerationMethods ?? ["generateContent"]).includes("generateContent"))
    .map((m) => String(m.name).replace(/^models\//, ""));
  if (!names.length) return null;
  const rank = (n: string) => {
    const v = Number(n.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] ?? 0);
    return [/flash/.test(n) ? 1 : 0, v, /preview|exp/.test(n) ? 0 : 1] as const;
  };
  return names.sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    return rb[0] - ra[0] || rb[1] - ra[1] || rb[2] - ra[2];
  })[0];
}

/** Kalitga ochiq rasm modellari (diagnostika uchun ham). Xato bo'lsa — xato matni */
export async function listImageModels(key = process.env.GEMINI_API_KEY ?? ""): Promise<{ models: string[]; best: string | null; error?: string }> {
  try {
    const res = await fetch(`${API_ROOT}/models?pageSize=1000`, { headers: { "x-goog-api-key": key } });
    const j = (await res.json().catch(() => ({}))) as { models?: ModelInfo[]; error?: { message?: string } };
    if (!res.ok) return { models: [], best: null, error: j?.error?.message || `HTTP ${res.status}` };
    const all = j.models ?? [];
    const models = all
      .filter((m) => m.name && /image/i.test(m.name))
      .map((m) => String(m.name).replace(/^models\//, ""));
    return { models, best: pickImageModel(all) };
  } catch (e) {
    return { models: [], best: null, error: (e as Error).message };
  }
}

async function imageModelName(key: string): Promise<string> {
  if (process.env.GEMINI_IMAGE_MODEL) return process.env.GEMINI_IMAGE_MODEL;
  if (imageModel) return imageModel;
  imageModel = (await listImageModels(key)).best || IMAGE_FALLBACK_MODEL;
  return imageModel;
}

/** Hozir ishlatiladigan rasm modeli va u qayerdan olingani */
export async function imageModelStatus(): Promise<{ model: string | null; source: "env" | "auto" | "none"; models: string[]; error?: string }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { model: null, source: "none", models: [] };
  const list = await listImageModels(key);
  if (process.env.GEMINI_IMAGE_MODEL) return { model: process.env.GEMINI_IMAGE_MODEL, source: "env", models: list.models, error: list.error };
  return { model: list.best || IMAGE_FALLBACK_MODEL, source: "auto", models: list.models, error: list.error };
}

/** Faqat testlar uchun: tanlangan modelni unutish */
export function resetImageModel() {
  imageModel = null;
}

type Part = { text?: string; inlineData?: { mimeType?: string; data?: string }; inline_data?: { mime_type?: string; data?: string } };

/** Gemini rasm modeli: matnli tavsifdan (va ixtiyoriy namuna rasmlardan) rasm (PNG/JPEG) yaratadi */
export async function generateImage(
  prompt: string,
  opts: { aspectRatio?: string; timeoutMs?: number; images?: { data: string; mime: string }[] } = {}
): Promise<{ data: Buffer; mime: string }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new AiError("GEMINI_API_KEY sozlanmagan", 503);
  const model = await imageModelName(key);
  const send = async (withConfig: boolean) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 55000);
    try {
      return await fetch(`${API_ROOT}/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }, ...(opts.images ?? []).map((im) => ({ inline_data: { mime_type: im.mime, data: im.data } }))] }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
            ...(withConfig ? { imageConfig: { aspectRatio: opts.aspectRatio ?? "4:3" } } : {}),
          },
        }),
        signal: ctrl.signal,
      });
    } catch (e) {
      if ((e as Error).name === "AbortError") throw new AiError("Rasm yaratish kechikdi", 504);
      throw new AiError("Gemini bilan bog'lanib bo'lmadi", 502);
    } finally {
      clearTimeout(timer);
    }
  };
  let res = await send(true);
  // Eski modellar imageConfig ni qabul qilmasa — sozlamasiz qayta urinamiz
  if (res.status === 400) res = await send(false);
  const j = (await res.json().catch(() => ({}))) as { candidates?: { content?: { parts?: Part[] } }[]; error?: { message?: string } };
  if (!res.ok) {
    if (res.status === 404) imageModel = null; // model o'chirilgan bo'lsa — keyingi safar qayta tanlanadi
    throw new AiError(j?.error?.message || `Gemini rasm xatosi (${res.status})`, res.status === 429 ? 429 : 502);
  }
  for (const part of j.candidates?.[0]?.content?.parts ?? []) {
    const data = part.inlineData?.data ?? part.inline_data?.data;
    if (data) return { data: Buffer.from(data, "base64"), mime: part.inlineData?.mimeType ?? part.inline_data?.mime_type ?? "image/png" };
  }
  throw new AiError("Rasm yaratilmadi", 502);
}
