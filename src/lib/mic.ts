"use client";

import { pickRecorderMime, setCallMode, suspendVoiceAudio, voiceContext } from "./audio";

// Mikrofon: gapni yozib oladi va gapirib bo'lgach jim tursangiz o'zi to'xtaydi.
// Ovozli ustoz (/speak/ustoz) va erkin suhbat (/speak/free) shu yerdan foydalanadi.

export type SpeechTiming = {
  /** gapirib bo'lgach shuncha ms jim tursa — tugadi */
  silenceMs?: number;
  /** umuman gapirmasa — shuncha ms dan keyin to'xtaydi */
  noSpeechMs?: number;
  maxMs?: number;
};

// Ovoz balandligi (RMS) chegarasi: shovqin darajasiga qarab moslashadi (jim xonada sezgirroq, shovqinda qattiqroq).
// Mikrofon «xom» ovoz beradi (exo/shovqin bostirish o'chiq) — shuning uchun qat'iy chegara yetmaydi.
const SPEECH_MIN = 0.009;
const SPEECH_MAX = 0.06;

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
  let floor = Infinity; // shovqin darajasi: eng past balandlik (sekin ko'tarilib boradi)
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
    if (rms > 0) floor = rms < floor ? rms : floor + (rms - floor) * 0.002;
    const threshold = Math.min(SPEECH_MAX, Math.max(SPEECH_MIN, floor * 2.5));
    if (rms > threshold) {
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

const isIos = () =>
  typeof navigator !== "undefined" && (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

/**
 * Mikrofon sozlamalari. Exo bostirish (echoCancellation) O'CHIQ: iPhone uni yoqsa «ovozli qo'ng'iroq» ishlovini
 * ulaydi — javob ovozi past, xuddi quloqqa tutiladigan dinamikdan chiqqandek bo'ladi. Bizga exo bostirish kerak emas:
 * javob o'qilayotganda yozuv bo'lmaydi (ovoz faqat sizning navbatingizda yoziladi).
 */
function constraints(): MediaTrackConstraints {
  return isIos()
    ? { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 }
    : { echoCancellation: false, noiseSuppression: true, autoGainControl: true, channelCount: 1 };
}

const isApp = () =>
  typeof window !== "undefined" &&
  ((navigator as unknown as { standalone?: boolean }).standalone === true || !!window.matchMedia?.("(display-mode: standalone)").matches);

/** Mikrofon ochilmadi: xato turiga va qurilmaga mos xabar (oxirida — xato nomi, muammoni aniqlash uchun) */
function micErrorText(e: unknown) {
  const name = e instanceof Error || e instanceof DOMException ? e.name : "";
  const tag = name ? ` (${name})` : "";
  if (typeof window !== "undefined" && !window.isSecureContext) return "Mikrofon faqat https:// manzilda ishlaydi.";
  if (name === "NotFoundError" || name === "OverconstrainedError") return `Mikrofon topilmadi. Yozib yuborishingiz mumkin.${tag}`;
  if (name === "NotReadableError" || name === "AbortError")
    return `Mikrofon band: qo‘ng‘iroq yoki boshqa ilova uni ishlatyapti. Uni yopib, mikrofonni qayta bosing.${tag}`;
  if (isIos() && isApp())
    return `Mikrofonga ruxsat berilmadi. Ilovani butunlay yopib (pastdan yuqoriga surib), qayta oching va so‘ralganda «Ruxsat berish» (Allow) ni bosing. Hozircha yozib yuborishingiz mumkin.${tag}`;
  if (isIos())
    return `Mikrofonga ruxsat berilmadi. Har safar so‘ramasligi uchun: Safari’da manzil qatoridagi «aA» → «Veb-sayt sozlamalari» (Website Settings) → Mikrofon → «Ruxsat berish» (Allow). Hozircha yozib yuborishingiz mumkin.${tag}`;
  return `Mikrofonga ruxsat berilmadi. Manzil qatoridagi 🔒 belgisini bosing → Mikrofon → «Ruxsat berish». Hozircha yozib yuborishingiz mumkin.${tag}`;
}

// ---------- Mikrofon suhbat davomida ochiq ----------
// Mikrofon suhbatda bir marta ochiladi va «To'xtatish», chiqish yoki 3 daqiqa ishlatilmaslikkacha ochiq turadi —
// xuddi qo'ng'iroqdagidek. Sabab (iPhone, ayniqsa bosh ekrandagi ilova): mikrofonni har navbatda yopib-ochish
// telefonning ovoz rejimini qayta-qayta almashtiradi — shundan keyin javob ovozi o'ynamay qolardi, mikrofonni qayta
// ochishga esa ruxsat berilmasdi. Mikrofon ochiq paytda iPhone sahifaga Web Audio ovozini tugma bosilmasa ham
// o'ynatishga ruxsat beradi — javoblar shu yo'l bilan o'ynaydi (audio.ts, setCallMode).
// Ovoz baribir faqat sizning navbatingizda (ekranda «Tinglayapman») yoziladi: MediaRecorder faqat shu paytda ishlaydi.
// navigator.audioSession ataylab o'zgartirilmaydi (avvalgi «playback» ↔ «play-and-record» almashtirish iPhone'da
// ijroni ham, mikrofonni ham buzardi).

/** Ochiq mikrofon: oqim + ovoz balandligini o'lchash (umumiy AudioContext'da) */
type Mic = { stream: MediaStream; ctx: AudioContext; src: MediaStreamAudioSourceNode; an: AnalyserNode; headset: boolean; at: number; users: number; closed?: boolean };

const HEADSET = /airpods|bluetooth|headset|headphone|hands-?free|buds|pods|airdots|beats|bose|sony|jbl|wh-|wf-|наушник|гарнитур/i;
/** Shuncha vaqt yozilmasa — ochiq mikrofon yopiladi (telefon unutib qoldirilsa ham ochiq turmasin) */
const IDLE_RELEASE_MS = 3 * 60_000;
/** Mikrofon endigina ochilgan bo'lsa — telefon (Bluetooth quloqchin) ovoz rejimini almashtirib olishi uchun kutish */
const SETTLE_MS = 300;
const HEADSET_SETTLE_MS = 900;
/** Yozuv boshlanib shuncha vaqt ichida mikrofondan bironta ham ovoz namunasi kelmasa — mikrofon «o'lik» */
const DEAD_MS = 2000;
const HEADSET_DEAD_MS = 3500;

/** Suhbat davomida ochiq turgan mikrofon */
let held: Mic | null = null;
let opening: Promise<Mic> | null = null;
let epoch = 0; // releaseMic() da oshadi — chiqqandan keyin ochilib ulgurgan mikrofon saqlanib qolmasligi uchun
let lastClose = 0;
let asked = false; // shu sahifa ochilgandan beri mikrofon so'ralganmi
let idleTimer: ReturnType<typeof setTimeout> | undefined;

const live = (m: Mic | null) => !!m && !m.closed && m.stream.getAudioTracks().some((t) => t.readyState === "live" && !t.muted);

async function openMic(): Promise<Mic> {
  asked = true;
  const ctx = voiceContext();
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: constraints() });
  } catch (e) {
    throw new MicError(micErrorText(e));
  }
  try {
    if (!ctx) throw new Error("no AudioContext");
    const an = ctx.createAnalyser();
    an.fftSize = 512;
    const src = ctx.createMediaStreamSource(stream);
    src.connect(an);
    // Mikrofon ochiq paytda kontekstni tugma bosilmasa ham ishga tushirish mumkin (iPhone ham ruxsat beradi)
    void ctx.resume?.().catch(() => {});
    const headset = HEADSET.test(stream.getAudioTracks()[0]?.label ?? "");
    watchRoute();
    return { stream, ctx, src, an, headset, at: performance.now(), users: 0 };
  } catch {
    stream.getTracks().forEach((t) => t.stop());
    throw new MicError("Brauzeringiz ovoz yozishni qo‘llamaydi. Yozib yuboring.");
  }
}

