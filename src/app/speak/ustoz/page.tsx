"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { micToLevel, RecMeter } from "@/components/MicWave";
import { ApiError, blobToBase64, postNdjson, SpeakBtn, useAiErrorText } from "@/components/ui";
import { VoiceOrb, type OrbMode } from "@/components/VoiceOrb";
import { expectAudio, outputLevel, playTutor, stopAudio, unlockAudio, type AudioWait, type Segment, type TtsOpts } from "@/lib/audio";
import { MicError, micQuiet, startRecording, type Recording } from "@/lib/mic";
import { touchStreak } from "@/lib/store";

// Ovozli ustoz: o'quvchi o'zbekcha so'raydi ("Rahmat koreyschada qanday?"),
// ustoz (yigit ovozi) o'zbekcha tushuntiradi, koreyscha so'zlarni ovoz bilan aytadi va bosqichma-bosqich dars o'tadi.

type Level = "beginner" | "intermediate" | "advanced";
type Practice = { ko: string; rom?: string; uz?: string };
type Msg = { role: "me" | "ai"; text: string; segments?: Segment[]; practice?: Practice };
/**
 * /api/voice oqimi: heard — o'quvchi gapi; reply — ustoz javobi (tts — server ovozini o'zi yuboradigan bo'laklar);
 * audio — tayyor ovoz bo'lagi; done — to'liq natija (+ practice). t bo'lmasa — oddiy (oqimsiz) javob.
 */
