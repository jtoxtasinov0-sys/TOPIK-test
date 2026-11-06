"use client";

import { parseScript } from "./exam";

// Koreyscha ovoz: avval Gemini TTS (/api/tts), bo'lmasa brauzer speechSynthesis.
// Natijalar xotirada va Cache Storage'da saqlanadi — qayta tinglash bepul va tez.

const memory = new Map<string, string>();
const pending = new Map<string, Promise<string | null>>();
let serverTtsOff = false;
let current: { stop: () => void } | null = null;
const CACHE = "hq-tts-v1";

export function hash(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16) + s.length.toString(16);
}

/** tutor — ustoz (o'zbekcha + koreyscha) uslubi; talk — erkin suhbatdagi do'stona koreyscha uslub */
export type TtsOpts = { slow?: boolean; voice?: "f" | "m"; tutor?: boolean; talk?: boolean };

async function fetchServerAudio(text: string, opts: TtsOpts): Promise<string | null> {
  if (serverTtsOff) return null;
  const key = hash(`${opts.slow ? "s" : "n"}|${opts.voice ?? ""}|${opts.tutor ? "t" : opts.talk ? "k" : ""}|${text}`);
  if (memory.has(key)) return memory.get(key)!;
  if (pending.has(key)) return pending.get(key)!;

  const job = (async () => {
    const cacheUrl = `/__tts/${key}.wav`;
    try {
      if ("caches" in window) {
        const c = await caches.open(CACHE);
        const hit = await c.match(cacheUrl);
        if (hit) {
          const url = URL.createObjectURL(await hit.blob());
          memory.set(key, url);
          return url;
        }
      }
    } catch {}
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, slow: opts.slow, voice: opts.voice, tutor: opts.tutor, talk: opts.talk }),
      });
      // 503: AI ulanmagan; 401/402: kirilmagan yoki sinov tugagan — brauzer ovozi ishlatiladi
      if (res.status === 503 || res.status === 401 || res.status === 402) {
        serverTtsOff = true;
        return null;
      }
      if (!res.ok) return null;
      const blob = await res.blob();
      try {
        if ("caches" in window) {
          const c = await caches.open(CACHE);
          await c.put(cacheUrl, new Response(blob, { headers: { "Content-Type": "audio/wav" } }));
        }
      } catch {}
      const url = URL.createObjectURL(blob);
      memory.set(key, url);
      return url;
    } catch {
      return null;
    } finally {
      pending.delete(key);
    }
  })();
  pending.set(key, job);
  return job;
}

/** Oldindan yuklab qo'yish (imtihonda keyingi audio kutmasligi uchun) */
export function prefetchAudio(text: string, opts: TtsOpts = {}) {
  void fetchServerAudio(text, opts);
}

// Har bir to'xtatishda oshadi — bo'laklab o'qiyotgan playTutor davom etmasligi uchun
let playToken = 0;

export function stopAudio() {
  playToken++;
  current?.stop();
  current = null;
  levelSource = null;
}

// ---------- Bitta umumiy <audio> elementi ----------
// iPhone (Safari) foydalanuvchi bosmagan paytda yangi Audio() ni o'ynatmaydi. Bitta elementni
// birinchi bosishda "ochib" qo'ysak, keyingi javoblar ham ovoz bilan o'ynaydi.
let shared: HTMLAudioElement | null = null;
let unlocked = false;

function audioEl() {
  if (!shared) {
    shared = new Audio();
    shared.preload = "auto";
    shared.setAttribute("playsinline", "");
  }
  return shared;
}

