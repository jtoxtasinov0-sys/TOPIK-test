"use client";

import { parseScript } from "./exam";
import { talkChunks, tutorChunks, type Segment, type SpeechChunk, type TalkSpeech, type TtsOpts } from "./speech";

export { splitForSpeech, splitTalk, talkChunks, tutorChunks } from "./speech";
export type { Segment, SpeechChunk, TalkSpeech, TtsOpts } from "./speech";

/**
 * Javob ovozi natijasi: ended — oxirigacha o'qildi; stopped — to'xtatildi (stopAudio: foydalanuvchi bo'ldi,
 * boshqa ovoz boshlandi, chiqildi); failed — ovoz chiqmadi (telefon o'ynatmadi). failed bo'lsa ham navbat
 * o'quvchiga o'tadi — suhbat qotib qolmaydi (javob matni ekranda bor).
 */
export type PlayResult = "ended" | "stopped" | "failed";

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

/**
 * Tayyor ovozni xotira va Cache Storage'ga qo'yadi (qayta tinglash — bepul va darhol).
 * Tezlik: ovoz darhol ishlatiladi — Cache Storage'ga yozish orqada, kutilmaydi; suhbat rejimida esa
 * Web Audio uchun shu zahoti ochib (decode) qo'yiladi — o'ynash navbati kelganda kutmaydi.
 */
async function storeBlob(key: string, blob: Blob): Promise<string> {
  const url = URL.createObjectURL(blob);
  memory.set(key, url);
  if (callMode && actx) void decodeUrl(actx, url);
  try {
    if ("caches" in window)
      void caches
        .open(CACHE)
        .then((c) => c.put(cacheUrl(key), new Response(blob, { headers: { "Content-Type": "audio/wav" } })))
        .catch(() => {});
  } catch {}
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

/** Xotirada tayyor turgan ovoz (kutmasdan) — bo'lmasa null */
function readyAudio(text: string, opts: TtsOpts): string | null {
  return memory.get(keyOf(text, opts)) ?? null;
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
/** Ovoz holati shu oraliqda tekshiriladi */
const TICK_MS = 250;

/**
 * true — oxirigacha o'ynadi; false — to'xtatildi, xato yoki brauzer o'ynatmadi.
 * a.play() shu zahoti (Promise ichida, await'siz) chaqiriladi: tugma bosilgan paytda chaqirilsa — iPhone ham ruxsat beradi.
 * iPhone ba'zan ovozni «o'ynayapti» deb ko'rsatib, aslida boshlamaydi, o'zi to'xtatib qo'yadi yoki oxirida «ended»
 * yubormaydi. Shuning uchun haqiqiy o'ynash joyi (currentTime) kuzatiladi: to'xtab qolsa — bir marta davom ettiramiz
 * (boshidan emas, to'xtagan joyidan), bo'lmasa false; oxiriga yetib to'xtagan bo'lsa — tugadi. Ekranda «gapiryapti» qotib qolmaydi.
 */
function playElement(url: string, onStart?: () => void, rate = 1): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const a = audioEl();
    let done = false;
    let started = false;
    let retried = false;
    let lastPos = -1;
    let lastMove = performance.now();
    let env: Float32Array | null = envelopes.get(url) ?? null;
    if (!envelopes.has(url)) void envelopeFor(url).then((e) => (env = e));
    const finish = (ended: boolean) => {
      if (done) return;
      done = true;
      clearInterval(tick);
      a.onended = a.onerror = a.onplay = a.onpause = null;
      if (current === ctl) current = null;
      if (levelSource === level) levelSource = null;
      if (ended) unlocked = true; // element ovoz bera oladi — keyingi javoblar ham o'zi o'ynaydi
      resolve(ended);
    };
    const play = () => {
      lastMove = performance.now();
      try {
        a.play().catch(() => (retried ? finish(false) : retry()));
      } catch {
        if (retried) finish(false);
        else retry();
      }
    };
    const retry = () => {
      if (done) return;
      if (retried) return finish(false);
      retried = true;
      play();
    };
    const atEnd = () => Number.isFinite(a.duration) && a.duration > 0 && a.currentTime >= a.duration - 0.15;
    const tick = setInterval(() => {
      if (done) return;
      const pos = a.currentTime;
      if (pos !== lastPos) {
        lastPos = pos;
        lastMove = performance.now();
        return;
      }
      if (performance.now() - lastMove < STALL_MS) return;
      // Oxiriga yetib to'xtagan-u, «ended» kelmagan — tugadi deb hisoblaymiz
      if (atEnd()) return finish(true);
      retry();
    }, TICK_MS);
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
    // Biz to'xtatmagan bo'lsak-u, ovoz to'xtab qolsa (telefon to'xtatdi) — to'xtagan joyidan davom ettiramiz.
    // Oxirida ham «pause» keladi — u emas
    a.onpause = () => {
      if (done || a.ended) return;
      if (atEnd()) return finish(true);
      retry();
    };
    a.src = url;
    // src o'zgarganda tezlik 1 ga qaytadi — har safar qayta o'rnatamiz (ovoz balandligi/ohangi saqlanadi)
    a.defaultPlaybackRate = rate;
    a.playbackRate = rate;
    play();
  });
}

