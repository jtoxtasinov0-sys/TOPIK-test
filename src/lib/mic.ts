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

/**
 * audio — yozuv tayyor; silent — umuman gapirmadi; short — juda qisqa; cancel — bekor qilindi;
 * dead — mikrofon ovoz bermadi (qayta ochib ko'rildi, bo'lmadi): telefon mikrofonni boshqa ilovaga bergan va h.k.
 */
export type RecResult = { kind: "audio"; blob: Blob } | { kind: "silent" } | { kind: "short" } | { kind: "dead" } | { kind: "cancel" };

/** «dead» natijasi uchun xabar */
export const MIC_DEAD_TEXT =
  "Mikrofondan ovoz kelmadi. Mikrofonni qayta bosib, gapiring — u qaytadan ochiladi. Qo‘ng‘iroq yoki boshqa ilova mikrofonni band qilmaganini tekshiring.";

export type Recording = {
  /** hozir to'xtatib, yozilganini qaytarish */
  stop: () => void;
  /** yozuvni yubormasdan bekor qilish (mikrofon darhol bo'shaydi) */
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
  // Bosh ekrandagi ilova (manzil qatori yo'q): iPhone ilova qayta ochilganda yana so'raydi
  const app =
    typeof window !== "undefined" &&
    ((navigator as unknown as { standalone?: boolean }).standalone === true || window.matchMedia?.("(display-mode: standalone)").matches);
  if (isIos() && app)
    return "Mikrofonga ruxsat berilmadi. Ilovani butunlay yopib (pastdan yuqoriga surib), qayta oching va so‘ralganda «Ruxsat berish» (Allow) ni bosing. Hozircha yozib yuborishingiz mumkin.";
  if (isIos())
    return "Mikrofonga ruxsat berilmadi. Har safar so‘ramasligi uchun: Safari’da manzil qatoridagi «aA» → «Veb-sayt sozlamalari» (Website Settings) → Mikrofon → «Ruxsat berish» (Allow). Hozircha yozib yuborishingiz mumkin.";
  return "Mikrofonga ruxsat berilmadi. Manzil qatoridagi 🔒 belgisini bosing → Mikrofon → «Ruxsat berish». Hozircha yozib yuborishingiz mumkin.";
}


// ---------- iPhone ovoz rejimi ----------
// navigator.audioSession — Safari 16.4+ (boshqa brauzerlarda hech narsa qilmaydi). Yozuv paytida — «play-and-record»;
// mikrofon yopilgach — «playback» (javob baland karnaydan); suhbatdan chiqqanda — «auto» (oddiy ovoz rejimi).
type SessionType = "auto" | "playback" | "play-and-record";
function setAudioSession(type: SessionType) {
  try {
    const s = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
    if (s && s.type !== type) s.type = type;
  } catch {}
}
/** Mikrofon yopiq paytdagi ovoz rejimi: suhbat davomida — «playback», chiqqach — «auto» */
let idleSession: SessionType = "auto";

// ---------- Mikrofon qachon ochiq turadi ----------
// Telefonning o'z mikrofoni va karnayi (quloqchinsiz): mikrofon ochiq paytda iPhone (va ko'p Android) ovozni
// «qo'ng'iroq» rejimiga o'tkazadi — javob baland karnaydan emas, quloqqa tutiladigan dinamikdan past chiqadi,
// ijrodan keyin esa ochiq qolgan mikrofon ba'zan ovoz bermay qo'yadi (to'lqin yo'q, yozuv bo'sh). Shuning uchun
// quloqchinsiz mikrofon FAQAT yozuv paytida ochiq: yozuv tugashi bilan yopiladi, javob baland karnaydan eshitiladi.
// Quloqchin (Bluetooth / simli) bilan: mikrofon suhbat davomida ochiq turadi — aks holda quloqchin har navbatda
// «musiqa ↔ qo'ng'iroq» rejimiga o'tib (1-2 soniya), shu paytda boshlangan javob ovozi eshitilmay qoladi.
// Ikkala holatda ham ovoz faqat sizning navbatingizda (ekranda «Tinglayapman») yoziladi.

/** Ochiq mikrofon: oqim + ovoz balandligini o'lchash (AudioContext oqim bilan birga ochiladi va yopiladi) */
type Mic = { stream: MediaStream; ctx: AudioContext; an: AnalyserNode; headset: boolean; at: number; users: number; closed?: boolean };

