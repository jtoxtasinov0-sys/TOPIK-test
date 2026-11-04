"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { blobToBase64, postJson, SpeakBtn, useAiErrorText } from "@/components/ui";
import { pickRecorderMime, playTutor, stopAudio, type Segment } from "@/lib/audio";
import { touchStreak } from "@/lib/store";

// Ovozli ustoz: o'quvchi o'zbekcha so'raydi ("Rahmat koreyschada qanday?"),
// ustoz o'zbekcha tushuntiradi, koreyscha so'zlarni ovoz bilan aytadi va bosqichma-bosqich dars o'tadi.

type Level = "beginner" | "intermediate" | "advanced";
type Practice = { ko: string; rom?: string; uz?: string };
type Msg = { role: "me" | "ai"; text: string; segments?: Segment[]; practice?: Practice };
type VoiceRes = { transcript: string; empty?: boolean; segments: Segment[]; practice?: Practice };

const CHIPS = [
  "“Rahmat” koreyschada qanday bo‘ladi?",
  "Menga koreyscha salomlashishni o‘rgat",
  "1-dars: o‘zimni tanishtirishni o‘rgat",
  "1 dan 10 gacha sanashni o‘rgat",
  "Do‘konda narx so‘rashni o‘rgat",
  "Ishda ishlatiladigan iboralarni o‘rgat",
];

// Ovoz balandligi (RMS) shu chegaradan oshsa — gapiryapti deb hisoblaymiz
const SPEECH_RMS = 0.025;
const SILENCE_MS = 1500;
const NO_SPEECH_MS = 8000;
const MAX_MS = 60000;

/**
 * Mikrofon ovozini kuzatadi: to'lqin ustunlarini chizadi va gapirib bo'lgach ~1.5 soniya jim tursa
 * (yoki umuman gapirmasa) onEnd'ni chaqiradi. Qaytgan funksiya kuzatishni to'xtatadi.
 */
function monitorSpeech(an: AnalyserNode, onBars: (bars: number[]) => void, onEnd: (noSpeech: boolean) => void) {
  const freq = new Uint8Array(an.frequencyBinCount);
  const wave = new Float32Array(an.fftSize);
  const t0 = performance.now();
  let heard = false;
  let lastLoud = t0;
  let done = false;
  let id = 0;
  const end = (noSpeech: boolean) => {
    done = true;
    onEnd(noSpeech);
  };
  const loop = () => {
    if (done) return;
    an.getByteFrequencyData(freq);
    onBars(Array.from({ length: 24 }, (_, i) => 4 + (freq[Math.floor((i * 96) / 24)] / 255) * 36));
    an.getFloatTimeDomainData(wave);
    let sum = 0;
    for (let i = 0; i < wave.length; i++) sum += wave[i] * wave[i];
    const rms = Math.sqrt(sum / wave.length);
    const now = performance.now();
    if (rms > SPEECH_RMS) {
      if (now - t0 > 250) heard = true;
      lastLoud = now;
    }
    if (heard && now - lastLoud > SILENCE_MS) return end(false);
    if (!heard && now - t0 > NO_SPEECH_MS) return end(true);
    if (now - t0 > MAX_MS) return end(false);
    id = requestAnimationFrame(loop);
  };
  id = requestAnimationFrame(loop);
  return () => {
    done = true;
    cancelAnimationFrame(id);
  };
}