// ---------- Suhbat rejimi: javob ovozi Web Audio orqali ----------
// Mikrofon ochiq paytda (suhbat — xuddi qo'ng'iroqdagidek) iPhone sahifaga <audio> ni tugma bosilmasa o'ynatishni
// ko'pincha taqiqlaydi, lekin Web Audio (AudioContext) ovozini — ruxsat beradi. Shuning uchun suhbat rejimida
// (mic.ts → setCallMode) barcha ovozlar bitta umumiy AudioContext orqali o'ynaydi. Shu kontekst mikrofon
// balandligini o'lchash uchun ham ishlatiladi. Web Audio ishlamasa — odatdagi <audio> ga qaytiladi.

type AudioCtor = typeof AudioContext;
let actx: AudioContext | null = null;
let callMode = false;

/** Umumiy AudioContext (kerak bo'lsa yaratadi). Brauzer qo'llamasa — null */
export function voiceContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (actx && actx.state !== "closed") return actx;
  const C = (window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext) as AudioCtor | undefined;
  if (!C) return null;
  try {
    actx = new C();
  } catch {
    actx = null;
  }
  return actx;
}

/**
 * Foydalanuvchi bosgan paytda (tugma handler'ida) chaqiring: <audio> ham, Web Audio ham ochiladi —
 * keyingi avtomatik ovozlar iPhone'da ham o'ynaydi.
 */
export function primeAudio() {
  unlockAudio();
  const c = voiceContext();
  if (!c) return;
  if (c.state !== "running") void c.resume().catch(() => {});
  // iPhone: bo'sh bufer o'ynatilganda kontekst haqiqatan ochiladi
  try {
    const s = c.createBufferSource();
    s.buffer = c.createBuffer(1, 1, 22050);
    s.connect(c.destination);
    s.start(0);
  } catch {}
}

/** mic.ts chaqiradi: mikrofon ochiq (suhbat rejimi) — ovozlar Web Audio orqali o'ynaydi */
export function setCallMode(on: boolean) {
  callMode = on;
}

/** Suhbatdan chiqqanda: kontekst to'xtatib qo'yiladi (keyingi bosishda primeAudio qayta ochadi) */
export function suspendVoiceAudio() {
  if (actx && actx.state === "running") void actx.suspend().catch(() => {});
}

/** Kontekst ishlayaptimi — to'xtab turgan bo'lsa uyg'otib ko'radi (mikrofon ochiq paytda iPhone ham ruxsat beradi) */
async function ctxRunning(c: AudioContext, ms = 700): Promise<boolean> {
  if (c.state === "running") return true;
  try {
    await Promise.race([c.resume(), new Promise((r) => setTimeout(r, ms))]);
  } catch {}
  return (c.state as string) === "running";
}

const decoded = new Map<string, AudioBuffer>();
const decoding = new Map<string, Promise<AudioBuffer | null>>();

/** Ovozni Web Audio uchun ochadi (bir xil ovoz ikki marta ochilmaydi — oldindan boshlangan bo'lsa, o'shani kutadi) */
function decodeUrl(c: AudioContext, url: string): Promise<AudioBuffer | null> {
  const hit = decoded.get(url);
  if (hit) return Promise.resolve(hit);
  const running = decoding.get(url);
  if (running) return running;
  const job = decodeNow(c, url).finally(() => decoding.delete(url));
  decoding.set(url, job);
  return job;
}