const HEADSET = /airpods|bluetooth|headset|headphone|hands-?free|buds|pods|airdots|beats|bose|sony|jbl|wh-|wf-|наушник|гарнитур/i;
/** Shuncha vaqt yozilmasa — quloqchindagi ochiq mikrofon ham yopiladi (telefon unutib qoldirilsa ham ochiq turmasin) */
const IDLE_RELEASE_MS = 3 * 60_000;
/** Mikrofon yopilgach telefon karnay rejimiga qaytib olishi uchun kutish (aks holda iPhone ovozni jim «o'ynashi» mumkin) */
const QUIET_MS = 450;
/** Mikrofon ochilgach Bluetooth quloqchin «qo'ng'iroq» rejimiga o'tib olishi uchun kutish */
const HEADSET_SETTLE_MS = 900;
/** Yozuv boshlanib shuncha vaqt ichida mikrofondan bironta ham ovoz namunasi kelmasa — mikrofon «o'lik» */
const DEAD_MS = 2000;
const HEADSET_DEAD_MS = 3500;

/** Suhbat davomida ochiq turgan mikrofon (faqat quloqchin bilan; quloqchinsiz — faqat yozuv paytida) */
let held: Mic | null = null;
let opening: Promise<Mic> | null = null;
let epoch = 0; // releaseMic() da oshadi — chiqqandan keyin ochilib ulgurgan mikrofon saqlanib qolmasligi uchun
let lastClose = 0;
let asked = false; // shu sahifa ochilgandan beri mikrofon so'ralganmi
let idleTimer: ReturnType<typeof setTimeout> | undefined;

const live = (m: Mic | null) => !!m && m.stream.getAudioTracks().some((t) => t.readyState === "live" && !t.muted);

async function openMic(): Promise<Mic> {
  asked = true;
  idleSession = "playback";
  setAudioSession("play-and-record");
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: AUDIO });
  } catch {
    if (!held) setAudioSession(idleSession);
    throw new MicError(deniedText());
  }
  try {
    const ctx = new AudioContext();
    const an = ctx.createAnalyser();
    an.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(an);
    const headset = HEADSET.test(stream.getAudioTracks()[0]?.label ?? "");
    return { stream, ctx, an, headset, at: performance.now(), users: 0 };
  } catch {
    stream.getTracks().forEach((t) => t.stop());
    if (!held) setAudioSession(idleSession);
    throw new MicError("Brauzeringiz ovoz yozishni qo‘llamaydi. Yozib yuboring.");
  }
}

/** Mikrofonni yopadi: telefondagi mikrofon belgisi o'chadi, ovoz yana baland karnaydan chiqadi */
function closeMic(m: Mic) {
  if (held === m) {
    held = null;
    clearTimeout(idleTimer);
  }
  if (m.closed) return;
  m.closed = true;
  m.stream.getTracks().forEach((t) => t.stop());
  void m.ctx.close().catch(() => {});
  lastClose = performance.now();
  if (!held) setAudioSession(idleSession);
}

function armIdle(m: Mic) {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (held === m && m.users === 0) closeMic(m);
  }, IDLE_RELEASE_MS);
}

/** Ochiq mikrofonni qaytaradi; yo'q bo'lsa — ochadi (u ochilguncha boshqa so'rovlar shu ochilishni kutadi) */
async function sharedMic(): Promise<Mic> {
  clearTimeout(idleTimer);
  if (live(held)) return held!;
  if (held) closeMic(held);
  if (!opening) {
    const e = epoch;
    opening = openMic()
      .then((m) => {
        if (e !== epoch) return m; // shu orada suhbatdan chiqildi — saqlamaymiz (ishlatgan joy o'zi yopadi)
        held = m;
        m.stream.getAudioTracks().forEach((t) =>
          t.addEventListener("ended", () => {
            if (held === m && m.users === 0) closeMic(m);
          })
        );
        return m;
      })
      .finally(() => {
        opening = null;
      });
  }
  return opening;
}

/**
 * Yozuv mikrofonni «band qiladi». Qaytgan funksiya bo'shatadi: quloqchin bo'lsa — suhbat uchun ochiq qoladi,
 * aks holda (yoki mikrofon buzuq bo'lsa) — yopiladi. Bir necha marta chaqirilsa ham bir marta ishlaydi.
 */
function lease(m: Mic, keep: boolean) {
  m.users++;
  let done = false;
  return (broken = false) => {
    if (done) return;
    done = true;
    m.users--;
    if (!broken && keep && m.headset && held === m && live(m)) return armIdle(m);
    if (held === m) {
      held = null;
      clearTimeout(idleTimer);
    }
    if (m.users <= 0) closeMic(m);
  };
}

