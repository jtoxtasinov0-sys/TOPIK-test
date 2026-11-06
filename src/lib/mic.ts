"use client";

import { pickRecorderMime } from "./audio";

// Mikrofon: gapni yozib oladi va gapirib bo'lgach jim tursangiz o'zi to'xtaydi.
// Ovozli ustoz (/speak/ustoz) va erkin suhbat (/speak/free) shu yerdan foydalanadi.

// Ovoz balandligi (RMS) shu chegaradan oshsa — gapiryapti deb hisoblaymiz
const SPEECH_RMS = 0.025;

export type SpeechTiming = {
  /** gapirib bo'lgach shuncha ms jim tursa — tugadi */
  silenceMs?: number;
  /** umuman gapirmasa — shuncha ms dan keyin to'xtaydi */
  noSpeechMs?: number;
  maxMs?: number;
};

/**
 * Mikrofon ovozini kuzatadi: balandlikni onLevel'ga beradi va gapirib bo'lgach jim tursa
 * (yoki umuman gapirmasa) onEnd'ni chaqiradi. Qaytgan funksiya kuzatishni to'xtatadi.
 */
export function monitorSpeech(an: AnalyserNode, onLevel: (rms: number) => void, onEnd: (noSpeech: boolean) => void, timing: SpeechTiming = {}) {
  const { silenceMs = 1100, noSpeechMs = 8000, maxMs = 60000 } = timing;
  const wave = new Float32Array(an.fftSize);
  const t0 = performance.now();
  let heard = false;
  let lastLoud = t0;
  let done = false;
  let id = 0;
  const end = (noSpeech: boolean) => {
    done = true;
    onLevel(0);
    onEnd(noSpeech);
  };
  const loop = () => {
    if (done) return;
    an.getFloatTimeDomainData(wave);
    let sum = 0;
    for (let i = 0; i < wave.length; i++) sum += wave[i] * wave[i];
    const rms = Math.sqrt(sum / wave.length);
    onLevel(rms);
    const now = performance.now();
    if (rms > SPEECH_RMS) {
      if (now - t0 > 250) heard = true;
      lastLoud = now;
    }
    if (heard && now - lastLoud > silenceMs) return end(false);
    if (!heard && now - t0 > noSpeechMs) return end(true);
    if (now - t0 > maxMs) return end(false);
    id = requestAnimationFrame(loop);
  };
  id = requestAnimationFrame(loop);
  return () => {
    done = true;
    cancelAnimationFrame(id);
  };
}

/** audio — yozuv tayyor; silent — umuman gapirmadi; short — juda qisqa; cancel — bekor qilindi */
export type RecResult = { kind: "audio"; blob: Blob } | { kind: "silent" } | { kind: "short" } | { kind: "cancel" };

export type Recording = {
  /** hozir to'xtatib, yozilganini qaytarish */
  stop: () => void;
  /** yozuvni yubormasdan bekor qilish */
  cancel: () => void;
  result: Promise<RecResult>;
};

export class MicError extends Error {}

const AUDIO: MediaTrackConstraints = { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 };

const isIos = () =>
  typeof navigator !== "undefined" && (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

/** Ruxsat berilmaganda: qurilmaga mos, doimiy ruxsat berish yo'li bilan */
function deniedText() {
  if (typeof window !== "undefined" && !window.isSecureContext) return "Mikrofon faqat https:// manzilda ishlaydi.";
  if (isIos())
    return "Mikrofonga ruxsat berilmadi. Har safar so‘ramasligi uchun: Safari’da manzil qatoridagi «aA» → «Veb-sayt sozlamalari» (Website Settings) → Mikrofon → «Ruxsat berish» (Allow). Hozircha yozib yuborishingiz mumkin.";
  return "Mikrofonga ruxsat berilmadi. Manzil qatoridagi 🔒 belgisini bosing → Mikrofon → «Ruxsat berish». Hozircha yozib yuborishingiz mumkin.";
}

async function openMic(): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: AUDIO });
  } catch {
    throw new MicError(deniedText());
  }
}