async function decodeNow(c: AudioContext, url: string): Promise<AudioBuffer | null> {
  try {
    const data = await (await fetch(url)).arrayBuffer();
    if (!envelopes.has(url)) envelopes.set(url, wavEnvelope(data)); // decodeAudioData buferni «olib qo'yadi» — oldin hisoblaymiz
    const buf = await new Promise<AudioBuffer>((resolve, reject) => {
      const p = c.decodeAudioData(data, resolve, reject); // eski Safari faqat callback bilan ishlaydi
      if (p && typeof p.then === "function") p.then(resolve, reject);
    });
    decoded.set(url, buf);
    if (decoded.size > 40) decoded.delete(decoded.keys().next().value as string);
    return buf;
  } catch {
    return null;
  }
}

/**
 * AudioBuffer'ni o'ynatadi. ended — oxirigacha; stopped — to'xtatildi; failed — o'rtasida to'xtab qoldi;
 * stall — umuman boshlanmadi (kontekst soati yurmadi) — chaqiruvchi <audio> bilan qayta urinadi.
 */
function playBuffer(c: AudioContext, buf: AudioBuffer, url: string, onStart?: () => void, rate = 1): Promise<"ended" | "stopped" | "failed" | "stall"> {
  return new Promise((resolve) => {
    let src: AudioBufferSourceNode;
    try {
      src = c.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = rate;
      src.connect(c.destination);
    } catch {
      return resolve("stall");
    }
    const env = envelopes.get(url) ?? null;
    const dur = buf.duration / rate;
    let t0 = c.currentTime;
    let lastT = t0;
    let lastMove = performance.now();
    let done = false;
    const finish = (r: "ended" | "stopped" | "failed" | "stall") => {
      if (done) return;
      done = true;
      clearInterval(tick);
      src.onended = null;
      try {
        src.disconnect();
      } catch {}
      if (current === ctl) current = null;
      if (levelSource === level) levelSource = null;
      resolve(r);
    };
    const level = () => {
      const t = Math.max(0, c.currentTime - t0) * rate;
      return env ? env[Math.floor(t * ENV_FPS)] ?? 0 : syntheticLevel();
    };
    const ctl = {
      stop: () => {
        try {
          src.stop();
        } catch {}
        finish("stopped");
      },
    };
    const tick = setInterval(() => {
      const now = c.currentTime;
      if (now !== lastT) {
        lastT = now;
        lastMove = performance.now();
      }
      if (now - t0 >= dur + 0.25) return finish("ended"); // «ended» kelmasa ham
      if (performance.now() - lastMove > STALL_MS) {
        try {
          src.stop();
        } catch {}
        finish(now - t0 > 0.15 ? "failed" : "stall");
      }
    }, TICK_MS);
    current = ctl;
    levelSource = level;
    src.onended = () => finish("ended");
    try {
      t0 = c.currentTime;
      src.start();
    } catch {
      return finish("stall");
    }
    onStart?.();
  });
}

/**
 * Ovozni o'ynatadi: suhbat rejimida — Web Audio orqali (boshlanmasa — <audio> bilan), aks holda — <audio>
 * (await'siz, shu zahoti: tugma bosilgan paytda chaqirilsa iPhone ham o'ynatadi).
 * true — oxirigacha o'ynadi; false — to'xtatildi yoki ovoz chiqmadi.
 */
