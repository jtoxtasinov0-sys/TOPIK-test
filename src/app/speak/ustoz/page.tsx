"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { blobToBase64, postJson, SpeakBtn, useAiErrorText } from "@/components/ui";
import { VoiceOrb, type OrbMode } from "@/components/VoiceOrb";
import { outputLevel, playTutor, stopAudio, unlockAudio, type Segment } from "@/lib/audio";
import { MicError, startRecording, type Recording } from "@/lib/mic";
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
  const [typing, setTyping] = useState(false);
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
  const session = useRef(false); // "Tugatish" bosilsa — avtomatik tinglash to'xtaydi
  const busyRef = useRef(false);
  const recState = useRef<"idle" | "starting" | "rec">("idle");
  const micLevel = useRef(0);
  const recRef = useRef<Recording | null>(null);
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
      recRef.current?.cancel();
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
    if (alive.current && session.current && cfg.current.handsFree) void startRec();
  };

  const startRec = async () => {
    if (recState.current !== "idle" || busyRef.current) return;
    recState.current = "starting";
    setErr("");
    stopAudio();
    let r: Recording;
    try {
      r = await startRecording({ onLevel: (rms) => (micLevel.current = rms) });
    } catch (e) {
      recState.current = "idle";
      setErr(e instanceof MicError ? e.message : "Mikrofonni ochib bo‘lmadi.");
      return;
    }
    if (!alive.current) {
      r.cancel();
      return;
    }
    recRef.current = r;
    recState.current = "rec";
    setRec(true);
    const res = await r.result;
    recRef.current = null;
    recState.current = "idle";
    micLevel.current = 0;
    if (!alive.current) return;
    setRec(false);
    if (res.kind === "cancel") return;
    if (res.kind === "silent") return setErr("Ovoz eshitilmadi — gapirish uchun mikrofonni bosing.");
    if (res.kind === "short") return setErr("Juda qisqa yozuv. Mikrofonni bosib, gapiring.");
    await send({ audio: { data: await blobToBase64(res.blob), mime: res.blob.type } });
  };

  const onMic = () => {
    unlockAudio();
    session.current = true;
    if (rec) {
      recRef.current?.stop();
      return;
    }
    if (busy) return;
    stopAudio(); // ustozni bo'lib, o'zingiz gapirasiz
    void startRec();
  };

  /** Suhbatni to'xtatish: ovoz va yozuv to'xtaydi, avtomatik tinglash o'chadi (tarix qoladi) */
  const endSession = () => {
    session.current = false;
    stopAudio();
    setPlaying(null);
    recRef.current?.cancel();
  };

  const newChat = () => {
    endSession();
    commit([]);
    setErr("");
  };

  const sendText = async (q: string) => {
    const t = q.trim();
    if (!t || busyRef.current || rec) return;
    unlockAudio();
    session.current = true;
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
  const [status, sub] =
    mode === "listen"
      ? ["Tinglayapman", "Gapirib bo‘lgach jim turing — o‘zi yuboriladi"]
      : busy
        ? ["Ustoz o‘ylayapti…", "Bir-ikki soniya"]
        : mode === "think"
          ? ["Ustoz javob bermoqda…", "Ovoz tayyorlanmoqda"]
          : mode === "speak"
            ? ["Ustoz gapiryapti", "Bo‘lib gapirish uchun mikrofonni bosing"]
            : msgs.length
              ? ["Navbat sizda", "Mikrofonni bosing va gapiring"]
              : ["Gapirishga tayyor", "Mikrofonni bosing va o‘zbekcha so‘rang"];
  const levelName = LEVELS.find(([k]) => k === level)?.[1];

  return (
    <main className="container" style={{ maxWidth: 820, paddingTop: 16 }}>
      <div className="card row" style={{ padding: 12, marginBottom: 16, position: "sticky", top: 74, zIndex: 20, gap: 10 }}>
        <span className="icon-tile" style={{ width: 42, height: 42 }}>
          <Icon name="mic" size={20} />
        </span>
        <div className="grow" style={{ minWidth: 0 }}>
          <b>Ovozli ustoz</b>
          <div className="tiny muted">{levelName} daraja</div>
        </div>
        <button className={`chip ${showRom ? "active" : ""}`} onClick={() => setShowRom((v) => !v)} aria-pressed={showRom} title="Lotincha o‘qilishi">
          Aa
        </button>
        <button className={`chip ${handsFree ? "active" : ""}`} onClick={() => setHandsFree((v) => !v)} aria-pressed={handsFree} title="Uzluksiz suhbat">
          🔁<span className="hide-mobile"> Uzluksiz</span>
        </button>
        {msgs.length > 0 && (
          <button className="icon-btn sm" onClick={newChat} aria-label="Yangi suhbat" title="Yangi suhbat">
            <Icon name="rotate" size={16} />
          </button>
        )}
      </div>

      {msgs.length === 0 && (
        <div className="vs-hero">
          <VoiceOrb mode={mode} getLevel={getLevel} size={92} label="" />
          <h1 className="h2">
            Ustoz bilan <span className="gradient-text">ovozli dars</span>
          </h1>
          <p className="lead">
            O‘zbekcha so‘rang: “Rahmat koreyschada qanday?” yoki “Menga dars o‘tib ber”. Ustoz o‘zbekcha tushuntiradi, koreyscha so‘zlarni ovoz bilan aytadi va
            takrorlaganingizda talaffuzingizni tekshiradi.
          </p>
          <div className="seg" role="group" aria-label="Daraja">
            {LEVELS.map(([k, t]) => (
              <button key={k} className={level === k ? "on" : ""} onClick={() => setLevel(k)}>
                {t}
              </button>
            ))}
          </div>
          <div className="row-wrap" style={{ gap: 8, justifyContent: "center" }}>
            {CHIPS.map((c) => (
              <button key={c} className="chip" style={{ whiteSpace: "normal" }} disabled={busy || rec} onClick={() => sendText(c)}>
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="chat">
        {msgs.map((m, i) =>
          m.role === "ai" ? (
            <div key={i} className="msg ai">
              <div className="vs-who">
                <span className="vs-avatar">U</span> Ustoz
                {playing === i && !loadingAudio && (
                  <span className="vs-eq" aria-label="gapiryapti">
                    <i />
                    <i />
                    <i />
                  </span>
                )}
              </div>
              <div className="bubble">
                <div className="row" style={{ alignItems: "flex-start", gap: 8 }}>
                  <div className="grow vs-text">{m.segments ? <Reply segments={m.segments} /> : m.text}</div>
                  <button className="icon-btn sm" onClick={() => replay(i)} disabled={rec || busy} aria-label="Qayta tinglash">
                    {playing === i && loadingAudio ? (
                      <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                    ) : (
                      <Icon name={playing === i ? "stop" : "volume"} size={16} />
                    )}
                  </button>
                </div>
                {m.practice?.ko && (
                  <div className="vs-pr">
                    <div className="grow">
                      <div className="ko">{m.practice.ko}</div>
                      {showRom && m.practice.rom && <div className="rom">{m.practice.rom}</div>}
                      {m.practice.uz && <div className="uz">{m.practice.uz}</div>}
                    </div>
                    <SpeakBtn text={m.practice.ko} opts={{ slow: true, voice: "m" }} />
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
            <div className="vs-who">
              <span className="vs-avatar">U</span> Ustoz
            </div>
            <div className="bubble">
              <span className="vs-dots" aria-label="o‘ylayapti">
                <i />
                <i />
                <i />
              </span>
            </div>
          </div>
        )}
        {err && <div className="callout">{err}</div>}
        <div ref={endRef} style={{ height: 4 }} />
      </div>

      <div className="composer">
        {typing && (
          <div className="card row" style={{ padding: 8, gap: 8, marginBottom: 10 }}>
            <input
              className="input grow"
              style={{ border: 0, boxShadow: "none" }}
              placeholder="Yozing: “Kechirasiz” koreyschada qanday?"
              value={text}
              autoFocus
              disabled={busy || rec}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendText(text)}
            />
            <button className="icon-btn primary sm" onClick={() => sendText(text)} disabled={busy || rec || !text.trim()} aria-label="Yuborish">
              <Icon name="send" size={16} />
            </button>
          </div>
        )}
        <div className="card vbar">
          <button className={`vbar-mic ${rec ? "rec" : ""}`} onClick={onMic} disabled={busy} aria-label={rec ? "Yuborish" : "Gapirish"}>
            {busy ? <span className="spinner white" style={{ width: 20, height: 20 }} /> : <Icon name={rec ? "send" : "mic"} size={22} />}
          </button>
          <div className="vbar-mid" aria-live="polite">
            <VoiceOrb mode={mode} getLevel={getLevel} size={40} label="" />
            <div className="vbar-status">
              <b>{status}</b>
              <span>{sub}</span>
            </div>
          </div>
          <button className={`icon-btn sm ${typing ? "on" : ""}`} onClick={() => setTyping((v) => !v)} aria-pressed={typing} aria-label="Yozib so‘rash" title="Yozib so‘rash">
            <Icon name="pen" size={16} />
          </button>
          {(msgs.length > 0 || rec) && (
            <button className="vbar-end" onClick={endSession} aria-label="Suhbatni tugatish">
              <Icon name="phone" size={16} /> <span className="hide-mobile">Tugatish</span>
            </button>
          )}
        </div>
        <div className="tiny muted" style={{ textAlign: "center", marginTop: 8 }}>
          Maslahat: shovqinsiz joyda gapiring; quloqchin bilan ustoz o‘z ovozini eshitmaydi.
        </div>
      </div>
    </main>
  );
}