// ---------- Suhbatda mikrofon ----------
// Navbat o'quvchida (yozuv) va AI o'ylayotganda mikrofon ochiq qoladi — qayta-qayta ochilib-yopilmaydi.
// AI gapira boshlaganda sahifa releaseMic() chaqiradi: ustoz/do'st gapirayotganda mikrofon yopiq
// (iPhone mikrofon ochiq paytda boshqa ovozlarni pasaytiradi va «mikrofon yoniq» belgisi chiqadi).
let held: MediaStream | null = null;
let opening: Promise<MediaStream> | null = null;
let idleTimer: ReturnType<typeof setTimeout> | undefined;
/** Shuncha vaqt yozilmasa — mikrofon yopiladi (telefon unutib qoldirilsa ham ochiq turmasin) */
const IDLE_RELEASE_MS = 5 * 60_000;

const usable = (s: MediaStream | null) => !!s && s.getAudioTracks().some((t) => t.readyState === "live" && !t.muted);

/** Ishlatilmay qolsa — IDLE_RELEASE_MS dan keyin yopiladi */
function armIdle(stream: MediaStream) {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (held === stream) releaseMic();
  }, IDLE_RELEASE_MS);
}

/** Ochiq mikrofonni qaytaradi; yo'q bo'lsa — bir marta ruxsat so'rab ochadi */
async function sharedMic(): Promise<MediaStream> {
  clearTimeout(idleTimer);
  if (usable(held)) return held!;
  if (held) releaseMic();
  if (!opening) {
    opening = openMic()
      .then((s) => {
        held = s;
        s.getAudioTracks().forEach((t) =>
          t.addEventListener("ended", () => {
            if (held === s) held = null;
          })
        );
        return s;
      })
      .finally(() => {
        opening = null;
      });
  }
  return opening;
}

/** Suhbatdan chiqqanda: mikrofonni yopadi (telefondagi mikrofon belgisi o'chadi) */
export function releaseMic() {
  clearTimeout(idleTimer);
  const s = held;
  held = null;
  s?.getTracks().forEach((t) => t.stop());
}

/**
 * Mikrofonni ochib, yozishni boshlaydi. Ruxsat berilmasa — MicError (o'zbekcha matn bilan).
 * keep — yozuvdan keyin mikrofon yopilmaydi (suhbat sahifalari; chiqishda releaseMic() chaqiring).
 */
export async function startRecording(opts: SpeechTiming & { onLevel?: (rms: number) => void; keep?: boolean } = {}): Promise<Recording> {
  const keep = !!opts.keep;
  const stream = keep ? await sharedMic() : await openMic();
  /** Yozuv tugagach: oddiy rejimda mikrofon yopiladi, suhbatda — ochiq qoladi */
  const done = () => {
    if (keep) armIdle(stream);
    else stream.getTracks().forEach((t) => t.stop());
  };
  const mime = pickRecorderMime();
  const rig = (() => {
    try {
      // Nutq uchun 32 kbit/s yetarli — fayl kichik bo'ladi va mobil internetda tez yuboriladi
      const mr = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), audioBitsPerSecond: 32000 });
      const ctx = new AudioContext();
      const an = ctx.createAnalyser();
      an.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(an);
      return { mr, ctx, an };
    } catch {
      return null;
    }
  })();
  if (!rig) {
    done();
    throw new MicError("Brauzeringiz ovoz yozishni qo‘llamaydi. Yozib yuboring.");
  }
  const { mr, ctx, an } = rig;
  // Avtomatik (tugma bosilmagan) yoqilganda kontekst to'xtab turgan bo'lishi mumkin
  void ctx.resume?.().catch(() => {});

  const chunks: Blob[] = [];
  let silent = false;
  let cancelled = false;
  let unmonitor = () => {};
  mr.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  const result = new Promise<RecResult>((resolve) => {
    mr.onstop = () => {
      unmonitor();
      opts.onLevel?.(0);
      void ctx.close().catch(() => {});
      done();
      if (cancelled) return resolve({ kind: "cancel" });
      if (silent) return resolve({ kind: "silent" });
      const blob = new Blob(chunks, { type: mr.mimeType || mime || "audio/webm" });
      resolve(blob.size < 2000 ? { kind: "short" } : { kind: "audio", blob });
    };
  });
  const stop = () => {
    if (mr.state === "recording") mr.stop();
  };

  mr.start();
  unmonitor = monitorSpeech(
    an,
    (rms) => opts.onLevel?.(rms),
    (noSpeech) => {
      silent = noSpeech;
      stop();
    },
    opts
  );
  return {
    stop,
    cancel: () => {
      cancelled = true;
      stop();
    },
    result,
  };
}
