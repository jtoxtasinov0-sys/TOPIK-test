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

export type TtsOpts = { slow?: boolean; voice?: "f" | "m" };

async function fetchServerAudio(text: string, opts: TtsOpts): Promise<string | null> {
  if (serverTtsOff) return null;
  const key = hash(`${opts.slow ? "s" : "n"}|${opts.voice ?? ""}|${text}`);
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
        body: JSON.stringify({ text, ...opts }),
      });
      // 503: AI ulanmagan; 401/402: kirilmagan yoki obuna yo'q — brauzer ovozi ishlatiladi
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

export function stopAudio() {
  current?.stop();
  current = null;
}

function pickKoreanVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  const ko = voices.filter((v) => v.lang?.toLowerCase().startsWith("ko"));
  return ko.find((v) => /google|natural|neural|heami|yuna|sora/i.test(v.name)) ?? ko[0];
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
    await new Promise<void>((resolve) => {
      const a = new Audio(url);
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };
      current = {
        stop: () => {
          a.pause();
          finish();
        },
      };
      a.onended = finish;
      a.onerror = finish;
      a.onplay = () => opts.onStart?.();
      a.play().catch(finish);
    });
    return "server";
  }
  await browserSpeak(text, opts, opts.onStart);
  return "browser";
}