function silentWavUrl() {
  const n = 800;
  const b = new ArrayBuffer(44 + n);
  const v = new DataView(b);
  const s = (o: number, t: string) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  s(0, "RIFF");
  v.setUint32(4, 36 + n, true);
  s(8, "WAVEfmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true);
  v.setUint32(28, 16000, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  s(36, "data");
  v.setUint32(40, n, true);
  return URL.createObjectURL(new Blob([b], { type: "audio/wav" }));
}

/** Foydalanuvchi bosgan paytda (tugma handler'ida) chaqiring — keyingi avtomatik ovozlar iPhone'da ham ishlaydi */
export function unlockAudio() {
  if (unlocked || typeof window === "undefined") return;
  const a = audioEl();
  if (!a.paused) return;
  a.src = silentWavUrl();
  a.play()
    .then(() => {
      unlocked = true;
    })
    .catch(() => {});
}

// ---------- Ovoz balandligi (animatsiya uchun) ----------
let levelSource: (() => number) | null = null;

/** Hozir o'ynayotgan ovozning balandligi 0..1 (ovozli ustoz shari shunga qarab harakatlanadi) */
export function outputLevel() {
  try {
    return levelSource?.() ?? 0;
  } catch {
    return 0;
  }
}

const envelopes = new Map<string, Float32Array | null>();
const ENV_FPS = 60;

/** WAV (PCM 16-bit) faylidan har 1/60 soniya uchun ovoz balandligini hisoblaydi */
export function wavEnvelope(buf: ArrayBuffer, fps = ENV_FPS): Float32Array | null {
  const v = new DataView(buf);
  if (v.byteLength < 44 || v.getUint32(0, false) !== 0x52494646) return null; // "RIFF"
  let off = 12;
  let rate = 24000;
  let bits = 16;
  let ch = 1;
  while (off + 8 <= v.byteLength) {
    const id = v.getUint32(off, false);
    const size = v.getUint32(off + 4, true);
    if (id === 0x666d7420) {
      // "fmt "
      ch = v.getUint16(off + 10, true) || 1;
      rate = v.getUint32(off + 12, true) || 24000;
      bits = v.getUint16(off + 22, true);
    } else if (id === 0x64617461) {
      // "data"
      if (bits !== 16) return null;
      const start = off + 8;
      const n = Math.floor(Math.min(size, v.byteLength - start) / 2 / ch);
      const win = Math.max(1, Math.floor(rate / fps));
      const out = new Float32Array(Math.ceil(n / win));
      for (let f = 0; f < out.length; f++) {
        let sum = 0;
        const a = f * win;
        const b = Math.min(n, a + win);
        for (let i = a; i < b; i++) {
          const x = v.getInt16(start + i * 2 * ch, true) / 32768;
          sum += x * x;
        }
        out[f] = Math.min(1, Math.sqrt(sum / Math.max(1, b - a)) * 4);
      }
      return out;
    }
    off += 8 + size + (size & 1);
  }
  return null;
}

async function envelopeFor(url: string) {
  if (envelopes.has(url)) return envelopes.get(url) ?? null;
  let env: Float32Array | null = null;
  try {
    env = wavEnvelope(await (await fetch(url)).arrayBuffer());
  } catch {}
  envelopes.set(url, env);
  return env;
}

/** Brauzer ovozi uchun: haqiqiy balandlik yo'q — tabiiy ko'rinadigan "gapirish" to'lqini */
function syntheticLevel() {
  const t = performance.now();
  return 0.3 + 0.25 * Math.abs(Math.sin(t / 110)) * (0.6 + 0.4 * Math.sin(t / 370));
}

function pickKoreanVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  const ko = voices.filter((v) => v.lang?.toLowerCase().startsWith("ko"));
  return ko.find((v) => /google|natural|neural|heami|yuna|sora/i.test(v.name)) ?? ko[0];
}

/** O'zbekcha ovoz kam uchraydi — bo'lmasa turkcha (lotin yozuvini yaqinroq o'qiydi) */
function pickUzbekVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  const by = (p: string) => voices.find((v) => v.lang?.toLowerCase().startsWith(p));
  return by("uz") ?? by("tr");
}

export function hasKoreanBrowserVoice() {
  return !!pickKoreanVoice();
}

function browserSpeak(text: string, opts: TtsOpts, onStart?: () => void): Promise<void> {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    if (!synth) return resolve();
    synth.cancel();
    const lines = parseScript(text);
    const voice = pickKoreanVoice();
    let i = 0;
    let stopped = false;
    current = {
      stop: () => {
        stopped = true;
        synth.cancel();
        resolve();
      },
    };
    const next = () => {
      if (stopped) return;
      if (i >= lines.length) return resolve();
      const l = lines[i++];
      const u = new SpeechSynthesisUtterance(l.text);
      u.lang = "ko-KR";
      if (voice) u.voice = voice;
      u.rate = opts.slow ? 0.72 : 0.92;
      u.pitch = l.speaker === "남자" || opts.voice === "m" ? 0.75 : l.speaker === "여자" ? 1.25 : 1;
      u.onend = () => setTimeout(next, 350);
      u.onerror = () => setTimeout(next, 50);
      if (i === 1) u.onstart = () => onStart?.();
      synth.speak(u);
    };
    next();
  });
}

/**
 * Koreyscha matnni ovoz chiqarib o'qiydi. Tugaganda (yoki to'xtatilganda) resolve bo'ladi.
 */