export default function VoiceTutorPage() {
  const errText = useAiErrorText();
  const [level, setLevel] = useState<Level>("beginner");
  const [showRom, setShowRom] = useState(true);
  const [handsFree, setHandsFree] = useState(true);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [rec, setRec] = useState(false);
  const [playing, setPlaying] = useState<number | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [err, setErr] = useState("");
  const [text, setText] = useState("");
  const [bars, setBars] = useState<number[]>(Array(24).fill(4));

  // Asinxron callback'lar eskirgan state ko'rmasligi uchun
  const msgsRef = useRef<Msg[]>([]);
  const cfg = useRef({ level, handsFree });
  const alive = useRef(true);
  const busyRef = useRef(false);
  const recState = useRef<"idle" | "starting" | "rec">("idle");
  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const monitor = useRef<(() => void) | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    cfg.current = { level, handsFree };
  }, [level, handsFree]);
  useEffect(() => {
    // Yangi brauzerlarda scrollIntoView Promise qaytaradi — effektdan qaytarilmasligi kerak
    void endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, busy]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      stopAudio();
      monitor.current?.();
      if (mediaRef.current?.state === "recording") mediaRef.current.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const commit = (list: Msg[]) => {
    msgsRef.current = list;
    setMsgs(list);
  };

  const speak = async (i: number, segs: Segment[]) => {
    setPlaying(i);
    await playTutor(segs, { onLoading: setLoadingAudio });
    setLoadingAudio(false);
    setPlaying((p) => (p === i ? null : p));
  };

  const send = async (payload: { audio?: { data: string; mime: string }; text?: string }) => {
    const list = msgsRef.current;
    busyRef.current = true;
    setBusy(true);
    setErr("");
    let reply: { index: number; segments: Segment[] } | null = null;
    try {
      const r = await postJson<VoiceRes>("/api/voice", {
        ...payload,
        level: cfg.current.level,
        history: list.slice(-16).map((m) => ({ role: m.role, text: m.text })),
      });
      if (r.empty) {
        setErr("Ovoz eshitilmadi. Mikrofonga yaqinroq, aniqroq gapiring.");
        return;
      }
      const next: Msg[] = [
        ...list,
        { role: "me", text: r.transcript },
        { role: "ai", text: r.segments.map((s) => s.text).join(" "), segments: r.segments, practice: r.practice },
      ];
      commit(next);
      touchStreak();
      reply = { index: next.length - 1, segments: r.segments };
    } catch (e) {
      setErr(errText(e));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
    if (!reply || !alive.current) return;
    await speak(reply.index, reply.segments);
    // Uzluksiz suhbat: ustoz gapirib bo'lgach, mikrofon o'zi yoqiladi
    if (alive.current && cfg.current.handsFree) void startRec();
  };

  const startRec = async () => {
    if (recState.current !== "idle" || busyRef.current) return;
    recState.current = "starting";
    setErr("");
    stopAudio();
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      recState.current = "idle";
      setErr(
        typeof window !== "undefined" && !window.isSecureContext
          ? "Mikrofon faqat https:// manzilda ishlaydi."
          : "Mikrofonga ruxsat berilmadi. Brauzer sozlamalaridan ruxsat bering yoki matn bilan yozing."
      );
      return;
    }
    if (!alive.current) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    streamRef.current = stream;
    const mime = pickRecorderMime();
    const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const chunks: Blob[] = [];
    let noSpeech = false;
    mr.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };

    const ctx = new AudioContext();
    const an = ctx.createAnalyser();
    an.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(an);

    mr.onstop = async () => {
      monitor.current?.();
      monitor.current = null;
      void ctx.close().catch(() => {});
      stream.getTracks().forEach((t) => t.stop());
      recState.current = "idle";
      mediaRef.current = null;
      if (!alive.current) return;
      setRec(false);
      setBars(Array(24).fill(4));
      if (noSpeech) {
        setErr("Ovoz eshitilmadi — gapirish uchun mikrofonni bosing.");
        return;
      }
      const blob = new Blob(chunks, { type: mr.mimeType || mime || "audio/webm" });
      if (blob.size < 2000) {
        setErr("Juda qisqa yozuv. Mikrofonni bosib, gapiring.");
        return;
      }
      await send({ audio: { data: await blobToBase64(blob), mime: blob.type } });
    };

    mr.start();
    mediaRef.current = mr;
    recState.current = "rec";
    setRec(true);
    monitor.current = monitorSpeech(an, setBars, (silent) => {
      noSpeech = silent;
      if (mr.state === "recording") mr.stop();
    });
  };

  const stopRec = () => {
    if (mediaRef.current?.state === "recording") mediaRef.current.stop();
  };

  const onMic = () => {
    if (rec) return stopRec();
    if (playing !== null) stopAudio(); // ustozni bo'lib, o'zingiz gapirasiz
    void startRec();
  };

  const sendText = async (q: string) => {
    const t = q.trim();
    if (!t || busyRef.current || rec) return;
    setText("");
    await send({ text: t });
  };

  const replay = (i: number) => {
    if (playing === i) {
      stopAudio();
      setPlaying(null);
      return;
    }
    const segs = msgsRef.current[i]?.segments;
    if (segs) void speak(i, segs);
  };

  return (
    <main className="container" style={{ maxWidth: 820, paddingTop: 16 }}>
      <div className="card row" style={{ padding: 14, marginBottom: 16, position: "sticky", top: 74, zIndex: 20 }}>
        <span className="icon-tile" style={{ width: 44, height: 44 }}>🎙️</span>
        <div className="grow">
          <b>Ovozli ustoz</b>
          <div className="tiny muted">O‘zbekcha so‘rang — koreyscha o‘rganing</div>
        </div>
        <Link href="/speak" className="btn btn-sm" onClick={() => stopAudio()}>
          <Icon name="rotate" size={16} /> <span className="hide-mobile">Vaziyatli suhbat</span>
        </Link>
      </div>

      {msgs.length === 0 && (
        <div className="stack" style={{ gap: 16, marginBottom: 16 }}>
          <div className="section-head" style={{ marginBottom: 0 }}>
            <span className="eyebrow">🎙️ 말하기 · O‘zbekcha ↔ 한국어</span>
            <h1 className="h2">
              Ustoz bilan <span className="gradient-text">ovozli dars</span>
            </h1>
            <p className="lead">
              Mikrofonni bosing va o‘zbekcha gapiring: “Rahmat koreyschada qanday?” yoki “Menga dars o‘tib ber”. Ustoz o‘zbekcha tushuntiradi, koreyscha so‘zlarni
              ovoz bilan aytadi va siz takrorlaganingizda talaffuzingizni tekshiradi.
            </p>
          </div>
          <div className="card row-wrap between" style={{ gap: 16 }}>
            <div className="stack" style={{ gap: 8 }}>
              <b className="small">Darajangiz</b>
              <div className="seg">
                {(
                  [
                    ["beginner", "Boshlang‘ich"],
                    ["intermediate", "O‘rta"],
                    ["advanced", "Yuqori"],
                  ] as [Level, string][]
                ).map(([k, t]) => (
                  <button key={k} className={level === k ? "on" : ""} onClick={() => setLevel(k)}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="row-wrap">
              <button className={`chip ${showRom ? "active" : ""}`} onClick={() => setShowRom((v) => !v)}>
                Aa Lotincha o‘qilishi
              </button>
              <button className={`chip ${handsFree ? "active" : ""}`} onClick={() => setHandsFree((v) => !v)}>
                🔁 Uzluksiz suhbat
              </button>
            </div>
          </div>
          <div className="row-wrap" style={{ gap: 8 }}>
            {CHIPS.map((c) => (
              <button key={c} className="chip" style={{ whiteSpace: "normal" }} disabled={busy} onClick={() => sendText(c)}>
                {c}
              </button>
            ))}
          </div>
          <div className="callout info">
            💡 Gapirib bo‘lgach jim tursangiz, yozuv o‘zi to‘xtaydi. “Uzluksiz suhbat” yoqilgan bo‘lsa, ustoz javob bergach mikrofon o‘zi yana yoqiladi — xuddi
            telefonda gaplashgandek.
          </div>
        </div>
      )}

      <div className="chat">
        {msgs.map((m, i) =>
          m.role === "ai" ? (
            <div key={i} className="msg ai">
              <div className="bubble">
                <div className="row" style={{ alignItems: "flex-start" }}>
                  <div className="grow" style={{ lineHeight: 1.65 }}>
                    {m.segments?.map((s, k) =>
                      s.lang === "ko" ? (
                        <b key={k} className="kr" style={{ color: "var(--p1)" }}>
                          {s.text}{" "}
                        </b>
                      ) : (
                        <span key={k}>{s.text} </span>
                      )
                    )}
                  </div>
                  <button className="icon-btn sm" onClick={() => replay(i)} disabled={rec} aria-label="Qayta tinglash">
                    {playing === i && loadingAudio ? (
                      <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                    ) : (
                      <Icon name={playing === i ? "stop" : "volume"} size={17} />
                    )}
                  </button>
                </div>
                {m.practice?.ko && (
                  <div className="feedback">
                    <div className="row" style={{ gap: 8 }}>
                      <span className="ko grow" style={{ fontFamily: "var(--font-kr)", fontSize: "1.2rem", fontWeight: 700 }}>
                        {m.practice.ko}
                      </span>
                      <SpeakBtn text={m.practice.ko} opts={{ slow: true }} />
                    </div>
                    {showRom && m.practice.rom && <div className="small muted" style={{ fontStyle: "italic" }}>{m.practice.rom}</div>}
                    {m.practice.uz && <div className="small" style={{ marginTop: 4 }}>{m.practice.uz}</div>}
                    {i === msgs.length - 1 && <div className="tiny muted" style={{ marginTop: 6 }}>🗣️ Takrorlang — mikrofonni bosing va ayting</div>}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div key={i} className="msg me">
              <div className="bubble">{m.text}</div>
            </div>
          )
        )}
        {busy && (
          <div className="msg ai">
            <div className="bubble row">
              <span className="spinner" /> <span className="small muted">Ustoz tinglamoqda va javob tayyorlamoqda…</span>
            </div>
          </div>
        )}
        {err && <div className="callout">{err}</div>}
        <div ref={endRef} style={{ height: 8 }} />
      </div>

      <div className="composer">
        <div className="card stack" style={{ padding: 14, gap: 12, alignItems: "center" }}>
          {rec && (
            <div className="wave" aria-hidden>
              {bars.map((h, i) => (
                <i key={i} style={{ height: h }} />
              ))}
            </div>
          )}
          <div className="row" style={{ width: "100%", gap: 14 }}>
            <input
              className="input grow"
              placeholder="Yoki yozing: “Kechirasiz” koreyschada qanday?"
              value={text}
              disabled={busy || rec}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendText(text)}
            />
            {text.trim() ? (
              <button className="icon-btn primary" onClick={() => sendText(text)} disabled={busy} aria-label="Yuborish">
                <Icon name="send" size={18} />
              </button>
            ) : (
              <button className={`mic ${rec ? "rec" : ""}`} style={{ width: 64, height: 64 }} onClick={onMic} disabled={busy} aria-label="Mikrofon">
                <Icon name={rec ? "stop" : "mic"} size={26} />
              </button>
            )}
          </div>
          <div className="tiny muted">
            {rec
              ? "● Tinglayapman… gapirib bo‘lgach jim turing yoki tugmani bosing"
              : playing !== null
                ? "🔊 Ustoz gapiryapti — bo‘lib gapirish uchun mikrofonni bosing"
                : "Mikrofonni bosing va o‘zbekcha gapiring"}
          </div>
        </div>
      </div>
    </main>
  );
}
