"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { blobToBase64, postJson, SpeakBtn, useAiErrorText } from "@/components/ui";
import { VoiceOrb, type OrbMode } from "@/components/VoiceOrb";
import { outputLevel, pickRecorderMime, playTutor, stopAudio, unlockAudio, type Segment } from "@/lib/audio";
import { touchStreak } from "@/lib/store";

// Ovozli ustoz: o'quvchi o'zbekcha so'raydi ("Rahmat koreyschada qanday?"),
// ustoz (yigit ovozi) o'zbekcha tushuntiradi, koreyscha so'zlarni ovoz bilan aytadi va bosqichma-bosqich dars o'tadi.

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

const LEVELS: [Level, string][] = [
  ["beginner", "Boshlang‘ich"],
  ["intermediate", "O‘rta"],
  ["advanced", "Yuqori"],
];

// Ovoz balandligi (RMS) shu chegaradan oshsa — gapiryapti deb hisoblaymiz
const SPEECH_RMS = 0.025;
const SILENCE_MS = 1100;
const NO_SPEECH_MS = 8000;
const MAX_MS = 60000;

/**
 * Mikrofon ovozini kuzatadi: balandlikni onLevel'ga beradi va gapirib bo'lgach ~1 soniya jim tursa
 * (yoki umuman gapirmasa) onEnd'ni chaqiradi. Qaytgan funksiya kuzatishni to'xtatadi.
 */