export async function playKorean(
  text: string,
  opts: TtsOpts & { onLoading?: (b: boolean) => void; onStart?: () => void } = {}
): Promise<"server" | "browser"> {
  stopAudio();
  opts.onLoading?.(true);
  const url = await fetchServerAudio(text, opts);
  opts.onLoading?.(false);
  if (url) {
    await playUrl(url, opts.onStart);
    return "server";
  }
  await browserSpeak(text, opts, opts.onStart);
  return "browser";
}

/** true — oxirigacha o'ynadi; false — to'xtatildi, xato yoki brauzer o'ynatmadi */
function playUrl(url: string, onStart?: () => void, rate = 1): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const a = audioEl();
    let done = false;
    let env: Float32Array | null = envelopes.get(url) ?? null;
    if (!envelopes.has(url)) void envelopeFor(url).then((e) => (env = e));
    const finish = (ended: boolean) => {
      if (done) return;
      done = true;
      a.onended = a.onerror = a.onplay = null;
      if (current === ctl) current = null;
      if (levelSource === level) levelSource = null;
      resolve(ended);
    };
    const level = () => (env ? env[Math.floor(a.currentTime * ENV_FPS)] ?? 0 : a.paused ? 0 : syntheticLevel());
    const ctl = {
      stop: () => {
        a.pause();
        finish(false);
      },
    };
    current = ctl;
    levelSource = level;
    a.onended = () => finish(true);
    a.onerror = () => finish(false);
    a.onplay = () => onStart?.();
    a.src = url;
    // src o'zgarganda tezlik 1 ga qaytadi — har safar qayta o'rnatamiz (ovoz balandligi/ohangi saqlanadi)
    a.defaultPlaybackRate = rate;
    a.playbackRate = rate;
    a.play().catch(() => finish(false));
  });
}

// ---------- Ovozli ustoz: o'zbekcha + koreyscha aralash nutq ----------
export type Segment = { lang: "uz" | "ko"; text: string };

/**
 * Bo'laklarni brauzer ovozi bilan ketma-ket o'qiydi: koreyschasi koreyscha, qolgani o'zbekcha (yoki turkcha) ovoz bilan.
 * true — haqiqatan o'qildi (to'xtatilmadi); false — ovoz chiqmadi yoki to'xtatildi.
 */
function browserSpeakSegments(segs: Segment[], onStart?: () => void, pitch = 0.8): Promise<boolean> {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    if (!synth || !segs.length) return resolve(false);
    synth.cancel();
    const ko = pickKoreanVoice();
    const uz = pickUzbekVoice();
    let i = 0;
    let stopped = false;
    let spoke = false;
    const done = () => {
      levelSource = null;
      resolve(spoke && !stopped);
    };
    current = {
      stop: () => {
        stopped = true;
        synth.cancel();
        done();
      },
    };
    levelSource = syntheticLevel;
    const next = () => {
      if (stopped) return;
      if (i >= segs.length) return done();
      const s = segs[i++];
      const u = new SpeechSynthesisUtterance(s.text);
      u.pitch = pitch; // 0.8 — erkak ovoziga yaqinroq
      if (s.lang === "ko") {
        u.lang = "ko-KR";
        if (ko) u.voice = ko;
        u.rate = 0.8;
      } else {
        u.lang = uz?.lang ?? "uz-UZ";
        if (uz) u.voice = uz;
        u.rate = 0.95;
      }
      u.onend = () => setTimeout(next, 120);
      u.onerror = () => setTimeout(next, 50);
      u.onstart = () => {
        if (!spoke) onStart?.();
        spoke = true;
      };
      synth.speak(u);
    };
    next();
  });
}

/** Ustoz ovozi: Gemini "Puck" (yigit ovozi) */
const TUTOR_TTS: TtsOpts = { tutor: true, voice: "m" };

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

type PlayHooks = { onLoading?: (b: boolean) => void; onStart?: () => void; rate?: number };
export type SpeechChunk = { text: string; opts: TtsOpts };

/**
 * Bo'laklarni ketma-ket o'qiydi: hammasi parallel tayyorlanadi, birinchisi tayyor bo'lishi bilan o'ynaydi.
 * Gemini ovozi bo'lmasa — brauzer ovozi (fallback bo'laklari, tillar bo'yicha).
 * true — javob oxirigacha o'qildi (shundan keyingina navbat o'quvchiga, mikrofon yoqiladi);
 * false — to'xtatildi yoki ovoz chiqmadi (mikrofon o'zi yoqilmaydi).
 */
