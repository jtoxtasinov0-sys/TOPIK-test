"use client";

import { parseScript } from "./exam";
import { talkChunks, tutorChunks, type Segment, type SpeechChunk, type TtsOpts } from "./speech";

export { splitForSpeech, splitTalk, talkChunks, tutorChunks } from "./speech";
export type { Segment, SpeechChunk, TtsOpts } from "./speech";

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


const keyOf = (text: string, opts: TtsOpts) => hash(`${opts.slow ? "s" : "n"}|${opts.voice ?? ""}|${opts.tutor ? "t" : opts.talk ? "k" : ""}|${text}`);
const cacheUrl = (key: string) => `/__tts/${key}.wav`;

/** Tayyor ovozni xotira va Cache Storage'ga qo'yadi (qayta tinglash — bepul va darhol) */
async function storeBlob(key: string, blob: Blob): Promise<string> {
  try {
    if ("caches" in window) {
      const c = await caches.open(CACHE);
      await c.put(cacheUrl(key), new Response(blob, { headers: { "Content-Type": "audio/wav" } }));
    }
  } catch {}
  const url = URL.createObjectURL(blob);
  memory.set(key, url);
  return url;
}

/** Ovoz: avval Cache Storage, bo'lmasa — /api/tts */
async function loadAudio(key: string, text: string, opts: TtsOpts): Promise<string | null> {
  try {
    if ("caches" in window) {
      const c = await caches.open(CACHE);
      const hit = await c.match(cacheUrl(key));
      if (hit) {
        const url = URL.createObjectURL(await hit.blob());
        memory.set(key, url);
        return url;
      }
    }
  } catch {}
  if (serverTtsOff) return null;
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
    return await storeBlob(key, await res.blob());
  } catch {
    return null;
  }
}

async function fetchServerAudio(text: string, opts: TtsOpts): Promise<string | null> {
  if (serverTtsOff) return null;
  const key = keyOf(text, opts);
  if (memory.has(key)) return memory.get(key)!;
  if (pending.has(key)) return pending.get(key)!;
  const job = loadAudio(key, text, opts).finally(() => pending.delete(key));
  pending.set(key, job);
  return job;
}

function b64ToBlob(b64: string) {
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new Blob([u8], { type: "audio/wav" });
}

export type AudioWait = { resolve: (b64: string) => void; fail: () => void };

/**
 * Server bu matn ovozini javob bilan birga o'zi yuboradi — shu vaqtgacha kutib turamiz (ikkinchi marta so'ramaymiz).
 * Ovoz kelmasa (fail yoki vaqt tugasa) — odatdagidek /api/tts dan olinadi.
 */
export function expectAudio(text: string, opts: TtsOpts, timeoutMs = 15000): AudioWait {
  const key = keyOf(text, opts);
  if (memory.has(key) || pending.has(key)) return { resolve: () => {}, fail: () => {} };
  let settle!: (u: string | null) => void;
  const p = new Promise<string | null>((r) => (settle = r));
  pending.set(key, p);
  let done = false;
  const finish = (job: () => Promise<string | null>) => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    job()
      .catch(() => null)
      .then((u) => {
        if (pending.get(key) === p) pending.delete(key);
        settle(u);
      });
  };
  const timer = setTimeout(() => finish(() => loadAudio(key, text, opts)), timeoutMs);
  return {
    resolve: (b64) => finish(() => storeBlob(key, b64ToBlob(b64))),
    fail: () => finish(() => loadAudio(key, text, opts)),
  };
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

/**
 * Imtihon audiosi: bir marta, boshidan oxirigacha (haqiqiy imtihondagidek — to'xtatish tugmasi yo'q).
 * "ended" — oxirigacha o'ynadi; "stopped" — stopAudio() chaqirildi (boshqa sahifaga o'tildi);
 * "failed" — brauzer o'ynatmadi (masalan, avtomatik ovozga ruxsat bermadi) — foydalanuvchi bosib qayta boshlaydi.
 */