type VoiceEvent = {
  t?: "heard" | "reply" | "done" | "audio";
  transcript?: string;
  empty?: boolean;
  error?: string;
  segments?: Segment[];
  practice?: Practice;
  tts?: { text: string; opts: TtsOpts }[];
  text?: string;
  data?: string;
};

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
  const router = useRouter();
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
    document.body.classList.add("voice-mode"); // ovozli ekran: pastki menyu yashiriladi
    return () => {
      document.body.classList.remove("voice-mode");
      alive.current = false;
      stopAudio();
      recRef.current?.cancel();
    };
  }, []);

  // Shar uchun ovoz balandligi: yozayotganda — mikrofon, gapirayotganda — ustoz ovozi
  const getLevel = useCallback(() => (recState.current === "rec" ? Math.min(1, micLevel.current * 7) : outputLevel()), []);
  // Yozuv grafigi uchun: faqat mikrofon
  const getMicLevel = useCallback(() => micToLevel(micLevel.current), []);

  const commit = (list: Msg[]) => {
    msgsRef.current = list;
    setMsgs(list);
  };

  /**
   * Ustoz gapiradi. Shu paytda mikrofon yopiq: avval ustoz to'liq tushuntiradi, keyin navbat o'quvchiga.
   * true — oxirigacha o'qildi; false — to'xtatildi yoki ovoz chiqmadi (mikrofon o'zi yoqilmaydi).
   */
  const speak = async (i: number, segs: Segment[]) => {
    recRef.current?.cancel();
    setPlaying(i);
    setLoadingAudio(true);
    await micQuiet(); // mikrofon endigina yopilgan bo'lsa — telefon ovoz rejimiga qaytib olsin
    const played = await playTutor(segs, { onLoading: setLoadingAudio });
    setLoadingAudio(false);
    setPlaying((p) => (p === i ? null : p));
    return played;
  };

  const send = async (payload: { audio?: { data: string; mime: string }; text?: string }) => {
    const history = msgsRef.current.slice(-16).map((m) => ({ role: m.role, text: m.text }));
    busyRef.current = true;
    setBusy(true);
    setErr("");
    const idle = () => {
      busyRef.current = false;
      setBusy(false);
    };
    let meAt = -1;
    let aiAt = -1;
    // Server javob ovozini o'zi tayyorlab yuboradi — shu bo'laklarni kutamiz (qayta so'ramaymiz)
    const waits = new Map<string, AudioWait>();
    const addMe = (text: string) => {
      if (meAt >= 0 || !text) return;
      const next: Msg[] = [...msgsRef.current, { role: "me", text }];
      meAt = next.length - 1;
      commit(next);
      touchStreak();
    };
    const onEvent = (e: VoiceEvent) => {
      if (e.t === "audio") {
        const w = waits.get(e.text ?? "");
        waits.delete(e.text ?? "");
        if (w && e.data) w.resolve(e.data);
        else w?.fail();
        return;
      }
      if (!alive.current) return;
      if (e.t === "heard") return addMe(e.transcript ?? "");
      if (e.empty) {
        if (aiAt < 0) setErr("Ovoz eshitilmadi. Mikrofonga yaqinroq, aniqroq gapiring.");
        return;
      }
      if (e.error) {
        if (aiAt < 0) setErr(errText(new ApiError(e.error, 502)));
        return;
      }
      addMe(e.transcript ?? "");
      if (aiAt < 0 && e.segments?.length) {
        const segs = e.segments;
        const next: Msg[] = [...msgsRef.current, { role: "ai", text: segs.map((x) => x.text).join(" "), segments: segs, practice: e.practice }];
        aiAt = next.length - 1;
        commit(next);
        idle();
        for (const ch of e.tts ?? []) waits.set(ch.text, expectAudio(ch.text, ch.opts));
        // Uzluksiz suhbat: ustoz javobini OXIRIGACHA o'qib bo'lgachgina mikrofon o'zi yoqiladi (navbat sizda)
        void speak(aiAt, segs).then((played) => {
          if (played && alive.current && session.current && cfg.current.handsFree) void startRec();
        });
      }
      // To'liq natija: takrorlash uchun ibora (practice) kartasi
      if (e.t !== "reply" && aiAt >= 0 && e.practice) {
        const list = msgsRef.current.slice();
        list[aiAt] = { ...list[aiAt], practice: e.practice };
        commit(list);
      }
    };

    if (payload.text) addMe(payload.text);
    try {
      await postNdjson<VoiceEvent>("/api/voice", { ...payload, stream: true, level: cfg.current.level, history }, onEvent);
    } catch (e) {
      if (alive.current && aiAt < 0) setErr(errText(e));
    } finally {
      idle();
      for (const w of waits.values()) w.fail();
      waits.clear();
    }
  };

  const startRec = async () => {
    if (recState.current !== "idle" || busyRef.current) return;
    recState.current = "starting";
    setErr("");
    stopAudio();
    let r: Recording;
    try {
      // O'zbekcha savol odatda uzluksiz aytiladi — 0.9 soniya jimlikdan keyin darhol yuboramiz
      r = await startRecording({ silenceMs: 900, onLevel: (rms) => (micLevel.current = rms) });
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

  /** Ovozli darsdan chiqish: oldingi sahifaga (bo'lmasa — bosh sahifaga) */
  const exit = () => {
    endSession();
    if (window.history.length > 1) router.back();
    else router.push("/speak");
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
    <main className="container voice-focus" style={{ maxWidth: 820, paddingTop: 16 }}>
      <div className="card row" style={{ padding: 12, marginBottom: 16, position: "sticky", top: 74, zIndex: 20, gap: 10 }}>
        <button className="icon-btn sm" onClick={exit} aria-label="Chiqish" title="Chiqish">
          <Icon name="left" size={18} />
        </button>
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
        <div ref={endRef} className="chat-end" style={{ height: 4 }} />
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
            {rec ? (
              <RecMeter getLevel={getMicLevel} />
            ) : (
              <>
                <VoiceOrb mode={mode} getLevel={getLevel} size={40} label="" />
                <div className="vbar-status">
                  <b>{status}</b>
                  <span>{sub}</span>
                </div>
              </>
            )}
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
        {rec ? (
          <div className="rec-hint">Ovozingiz yozilmoqda — gapirib bo‘lgach jim turing, o‘zi yuboriladi</div>
        ) : (
          <div className="tiny muted" style={{ textAlign: "center", marginTop: 8 }}>
            Maslahat: shovqinsiz joyda gapiring; quloqchin bilan ustoz o‘z ovozini eshitmaydi.
          </div>
        )}
      </div>
    </main>
  );
}