function monitorSpeech(an: AnalyserNode, onLevel: (rms: number) => void, onEnd: (noSpeech: boolean) => void) {
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

function Reply({ segments }: { segments: Segment[] }) {
  return (
    <>
      {segments.map((s, k) =>
        s.lang === "ko" ? (
          <b key={k} className="k">
            {s.text}{" "}
          </b>
        ) : (
          <span key={k}>{s.text} </span>
        )
      )}
    </>
  );
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

  // Asinxron callback'lar eskirgan state ko'rmasligi uchun
  const msgsRef = useRef<Msg[]>([]);
  const cfg = useRef({ level, handsFree });
  const alive = useRef(true);
  const busyRef = useRef(false);
  const recState = useRef<"idle" | "starting" | "rec">("idle");
  const micLevel = useRef(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const monitor = useRef<(() => void) | null>(null);

  useEffect(() => {
    cfg.current = { level, handsFree };
  }, [level, handsFree]);
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

  // Shar uchun ovoz balandligi: yozayotganda — mikrofon, gapirayotganda — ustoz ovozi
  const getLevel = useCallback(() => (recState.current === "rec" ? Math.min(1, micLevel.current * 7) : outputLevel()), []);

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
          : "Mikrofonga ruxsat berilmadi. Brauzer sozlamalaridan ruxsat bering yoki pastda yozing."
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
      micLevel.current = 0;
      mediaRef.current = null;
      if (!alive.current) return;
      setRec(false);
      if (noSpeech) {
        setErr("Ovoz eshitilmadi — gapirish uchun sharni yoki mikrofonni bosing.");
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
    monitor.current = monitorSpeech(
      an,
      (rms) => (micLevel.current = rms),
      (silent) => {
        noSpeech = silent;
        if (mr.state === "recording") mr.stop();
      }
    );
  };

  const onMic = () => {
    unlockAudio();
    if (rec) {
      if (mediaRef.current?.state === "recording") mediaRef.current.stop();
      return;
    }
    if (busy) return;
    stopAudio(); // ustozni bo'lib, o'zingiz gapirasiz
    void startRec();
  };

  const sendText = async (q: string) => {
    const t = q.trim();
    if (!t || busyRef.current || rec) return;
    unlockAudio();
    stopAudio();
    setText("");
    await send({ text: t });
  };

  const replay = (i: number) => {
    unlockAudio();
    if (playing === i) {
      stopAudio();
      setPlaying(null);
      return;
    }
    const segs = msgsRef.current[i]?.segments;
    if (segs) void speak(i, segs);
  };

  // ---------- Holat ----------
  const speaking = playing !== null && !loadingAudio;
  const mode: OrbMode = rec ? "listen" : busy || (playing !== null && loadingAudio) ? "think" : speaking ? "speak" : "idle";
  const lastAiIdx = msgs.findLastIndex((m) => m.role === "ai");
  const lastAi = lastAiIdx >= 0 ? msgs[lastAiIdx] : null;
  const lastMe = lastAiIdx > 0 && msgs[lastAiIdx - 1].role === "me" ? msgs[lastAiIdx - 1] : null;
  const older = lastMe ? msgs.slice(0, lastAiIdx - 1) : msgs.slice(0, Math.max(0, lastAiIdx));

  const status =
    mode === "listen"
      ? "Tinglayapman…"
      : busy
        ? "O‘ylayapman…"
        : mode === "think"
          ? "Javob tayyorlanmoqda…"
          : mode === "speak"
            ? "Ustoz gapiryapti"
            : msgs.length
              ? "Navbat sizda — gapiring"
              : "Sharni bosing va o‘zbekcha gapiring";
  const hint =
    mode === "listen"
      ? "Gapirib bo‘lgach jim turing — o‘zi yuboriladi"
      : mode === "speak"
        ? "Bo‘lib gapirish uchun mikrofonni bosing"
        : handsFree
          ? "🔁 Uzluksiz suhbat: ustozdan keyin mikrofon o‘zi yoqiladi"
          : "Mikrofonni bosing va gapiring";

  return (
    <main className="container page" style={{ maxWidth: 760, paddingTop: 12 }}>
      <section className="vs-stage">
        <div className="vs-top">
          <Link href="/speak" className="vs-icon" aria-label="Orqaga" onClick={() => stopAudio()}>
            <Icon name="left" size={18} />
          </Link>
          <div className="vs-title">
            <b>Ovozli ustoz</b>
            <span>O‘zbekcha so‘rang · koreyscha o‘rganing</span>
          </div>
          <button className={`vs-toggle ${handsFree ? "on" : ""}`} onClick={() => setHandsFree((v) => !v)} aria-pressed={handsFree} title="Uzluksiz suhbat">
            🔁 <span className="hide-mobile">Uzluksiz</span>
          </button>
        </div>

        <div className="vs-seg" role="group" aria-label="Daraja">
          {LEVELS.map(([k, t]) => (
            <button key={k} className={level === k ? "on" : ""} onClick={() => setLevel(k)}>
              {t}
            </button>
          ))}
        </div>

        <VoiceOrb mode={mode} getLevel={getLevel} size={236} onClick={onMic} disabled={busy} label={rec ? "Yozishni to‘xtatish" : "Gapirish"} />

        <div className="vs-status" aria-live="polite">
          {status}
        </div>

        <div className="vs-controls">
          <button className="vs-side" onClick={() => lastAiIdx >= 0 && replay(lastAiIdx)} disabled={lastAiIdx < 0 || rec || busy} aria-label="Qayta tinglash">
            <Icon name={playing === lastAiIdx && lastAiIdx >= 0 ? "stop" : "replay"} size={20} />
          </button>
          <button className={`vs-mic ${rec ? "rec" : ""}`} onClick={onMic} disabled={busy} aria-label={rec ? "To‘xtatish" : "Gapirish"}>
            {busy ? <span className="spinner white" style={{ width: 26, height: 26 }} /> : <Icon name={rec ? "stop" : "mic"} size={30} />}
          </button>
          <button className={`vs-side ${showRom ? "on" : ""}`} onClick={() => setShowRom((v) => !v)} aria-pressed={showRom} title="Lotincha o‘qilishi">
            Aa
          </button>
        </div>
        <div className="vs-hint">{hint}</div>

        {err && <div className="vs-err">{err}</div>}
        {lastMe && (
          <div className="vs-heard">
            <span>Siz:</span> {lastMe.text}
          </div>
        )}
        {lastAi?.segments && (
          <div className="vs-reply vs-fade" key={lastAiIdx}>
            <Reply segments={lastAi.segments} />
          </div>
        )}
        {lastAi?.practice?.ko && (
          <div className="vs-practice vs-fade" key={`p${lastAiIdx}`}>
            <div className="grow">
              <div className="ko">{lastAi.practice.ko}</div>
              {showRom && lastAi.practice.rom && <div className="rom">{lastAi.practice.rom}</div>}
              {lastAi.practice.uz && <div className="uz">{lastAi.practice.uz}</div>}
            </div>
            <SpeakBtn text={lastAi.practice.ko} opts={{ slow: true, voice: "m" }} light />
          </div>
        )}
      </section>

      {msgs.length === 0 && (
        <div className="stack" style={{ gap: 10, marginTop: 18 }}>
          <b className="small muted">Masalan, shunday deb so‘rang:</b>
          <div className="row-wrap" style={{ gap: 8 }}>
            {CHIPS.map((c) => (
              <button key={c} className="chip" style={{ whiteSpace: "normal", textAlign: "left" }} disabled={busy || rec} onClick={() => sendText(c)}>
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card row" style={{ padding: 8, gap: 8, marginTop: 16 }}>
        <input
          className="input grow"
          style={{ border: 0, boxShadow: "none" }}
          placeholder="Yoki yozing: “Kechirasiz” koreyschada qanday?"
          value={text}
          disabled={busy || rec}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendText(text)}
        />
        <button className="icon-btn primary" onClick={() => sendText(text)} disabled={busy || rec || !text.trim()} aria-label="Yuborish">
          <Icon name="send" size={18} />
        </button>
      </div>

      {older.length > 0 && (
        <details className="card" style={{ marginTop: 16 }}>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>Suhbat tarixi ({Math.ceil(older.length / 2)})</summary>
          <div className="chat" style={{ marginTop: 14 }}>
            {older.map((m, i) =>
              m.role === "ai" ? (
                <div key={i} className="msg ai">
                  <div className="bubble row" style={{ alignItems: "flex-start" }}>
                    <div className="grow vs-history">{m.segments ? <Reply segments={m.segments} /> : m.text}</div>
                    <button className="icon-btn sm" onClick={() => replay(i)} disabled={rec || busy} aria-label="Tinglash">
                      <Icon name={playing === i ? "stop" : "volume"} size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <div key={i} className="msg me">
                  <div className="bubble">{m.text}</div>
                </div>
              )
            )}
          </div>
        </details>
      )}
    </main>
  );
}