async function playChunks(chunks: SpeechChunk[], fallback: Segment[], hooks: PlayHooks & { pitch?: number } = {}): Promise<boolean> {
  stopAudio();
  const token = playToken;
  const list = chunks.filter((c) => c.text.trim());
  if (!list.length) return false;
  const jobs = list.map((c) => fetchServerAudio(c.text.trim(), c.opts)); // hammasi parallel so'raladi
  hooks.onLoading?.(true);
  const first = await jobs[0];
  hooks.onLoading?.(false);
  if (token !== playToken) return false;
  if (!first) return browserSpeakSegments(fallback, hooks.onStart, hooks.pitch);
  if (!(await playUrl(first, hooks.onStart, hooks.rate))) return false;
  for (let k = 1; k < jobs.length; k++) {
    if (token !== playToken) return false;
    hooks.onLoading?.(true);
    const url = await jobs[k];
    hooks.onLoading?.(false);
    if (token !== playToken) return false;
    if (!url) return true; // keyingi bo'lak tayyorlanmadi — matni ekranda bor, navbat o'quvchiga
    if (!(await playUrl(url, undefined, hooks.rate))) return false;
  }
  return true;
}

/** Ustoz ovozi biroz tezroq o'ynaydi — suhbat jonliroq bo'ladi (ohang o'zgarmaydi) */
export const TUTOR_RATE = 1.1;

/** Ustoz javobini ovoz chiqarib o'qiydi: avval Gemini (bitta tabiiy yigit ovozi), bo'lmasa brauzer ovozi */
export function playTutor(segs: Segment[], opts: PlayHooks = {}) {
  const text = segs.map((s) => s.text).join(" ").trim();
  return playChunks(
    splitForSpeech(text).map((p) => ({ text: p, opts: TUTOR_TTS })),
    segs,
    { rate: TUTOR_RATE, ...opts }
  );
}

/**
 * Koreyscha javob qisqa (40-60 belgi) bo'lsa ham birinchi gapni ajratamiz: u tezroq tayyorlanib darhol o'ynaydi,
 * qolgani shu vaqtda parallel tayyorlanadi. Juda qisqa bo'laklar (<4 belgi, masalan «네!») ajratilmaydi.
 */
export function splitTalk(text: string): string[] {
  const t = text.trim();
  const m = /^(.{4,}?[.!?…]+["”']?)\s+(\S[\s\S]{5,})$/.exec(t);
  return m ? [m[1].trim(), m[2].trim()] : t ? [t] : [];
}

/** Erkin suhbat uchun o'qiladigan bo'laklar: avval o'zbekcha yordam (ustoz uslubida), keyin koreyscha javob — bitta suhbatdosh ovozi */
export function talkChunks(t: { help?: Segment[]; reply: string; voice: "m" | "f"; slow?: boolean }): SpeechChunk[] {
  const help = (t.help ?? []).map((s) => s.text).join(" ").trim();
  const reply = t.reply.trim();
  return [
    ...(help ? [{ text: help, opts: { tutor: true, voice: t.voice } }] : []),
    ...splitTalk(reply).map((p) => ({ text: p, opts: { talk: true, voice: t.voice, slow: !!t.slow } })),
  ];
}

/** Erkin suhbat javobi ovozini oldindan tayyorlab qo'yadi (masalan, birinchi salom — bosilishi bilan gapiradi) */
export function prefetchTalk(t: { help?: Segment[]; reply: string; voice: "m" | "f"; slow?: boolean }) {
  for (const c of talkChunks(t)) prefetchAudio(c.text.trim(), c.opts);
}

/** Erkin suhbat: koreys do'st javobini ovoz chiqarib o'qiydi */
export function playTalk(t: { help?: Segment[]; reply: string; voice: "m" | "f"; slow?: boolean }, opts: PlayHooks = {}) {
  const fallback: Segment[] = [...(t.help ?? []), ...(t.reply.trim() ? [{ lang: "ko" as const, text: t.reply.trim() }] : [])];
  return playChunks(talkChunks(t), fallback, { ...opts, pitch: t.voice === "f" ? 1.15 : 0.8 });
}

/** Mikrofon yozuvi uchun brauzer qo'llaydigan audio turi */
export function pickRecorderMime() {
  if (typeof MediaRecorder === "undefined") return "";
  for (const m of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]) if (MediaRecorder.isTypeSupported(m)) return m;
  return "";
}