function playUrl(url: string, onStart?: () => void, rate = 1): Promise<boolean> {
  const c = callMode ? actx : null;
  if (!c) return playElement(url, onStart, rate);
  const token = playToken;
  return (async () => {
    if (await ctxRunning(c)) {
      const buf = await decodeUrl(c, url);
      if (token !== playToken) return false;
      if (buf) {
        const r = await playBuffer(c, buf, url, onStart, rate);
        if (r !== "stall") return r === "ended";
      }
    }
    if (token !== playToken) return false;
    return playElement(url, onStart, rate);
  })();
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
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      clearTimeout(silentTimer);
      if (current === ctl) current = null;
      if (levelSource === syntheticLevel) levelSource = null;
      resolve(spoke && !stopped);
    };
    const ctl = {
      stop: () => {
        stopped = true;
        synth.cancel();
        done();
      },
    };
    current = ctl;
    // Brauzer ovozi umuman boshlanmasa (iPhone bosilmagan paytda bloklaydi) — kutib qolmaymiz
    const silentTimer = setTimeout(() => {
      if (spoke || finished) return;
      stopped = true;
      synth.cancel();
      done();
    }, 5000);
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
 * Birinchi bo'lak xotirada tayyor bo'lsa — await'siz, shu zahoti o'ynaydi: tugma bosilgan paytda chaqirilsa
 * (masalan, birinchi salom) iPhone ovozni bosishning o'zi deb biladi va albatta o'ynatadi.
 * ended — javob oxirigacha o'qildi; stopped — to'xtatildi; failed — ovoz chiqmadi (navbat baribir o'quvchiga).
 */
async function playChunks(chunks: SpeechChunk[], fallback: Segment[], hooks: PlayHooks & { pitch?: number } = {}): Promise<PlayResult> {
  stopAudio();
  const token = playToken;
  const stopped = () => token !== playToken;
  const outcome = (ok: boolean): PlayResult => (ok ? "ended" : stopped() ? "stopped" : "failed");
  const list = chunks.filter((c) => c.text.trim()).map((c) => ({ text: c.text.trim(), opts: c.opts }));
  if (!list.length) return "failed";
  const speakBrowser = async () => outcome(await browserSpeakSegments(fallback, hooks.onStart, hooks.pitch));
  // Gemini ovozi o'chiq (kirilmagan / sinov tugagan / AI ulanmagan) — brauzer ovozi, shu zahoti
  if (serverTtsOff && !readyAudio(list[0].text, list[0].opts)) return speakBrowser();
  const jobs = list.map((c) => fetchServerAudio(c.text, c.opts)); // hammasi parallel so'raladi
  let first = readyAudio(list[0].text, list[0].opts);
  if (!first) {
    hooks.onLoading?.(true);
    first = await jobs[0];
    if (stopped()) return "stopped";
  }
  hooks.onLoading?.(false);
  if (!first) return speakBrowser();
  if (!(await playUrl(first, hooks.onStart, hooks.rate))) return outcome(false);
  for (let k = 1; k < list.length; k++) {
    if (stopped()) return "stopped";
    let url = readyAudio(list[k].text, list[k].opts);
    if (!url) {
      hooks.onLoading?.(true);
      url = await jobs[k];
      hooks.onLoading?.(false);
      if (stopped()) return "stopped";
    }
    if (!url) return "ended"; // keyingi bo'lak tayyorlanmadi — matni ekranda bor, navbat o'quvchiga
    if (!(await playUrl(url, undefined, hooks.rate))) return outcome(false);
  }
  return "ended";
}

/** Ustoz ovozi biroz tezroq o'ynaydi — suhbat jonliroq bo'ladi (ohang o'zgarmaydi) */
export const TUTOR_RATE = 1.1;

/** Ustoz javobini ovoz chiqarib o'qiydi: avval Gemini (bitta tabiiy yigit ovozi), bo'lmasa brauzer ovozi */
export function playTutor(segs: Segment[], opts: PlayHooks = {}) {
  return playChunks(tutorChunks(segs), segs, { rate: TUTOR_RATE, ...opts });
}

/** Erkin suhbat javobi ovozini oldindan tayyorlab qo'yadi (masalan, birinchi salom — bosilishi bilan gapiradi) */
export function prefetchTalk(t: TalkSpeech) {
  for (const c of talkChunks(t)) prefetchAudio(c.text.trim(), c.opts);
}

/** Erkin suhbat: koreys do'st javobini ovoz chiqarib o'qiydi */
export function playTalk(t: TalkSpeech, opts: PlayHooks = {}) {
  const fallback: Segment[] = [...(t.help ?? []), ...(t.reply.trim() ? [{ lang: "ko" as const, text: t.reply.trim() }] : [])];
  return playChunks(talkChunks(t), fallback, { ...opts, pitch: t.voice === "f" ? 1.15 : 0.8 });
}

/** Mikrofon yozuvi uchun brauzer qo'llaydigan audio turi */
export function pickRecorderMime() {
  if (typeof MediaRecorder === "undefined") return "";
  for (const m of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]) if (MediaRecorder.isTypeSupported(m)) return m;
  return "";
}