/**
 * Tugma bosilgan paytda chaqiring: mikrofonga ruxsat shu bosishda (kerak bo'lsa) so'raladi.
 * Quloqchin bilan mikrofon suhbat davomida ochiq qoladi; quloqchinsiz — darhol yopiladi (salom ovozi karnaydan).
 * Hech qachon xato bermaydi: ruxsat berilmasa — mikrofon bosilganda xabar chiqadi.
 */
export async function warmMic(): Promise<void> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return;
  try {
    const m = await sharedMic();
    if (m.headset && held === m) armIdle(m);
    else if (m.users === 0) closeMic(m);
  } catch {}
}

/**
 * Javob ovozini o'ynatishdan oldin chaqiring. Quloqchinsiz: mikrofon ochiq qolgan bo'lsa — yopiladi va telefon
 * karnay rejimiga qaytib olguncha kutiladi. Quloqchin bilan: mikrofon endigina ochilgan bo'lsa — quloqchin
 * «qo'ng'iroq» rejimiga o'tib olguncha kutiladi (aks holda javobning boshi yoki hammasi eshitilmay qoladi).
 */
export async function micSettled() {
  if (opening) await opening.catch(() => {});
  if (held && !held.headset && held.users === 0) closeMic(held);
  const until = held?.headset ? held.at + HEADSET_SETTLE_MS : lastClose + QUIET_MS;
  const left = until - performance.now();
  if (left > 0) await new Promise((r) => setTimeout(r, left));
}

/**
 * micSettled() ni kutish kerakmi. Kerak bo'lmasa (mikrofon ochilmagan / ancha oldin yopilgan) — javob ovozi
 * await'siz, shu zahoti boshlanadi: tugma bosilgan paytda bo'lsa (birinchi salom) iPhone uni albatta o'ynatadi.
 */
export function micSettleNeeded() {
  if (opening) return true;
  if (held && !held.headset && held.users === 0) return true;
  const until = held?.headset ? held.at + HEADSET_SETTLE_MS : lastClose + QUIET_MS;
  return until > performance.now();
}

// ---------- Ruxsat qayta so'ralmasligi uchun ----------
// iPhone (WebKit) bergan ruxsatni ilova ochiq turguncha eslab turadi, lekin mikrofon yopilgach:
//  - tugma bosilmasdan (o'zi) qayta ochilsa va mikrofon 1 daqiqadan ko'p yopiq turgan bo'lsa — ruxsatni qayta so'raydi;
//  - tugma bosib ochilsa — 10 daqiqagacha so'ramaydi.
// Shuning uchun mikrofon o'zi faqat ruxsat so'ralmaydigan paytda yoqiladi; aks holda «Navbat sizda — mikrofonni
// bosing» (bosilganda ruxsat qayta so'ralmaydi). Android va kompyuterda ruxsat saytga doimiy beriladi — cheklov yo'q.
// Istisno — eng birinchi ochilish (salomdan keyin): ruxsat baribir bir marta so'raladi, bu o'sha yagona so'rov.
const AUTO_OPEN_MS = 50_000;

/** Mikrofonni tugma bosilmasdan (o'zi) yoqsa bo'ladimi — ruxsat qayta so'ralmaydimi */
export function micCanAutoOpen() {
  if (live(held) || opening) return true;
  if (!isIos()) return true;
  if (!asked) return true; // hali so'ralmagan: birinchi (yagona) so'rov
  return lastClose > 0 && performance.now() - lastClose < AUTO_OPEN_MS;
}

/** Suhbatdan chiqqanda / «To'xtatish»: mikrofon yopiladi va telefon oddiy ovoz rejimiga qaytadi */
export function releaseMic() {
  epoch++;
  idleSession = "auto";
  const m = held;
  if (m) closeMic(m);
  setAudioSession("auto");
}

/**
 * Mikrofonni ochib, yozishni boshlaydi. Ruxsat berilmasa — MicError (o'zbekcha matn bilan).
 * keep — suhbat rejimi: quloqchin bilan mikrofon yozuvdan keyin ochiq qoladi (chiqishda releaseMic() chaqiring);
 * quloqchinsiz va oddiy rejimda yozuv tugashi bilan mikrofon yopiladi.
 * Mikrofon ovoz bermasa (iPhone ba'zan ochiq mikrofonni «o'chirib» qo'yadi) — bir marta o'zi qaytadan ochadi.
 */