export async function playExamAudio(text: string, hooks: { onLoading?: (b: boolean) => void; onStart?: () => void } = {}): Promise<"ended" | "stopped" | "failed"> {
  stopAudio();
  const token = playToken;
  hooks.onLoading?.(true);
  const url = await fetchServerAudio(text, {});
  hooks.onLoading?.(false);
  if (token !== playToken) return "stopped";
  if (url) {
    const ok = await playUrl(url, hooks.onStart);
    if (token !== playToken) return "stopped";
    return ok ? "ended" : "failed";
  }
  if (!window.speechSynthesis) return "failed";
  let started = false;
  await browserSpeak(text, {}, () => {
    started = true;
    hooks.onStart?.();
  });
  if (token !== playToken) return "stopped";
  return started ? "ended" : "failed";
}

/** iPhone: brauzer ovozi (speechSynthesis) ham birinchi marta faqat bosish paytida ochiladi — bo'sh gap bilan ochib qo'yamiz */
export function unlockSpeech() {
  try {
    const s = window.speechSynthesis;
    if (s && !s.speaking) s.speak(new SpeechSynthesisUtterance(""));
  } catch {}
}

/** Ovoz shuncha vaqt oldinga siljimasa — «qotib qoldi» deb hisoblanadi */
const STALL_MS = 2500;

/**
 * true — oxirigacha o'ynadi; false — to'xtatildi, xato yoki brauzer o'ynatmadi.
 * iPhone ba'zan ovozni «o'ynayapti» deb ko'rsatib, aslida boshlamaydi yoki o'zi to'xtatib qo'yadi
 * (masalan, mikrofon endigina yopilganda). Shunday bo'lsa — bir marta qayta urinamiz; bo'lmasa false
 * (ekranda «gapiryapti» qotib qolmaydi, mikrofon o'zi yoqilmaydi).
 */
function playUrl(url: string, onStart?: () => void, rate = 1): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const a = audioEl();
    let done = false;
    let started = false;
    let retried = false;
    let stall: ReturnType<typeof setTimeout> | undefined;
    let env: Float32Array | null = envelopes.get(url) ?? null;
    if (!envelopes.has(url)) void envelopeFor(url).then((e) => (env = e));
    const finish = (ended: boolean) => {
      if (done) return;
      done = true;
      clearTimeout(stall);
      a.onended = a.onerror = a.onplay = a.onpause = a.ontimeupdate = null;
      if (current === ctl) current = null;
      if (levelSource === level) levelSource = null;
      resolve(ended);
    };
    const play = () => {
      a.play().catch(() => (retried ? finish(false) : retry()));
      watch();
    };
    const retry = () => {
      if (done) return;
      if (retried) return finish(false);
      retried = true;
      try {
        a.currentTime = 0;
      } catch {}
      play();
    };
    const watch = () => {
      clearTimeout(stall);
      stall = setTimeout(retry, STALL_MS);
    };
    const level = () => (env ? env[Math.floor(a.currentTime * ENV_FPS)] ?? 0 : a.paused ? 0 : syntheticLevel());
    const ctl = {
      stop: () => {
        if (!done) a.pause();
        finish(false);
      },
    };
    current = ctl;
    levelSource = level;
    a.onended = () => finish(true);
    a.onerror = () => finish(false);
    a.onplay = () => {
      if (!started) onStart?.();
      started = true;
    };
    // O'ynayotgan bo'lsa — vaqt oldinga siljiydi; siljimay qolsa watch() qayta urinadi
    a.ontimeupdate = () => {
      if (!a.paused) watch();
    };
    // Biz to'xtatmagan bo'lsak-u, ovoz to'xtab qolsa (telefon to'xtatdi) — qayta urinish. Oxirida ham «pause» keladi — u emas
    a.onpause = () => {
      if (!done && !a.ended) retry();
    };
    a.src = url;
    // src o'zgarganda tezlik 1 ga qaytadi — har safar qayta o'rnatamiz (ovoz balandligi/ohangi saqlanadi)
    a.defaultPlaybackRate = rate;
    a.playbackRate = rate;
    play();
  });
}

// ---------- Ovozli ustoz: o'zbekcha + koreyscha aralash nutq ----------

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

type PlayHooks = { onLoading?: (b: boolean) => void; onStart?: () => void; rate?: number };

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
  return playChunks(tutorChunks(segs), segs, { rate: TUTOR_RATE, ...opts });
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