/** Mikrofonni yopadi: telefondagi mikrofon belgisi o'chadi */
function closeMic(m: Mic) {
  if (held === m) {
    held = null;
    clearTimeout(idleTimer);
  }
  if (m.closed) return;
  m.closed = true;
  m.stream.getTracks().forEach((t) => t.stop());
  try {
    m.src.disconnect();
  } catch {}
  lastClose = performance.now();
  if (!held) setCallMode(false);
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
        setCallMode(true);
        // Mikrofon o'chib qoldi (masalan, quloqchin uzildi) — qaytadan ochiladi
        m.stream.getAudioTracks().forEach((t) =>
          t.addEventListener("ended", () => {
            if (held === m && m.users === 0) refreshRoute();
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
 * Yozuv mikrofonni «band qiladi». Qaytgan funksiya bo'shatadi: suhbat rejimida (keep) mikrofon ochiq qoladi,
 * aks holda (yoki mikrofon buzuq bo'lsa) — yopiladi. Bir necha marta chaqirilsa ham bir marta ishlaydi.
 */
function lease(m: Mic, keep: boolean) {
  m.users++;
  let done = false;
  return (broken = false) => {
    if (done) return;
    done = true;
    m.users--;
    if (!broken && keep && held === m && live(m)) {
      armIdle(m);
      if (routeDirty) refreshRoute(); // yozuv paytida quloqchin ulandi/uzildi — endi qayta ochamiz
      return;
    }
    if (held === m) {
      held = null;
      clearTimeout(idleTimer);
    }
    if (m.users <= 0) closeMic(m);
  };
}

// ---------- Quloqchin ulanishi / uzilishi ----------
// Mikrofon ochiq paytda quloqchin (AirPods va h.k.) uzilsa, iPhone ovozni baland karnayga emas, quloqqa tutiladigan
// kichik dinamikka o'tkazib qo'yadi. Mikrofon qaytadan ochilsa — telefon ovoz yo'lini yangidan tanlaydi: quloqchin
// bo'lmasa — baland karnay (suhbat boshidagidek), ulangan bo'lsa — quloqchin. Shuning uchun qurilmalar o'zgarganda
// (devicechange) yoki mikrofon o'chib qolganda mikrofon o'zi qayta ochiladi; yozuv paytida bo'lsa — yozuv tugagach.
let routeDirty = false;
let routeTimer: ReturnType<typeof setTimeout> | undefined;
let watching = false;
let refreshes: number[] = [];
let devices = ""; // ovoz kirish qurilmalari ro'yxati (o'zgarganini bilish uchun)

const listDevices = async () => {
  const all = await navigator.mediaDevices.enumerateDevices();
  return all
    .filter((d) => d.kind === "audioinput")
    .map((d) => `${d.deviceId}|${d.label}`)
    .sort()
    .join(";");
};

function watchRoute() {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.addEventListener) return;
  void listDevices().then((d) => (devices = d), () => {});
  if (watching) return;
  watching = true;
  navigator.mediaDevices.addEventListener("devicechange", () => {
    clearTimeout(routeTimer);
    // Bir ulanishda bir necha marta keladi; ruxsat berilganda ham kelishi mumkin — faqat ro'yxat o'zgarsa qayta ochamiz
    routeTimer = setTimeout(() => {
      void listDevices().then(
        (d) => {
          if (d === devices) return;
          devices = d;
          refreshRoute();
        },
        () => refreshRoute()
      );
    }, 350);
  });
}

/** Mikrofonni qayta ochadi — telefon ovozni yangi yo'lga (quloqchin yoki baland karnay) o'tkazadi */
function refreshRoute() {
  const m = held;
  if (!m || m.closed) return;
  if (m.users > 0) {
    routeDirty = true;
    return;
  }
  routeDirty = false;
  // Cheksiz qayta ochilib qolmasin: 10 soniyada ko'pi bilan 3 marta
  const now = performance.now();
  refreshes = refreshes.filter((t) => now - t < 10_000);
  if (refreshes.length >= 3) return closeMic(m);
  refreshes.push(now);
  closeMic(m);
  setCallMode(true); // qayta ochilguncha ham javob Web Audio orqali davom etadi
  void sharedMic().then(
    (n) => {
      if (held === n && n.users === 0) armIdle(n);
    },
    () => setCallMode(false)
  );
}

/**
 * Tugma bosilgan paytda chaqiring: mikrofonga ruxsat shu bosishda (kerak bo'lsa) so'raladi va mikrofon
 * suhbat davomida ochiq qoladi. Hech qachon xato bermaydi: ruxsat berilmasa — mikrofon bosilganda xabar chiqadi.
 */
export async function warmMic(): Promise<void> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return;
  try {
    const m = await sharedMic();
    if (held === m && m.users === 0) armIdle(m);
  } catch {}
}

/** Mikrofon endigina ochilgan bo'lsa — javob ovozidan oldin telefon ovoz rejimini almashtirib olguncha kutadi */
export async function micSettled() {
  if (opening) await opening.catch(() => {});
  const left = settleUntil() - performance.now();
  if (left > 0) await new Promise((r) => setTimeout(r, left));
}

const settleUntil = () => (held ? held.at + (held.headset ? HEADSET_SETTLE_MS : SETTLE_MS) : 0);

/**
 * micSettled() ni kutish kerakmi. Kerak bo'lmasa — javob ovozi await'siz, shu zahoti boshlanadi:
 * tugma bosilgan paytda bo'lsa (birinchi salom) iPhone uni albatta o'ynatadi.
 */
export function micSettleNeeded() {
  return !!opening || settleUntil() > performance.now();
}

// ---------- Ruxsat qayta so'ralmasligi uchun ----------
// Mikrofon suhbat davomida ochiq — ruxsat bir marta so'raladi. U yopilgan bo'lsa (3 daqiqa jimlik, «To'xtatish»):
// iPhone uni tugma bosilmasdan (o'zi) qayta ochganda, 1 daqiqadan ko'p yopiq turgan bo'lsa, ruxsatni qayta so'raydi.
// Shuning uchun bunday paytda mikrofon o'zi yoqilmaydi — «Navbat sizda», bosilganda ochiladi.
// Istisno — eng birinchi ochilish (salomdan keyin): ruxsat baribir bir marta so'raladi, bu o'sha yagona so'rov.
// Android va kompyuterda ruxsat saytga doimiy beriladi — cheklov yo'q.
const AUTO_OPEN_MS = 50_000;

/** Mikrofonni tugma bosilmasdan (o'zi) yoqsa bo'ladimi — ruxsat qayta so'ralmaydimi */
export function micCanAutoOpen() {
  if (live(held) || opening) return true;
  if (!isIos()) return true;
  if (!asked) return true; // hali so'ralmagan: birinchi (yagona) so'rov
  return lastClose > 0 && performance.now() - lastClose < AUTO_OPEN_MS;
}

/** Suhbatdan chiqqanda / «To'xtatish»: mikrofon yopiladi, suhbat ovozi to'xtaydi */
export function releaseMic() {
  epoch++;
  routeDirty = false;
  clearTimeout(routeTimer);
  const m = held;
  if (m) closeMic(m);
  setCallMode(false);
  suspendVoiceAudio();
}

/**
 * Mikrofonni ochib, yozishni boshlaydi. Ruxsat berilmasa — MicError (o'zbekcha matn bilan).
 * keep — suhbat rejimi: mikrofon yozuvdan keyin ochiq qoladi (chiqishda releaseMic() chaqiring);
 * oddiy rejimda yozuv tugashi bilan mikrofon yopiladi.
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