export async function startRecording(opts: SpeechTiming & { onLevel?: (rms: number) => void; keep?: boolean } = {}): Promise<Recording> {
  const keep = !!opts.keep;
  const acquire = () => (keep ? sharedMic() : openMic());
  const mime = pickRecorderMime();

  let mic = await acquire();
  let release = lease(mic, keep);
  let mr: MediaRecorder | null = null;
  let chunks: Blob[] = [];
  let t0 = 0;
  let alive = false; // mikrofondan kamida bitta ovoz namunasi keldi — mikrofon ishlayapti
  let silent = false;
  let cancelled = false;
  let stopping = false;
  let retried = false;
  let cleanup = () => {};
  let settle!: (r: RecResult) => void;
  const result = new Promise<RecResult>((r) => (settle = r));

  const stop = () => {
    stopping = true;
    if (mr?.state === "recording") mr.stop();
  };

  /**
   * Mikrofon ovoz bermayapti: bir marta qaytadan ochamiz. Yana bo'lmasa — yozuv davom etadi (ovoz o'lchagich
   * xato qilgan bo'lishi mumkin): oxirida fayl ham bo'sh chiqsa — «dead», aks holda yozuv odatdagidek yuboriladi.
   */
  const broken = async () => {
    if (stopping || !mr || retried) return;
    retried = true;
    const old = mr;
    mr = null;
    cleanup();
    old.ondataavailable = old.onstop = null;
    try {
      if (old.state !== "inactive") old.stop();
    } catch {}
    opts.onLevel?.(0);
    release(true);
    try {
      mic = await acquire();
    } catch {
      return settle(cancelled ? { kind: "cancel" } : { kind: "dead" });
    }
    release = lease(mic, keep);
    if (stopping || !run()) {
      release(!stopping);
      settle(cancelled ? { kind: "cancel" } : { kind: "dead" });
    }
  };

  const run = (): boolean => {
    let rec: MediaRecorder;
    try {
      // Nutq uchun 32 kbit/s yetarli — fayl kichik bo'ladi va mobil internetda tez yuboriladi
      rec = new MediaRecorder(mic.stream, { ...(mime ? { mimeType: mime } : {}), audioBitsPerSecond: 32000 });
    } catch {
      return false;
    }
    mr = rec;
    chunks = [];
    alive = false;
    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    rec.onstop = () => {
      if (mr !== rec) return;
      cleanup();
      opts.onLevel?.(0);
      const blob = new Blob(chunks, { type: rec.mimeType || mime || "audio/webm" });
      // Bir necha soniya yozildi-yu, ovoz ham, fayl ham bo'sh — mikrofon ishlamagan
      const mute = !cancelled && !alive && blob.size < 2000 && performance.now() - t0 > DEAD_MS;
      release(mute);
      if (cancelled) return settle({ kind: "cancel" });
      if (mute) return settle({ kind: "dead" });
      if (silent) return settle({ kind: "silent" });
      settle(blob.size < 2000 ? { kind: "short" } : { kind: "audio", blob });
    };
    // Avtomatik (tugma bosilmagan) yoqilganda kontekst to'xtab turgan bo'lishi mumkin
    void mic.ctx.resume?.().catch(() => {});
    t0 = performance.now();
    rec.start();
    const unmonitor = monitorSpeech(
      mic.an,
      (rms) => {
        if (rms > 0) alive = true;
        opts.onLevel?.(rms);
      },
      // Ovoz o'lchanmagan bo'lsa (kontekst ishlamadi) — «gapirmadi» demaymiz: yozuv yuboriladi, server o'zi eshitadi
      (noSpeech) => {
        silent = noSpeech && alive;
        stop();
      },
      opts
    );
    const track = mic.stream.getAudioTracks()[0];
    const onBad = () => void broken();
    track?.addEventListener("mute", onBad);
    track?.addEventListener("ended", onBad);
    const ctx = mic.ctx;
    const timer = setTimeout(
      () => {
        if (!alive && ctx.state === "running" && document.visibilityState === "visible") void broken();
      },
      mic.headset ? HEADSET_DEAD_MS : DEAD_MS
    );
    cleanup = () => {
      unmonitor();
      clearTimeout(timer);
      track?.removeEventListener("mute", onBad);
      track?.removeEventListener("ended", onBad);
    };
    return true;
  };

  if (!run()) {
    release();
    throw new MicError("Brauzeringiz ovoz yozishni qo‘llamaydi. Yozib yuboring.");
  }
  return {
    stop,
    cancel: () => {
      cancelled = true;
      stop();
      release(); // mikrofon darhol bo'shaydi — javob ovozi kutmasdan karnaydan chiqadi
    },
    result,
  };
}
