"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { blobToBase64, postJson, SpeakBtn, useAiErrorText } from "@/components/ui";
import { VisualOr } from "@/components/Visual";
import { SCENARIOS, type Scenario } from "@/data/scenarios";
import { pickRecorderMime, playKorean, stopAudio } from "@/lib/audio";
import { touchStreak } from "@/lib/store";

type Level = "beginner" | "intermediate" | "advanced";
type Feedback = { score?: number; corrected_ko?: string; explanation?: string; pronunciation?: string };
type Msg = { role: "ai" | "me"; ko: string; rom?: string; tr?: string; feedback?: Feedback; suggestions?: { ko: string; tr: string }[] };
type SpeakRes = {
  transcript: string;
  empty?: boolean;
  reply_ko: string;
  reply_rom: string;
  reply_tr: string;
  feedback?: Feedback;
  suggestions: { ko: string; tr: string }[];
  done?: boolean;
};

export default function SpeakPage() {
  const errText = useAiErrorText();
  const [scenario, setScenario] = useState<Scenario>(SCENARIOS[1]);
  const [level, setLevel] = useState<Level>("beginner");
  const [showRom, setShowRom] = useState(true);
  const [showTr, setShowTr] = useState(true);
  const [autoPlay, setAutoPlay] = useState(true);
  const [started, setStarted] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [rec, setRec] = useState(false);
  const [err, setErr] = useState("");
  const [text, setText] = useState("");
  const [bars, setBars] = useState<number[]>(Array(24).fill(4));
  const [secs, setSecs] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const raf = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Yangi brauzerlarda scrollIntoView Promise qaytaradi — effektdan qaytarilmasligi kerak
    void endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, busy]);
  useEffect(
    () => () => {
      stopAudio();
      cancelAnimationFrame(raf.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    },
    []
  );
  useEffect(() => {
    if (!rec) return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [rec]);

  const history = (list: Msg[]) => list.map((m) => ({ role: m.role, ko: m.ko }));

  const send = async (payload: { audio?: { data: string; mime: string }; text?: string; start?: boolean }, list: Msg[]) => {
    setBusy(true);
    setErr("");
    try {
      const r = await postJson<SpeakRes>("/api/speak", {
        ...payload,
        scenario: { id: scenario.id, ko: scenario.ko, role: scenario.role, goal: scenario.goal },
        level,
        history: history(list),
      });
      if (r.empty) {
        setErr("Ovoz eshitilmadi. Mikrofonga yaqinroq, aniqroq gapiring.");
        return;
      }
      const next = [...list];
      if (!payload.start) next.push({ role: "me", ko: r.transcript, feedback: r.feedback });
      next.push({ role: "ai", ko: r.reply_ko, rom: r.reply_rom, tr: r.reply_tr, suggestions: r.suggestions });
      setMsgs(next);
      touchStreak();
      if (autoPlay) void playKorean(r.reply_ko, { slow: level === "beginner" });
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(false);
    }
  };

  const start = async () => {
    setStarted(true);
    setMsgs([]);
    await send({ start: true }, []);
  };

  const startRec = async () => {
    setErr("");
    stopAudio();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      streamRef.current = stream;
      const mime = pickRecorderMime();
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunks.current = [];
      mr.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      mr.onstop = async () => {
        cancelAnimationFrame(raf.current);
        setBars(Array(24).fill(4));
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: mr.mimeType || mime || "audio/webm" });
        if (blob.size < 2000) {
          setErr("Juda qisqa yozuv. Tugmani bosib, gapiring, so‘ng yana bosing.");
          return;
        }
        const data = await blobToBase64(blob);
        await send({ audio: { data, mime: blob.type } }, msgs);
      };
      // To'lqin animatsiyasi
      const ctx = new AudioContext();
      const an = ctx.createAnalyser();
      an.fftSize = 64;
      ctx.createMediaStreamSource(stream).connect(an);
      const arr = new Uint8Array(an.frequencyBinCount);
      const loop = () => {
        an.getByteFrequencyData(arr);
        setBars(Array.from({ length: 24 }, (_, i) => 4 + (arr[i % arr.length] / 255) * 36));
        raf.current = requestAnimationFrame(loop);
      };
      loop();
      mr.start();
      mediaRef.current = mr;
      setSecs(0);
      setRec(true);
      setTimeout(() => mediaRef.current?.state === "recording" && stopRec(), 60000);
    } catch {
      setErr("Mikrofonga ruxsat berilmadi. Brauzer sozlamalaridan ruxsat bering yoki matn bilan yozing.");
    }
  };

  const stopRec = () => {
    mediaRef.current?.stop();
    setRec(false);
  };

  const sendText = async () => {
    const t = text.trim();
    if (!t || busy) return;
    setText("");
    await send({ text: t }, msgs);
  };

  if (!started)
    return (
      <main className="container page">
        <div className="section-head">
          <span className="eyebrow">🗣️ 말하기 · Gemini 3.5 Transcribe</span>
          <h1 className="h1">
            AI bilan{" "}
            <span className="gradient-text">gaplashing</span>
          </h1>
          <p className="lead">
            Vaziyatni tanlang va koreyscha gapiring. AI sizni tushunadi, xatolarni o‘zbekcha tushuntiradi, talaffuz bo‘yicha maslahat beradi va suhbatni davom ettiradi.
          </p>
        </div>

        <Link href="/speak/free" className="card row-wrap between" style={{ gap: 16, marginBottom: 12, background: "var(--grad-pink)", color: "#fff", border: 0 }}>
          <div className="row" style={{ gap: 14 }}>
            <span className="icon-tile" style={{ width: 52, height: 52, fontSize: "1.6rem", background: "rgba(255,255,255,.18)" }}>💬</span>
            <div className="stack" style={{ gap: 4 }}>
              <b>Erkin suhbat — koreys do‘st bilan</b>
              <span className="small" style={{ opacity: 0.9 }}>
                Tez-tez, ovozli koreyscha suhbat. Bilmagan so‘zingizni o‘zbekcha ayting — do‘stingiz tushuntiradi va yana koreyscha davom etadi.
              </span>
            </div>
          </div>
          <span className="btn btn-sm" style={{ background: "#fff", color: "var(--ink)" }}>
            <Icon name="chat" size={16} /> Gaplashish
          </span>
        </Link>

        <Link href="/speak/ustoz" className="card row-wrap between" style={{ gap: 16, marginBottom: 20, background: "var(--grad-btn)", color: "#fff", border: 0 }}>
          <div className="row" style={{ gap: 14 }}>
            <span className="icon-tile" style={{ width: 52, height: 52, fontSize: "1.6rem", background: "rgba(255,255,255,.18)" }}>🎙️</span>
            <div className="stack" style={{ gap: 4 }}>
              <b>Ovozli ustoz — o‘zbekcha so‘rang</b>
              <span className="small" style={{ opacity: 0.9 }}>
                “Rahmat koreyschada qanday?” deb gapiring — ustoz koreyscha va o‘zbekcha ovoz bilan javob beradi va dars o‘tadi.
              </span>
            </div>
          </div>
          <span className="btn btn-sm" style={{ background: "#fff", color: "var(--ink)" }}>
            <Icon name="mic" size={16} /> Boshlash
          </span>
        </Link>

        <h2 className="h3" style={{ margin: "4px 0 12px" }}>Vaziyatli suhbat (koreyscha)</h2>

        <div className="grid-4">
          {SCENARIOS.filter((s) => s.id !== "free").map((s) => (
            <button key={s.id} className={`scenario ${scenario.id === s.id ? "on" : ""}`} onClick={() => setScenario(s)}>
              <span className="em">
                <VisualOr id={`scenario:${s.id}`} emoji={s.emoji} size={56} />
              </span>
              <b>{s.title}</b>
              <span className="kr small" style={{ opacity: 0.75 }}>{s.ko}</span>
            </button>
          ))}
        </div>

        <div className="card row-wrap between" style={{ marginTop: 20, gap: 16 }}>
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
            <button className={`chip ${showTr ? "active" : ""}`} onClick={() => setShowTr((v) => !v)}>
              🌐 Tarjima
            </button>
            <button className={`chip ${autoPlay ? "active" : ""}`} onClick={() => setAutoPlay((v) => !v)}>
              🔊 Avto ovoz
            </button>
          </div>
          <button className="btn btn-primary btn-lg" onClick={start}>
            <Icon name="mic" size={20} /> Boshlash
          </button>
        </div>
        <div className="callout info" style={{ marginTop: 16 }}>
          💡 Mikrofon tugmasini bosing → gapiring → yana bosing. Shovqinsiz joyda yaxshiroq ishlaydi.
        </div>
      </main>
    );

  return (
    <main className="container" style={{ maxWidth: 820, paddingTop: 16 }}>
      <div className="card row" style={{ padding: 14, marginBottom: 16, position: "sticky", top: 74, zIndex: 20 }}>
        <VisualOr id={`scenario:${scenario.id}`} emoji={scenario.emoji} size={44} />
        <div className="grow">
          <b>{scenario.title}</b>
          <div className="kr tiny muted">{scenario.ko}</div>
        </div>
        <button
          className="btn btn-sm"
          onClick={() => {
            stopAudio();
            setStarted(false);
          }}
        >
          <Icon name="rotate" size={16} /> <span className="hide-mobile">Boshqa vaziyat</span>
        </button>
      </div>

      <div className="chat">
        {msgs.map((m, i) =>
          m.role === "ai" ? (
            <div key={i} className="msg ai">
              <div className="bubble">
                <div className="row" style={{ alignItems: "flex-start" }}>
                  <div className="grow">
                    <div className="ko">{m.ko}</div>
                    {showRom && m.rom && <div className="rom">{m.rom}</div>}
                  </div>
                  <SpeakBtn text={m.ko} opts={{ slow: level === "beginner" }} />
                </div>
                {showTr && m.tr && <div className="tr">{m.tr}</div>}
              </div>
              {i === msgs.length - 1 && !!m.suggestions?.length && (
                <div className="row-wrap" style={{ marginTop: 10, gap: 6 }}>
                  <span className="tiny muted" style={{ width: "100%" }}>Javob variantlari:</span>
                  {m.suggestions.map((s) => (
                    <button key={s.ko} className="chip" style={{ whiteSpace: "normal", textAlign: "left" }} onClick={() => playKorean(s.ko, { slow: true })} title={s.tr}>
                      <span className="kr">{s.ko}</span>
                      <span className="tiny muted">· {s.tr}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div key={i} className="msg me">
              <div className="bubble">
                <div className="ko">{m.ko}</div>
              </div>
              {m.feedback && (m.feedback.corrected_ko || m.feedback.explanation) && (
                <div className="feedback">
                  <div className="row between" style={{ marginBottom: 6 }}>
                    <b className="small">AI fikri</b>
                    {typeof m.feedback.score === "number" && (
                      <span className={`badge ${m.feedback.score >= 80 ? "green" : m.feedback.score >= 50 ? "amber" : "red"}`}>{m.feedback.score} / 100</span>
                    )}
                  </div>
                  {m.feedback.corrected_ko && m.feedback.corrected_ko !== m.ko && (
                    <div className="row" style={{ gap: 8, marginBottom: 6 }}>
                      <span className="kr" style={{ color: "var(--green)", fontWeight: 700 }}>✓ {m.feedback.corrected_ko}</span>
                      <SpeakBtn text={m.feedback.corrected_ko} opts={{ slow: true }} />
                    </div>
                  )}
                  {m.feedback.explanation && <div className="small">{m.feedback.explanation}</div>}
                  {m.feedback.pronunciation && <div className="small muted" style={{ marginTop: 6 }}>🗣️ {m.feedback.pronunciation}</div>}
                </div>
              )}
            </div>
          )
        )}
        {busy && (
          <div className="msg ai">
            <div className="bubble row">
              <span className="spinner" /> <span className="small muted">AI tinglamoqda va javob yozmoqda…</span>
            </div>
          </div>
        )}
        {err && <div className="callout">{err}</div>}
        <div ref={endRef} style={{ height: 8 }} />
      </div>

      <div className="composer">
        <div className="card stack" style={{ padding: 14, gap: 12, alignItems: "center" }}>
          {rec ? (
            <div className="wave" aria-hidden>
              {bars.map((h, i) => (
                <i key={i} style={{ height: h }} />
              ))}
            </div>
          ) : null}
          <div className="row" style={{ width: "100%", gap: 14 }}>
            <input
              className="input kr grow"
              placeholder="Yoki koreyscha yozing…"
              value={text}
              disabled={busy || rec}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendText()}
            />
            {text.trim() ? (
              <button className="icon-btn primary" onClick={sendText} disabled={busy} aria-label="Yuborish">
                <Icon name="send" size={18} />
              </button>
            ) : (
              <button className={`mic ${rec ? "rec" : ""}`} style={{ width: 64, height: 64 }} onClick={rec ? stopRec : startRec} disabled={busy} aria-label="Mikrofon">
                <Icon name={rec ? "stop" : "mic"} size={26} />
              </button>
            )}
          </div>
          <div className="tiny muted">{rec ? `● Yozilmoqda ${secs}s — to‘xtatish uchun bosing` : "Mikrofonni bosing va gapiring"}</div>
        </div>
      </div>
    </main>
  );
}
