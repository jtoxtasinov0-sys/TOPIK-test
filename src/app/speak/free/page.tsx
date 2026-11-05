"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { blobToBase64, postJson, SpeakBtn, useAiErrorText } from "@/components/ui";
import { VoiceOrb, type OrbMode } from "@/components/VoiceOrb";
import { LEVELS, PARTNERS, STYLES, TOPICS, partnerOf, topicOf, type TalkLevel, type TalkStyle } from "@/data/talk";
import { outputLevel, playTalk, stopAudio, unlockAudio, type Segment } from "@/lib/audio";
import { MicError, startRecording, type Recording } from "@/lib/mic";
import { touchStreak, useStored } from "@/lib/store";

// Erkin suhbat: koreys do'st (민준 / 지수) bilan tez-tez, ovozli koreyscha suhbat.
// O'quvchi bilmagan so'zini o'zbekcha aytsa — do'st qisqa o'zbekcha tushuntiradi va yana koreyscha davom etadi.
// Xatolar suhbatni to'xtatmasdan, gap ostida tuzatiladi. Uzluksiz rejimda do'st gapirib bo'lgach mikrofon o'zi yoqiladi.

type Teach = { ko: string; rom?: string; uz?: string };
type Hint = { ko: string; uz: string };
type Fix = { ko: string; uz?: string };
type AiMsg = { role: "ai"; help: Segment[]; teach?: Teach; ko: string; rom?: string; uz?: string; hints: Hint[] };
type MeMsg = { role: "me"; text: string; fix?: Fix };
type Msg = AiMsg | MeMsg;
type TalkRes = {
  transcript: string;
  empty?: boolean;
  help?: Segment[];
  teach?: Teach;
  reply: string;
  rom?: string;
  uz?: string;
  fix?: Fix;
  hints?: Hint[];
};

type Setup = { partner: string; topic: string; level: TalkLevel; style: TalkStyle; rom: boolean; tr: boolean; handsFree: boolean };
const DEFAULT_SETUP: Setup = { partner: "minjun", topic: "free", level: "beginner", style: "polite", rom: true, tr: true, handsFree: true };

// Gapirib bo'lgach shuncha jim tursangiz — yuboriladi (boshlang'ichlar gap orasida ko'proq o'ylaydi)
const SILENCE_MS: Record<TalkLevel, number> = { beginner: 1600, intermediate: 1300, advanced: 1050 };
const NO_SPEECH_MS = 12000;
const HANGUL = /[가-힣]/;
const DIDNT_GET = "🤔 Tushunmadim";

const helpText = (m: AiMsg) => m.help.map((s) => s.text).join(" ");
const historyOf = (list: Msg[]) =>
  list.slice(-20).map((m) => (m.role === "ai" ? { role: "ai" as const, text: [helpText(m), m.ko].filter(Boolean).join(" ") } : { role: "me" as const, text: m.text }));

function Mixed({ segments }: { segments: Segment[] }) {
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

export default function FreeTalkPage() {
  const errText = useAiErrorText();
  const [stored, setStored] = useStored<Setup>("hq:talk", DEFAULT_SETUP);
  const s: Setup = { ...DEFAULT_SETUP, ...stored };
  const patch = (p: Partial<Setup>) => setStored((prev) => ({ ...DEFAULT_SETUP, ...prev, ...p }));
  const partner = partnerOf(s.partner);
  const topic = topicOf(s.topic);

  const [started, setStarted] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [rec, setRec] = useState(false);
  const [playing, setPlaying] = useState<number | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [err, setErr] = useState("");
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [hintsFor, setHintsFor] = useState<number | null>(null);

  // Asinxron callback'lar eskirgan state ko'rmasligi uchun
  const msgsRef = useRef<Msg[]>([]);
  const cfg = useRef(s);
  const alive = useRef(true);
  const session = useRef(false); // "To'xtatish" bosilsa — ovoz va avtomatik tinglash to'xtaydi
  const gen = useRef(0); // har yangi suhbatda oshadi — eski so'rov javobi yangi suhbatga tushmasligi uchun
  const busyRef = useRef(false);
  const recState = useRef<"idle" | "starting" | "rec">("idle");
  const micLevel = useRef(0);
  const recRef = useRef<Recording | null>(null);
  const playId = useRef(0); // oxirgi ovoz — undan oldingisi tugasa, mikrofonni yoqmaydi
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    cfg.current = s;
  });
  useEffect(() => {
    // Yangi brauzerlarda scrollIntoView Promise qaytaradi — effektdan qaytarilmasligi kerak
    void endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, busy, hintsFor]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      stopAudio();
      recRef.current?.cancel();
    };
  }, []);

  // Shar uchun ovoz balandligi: yozayotganda — mikrofon, gapirayotganda — do'st ovozi
  const getLevel = useCallback(() => (recState.current === "rec" ? Math.min(1, micLevel.current * 7) : outputLevel()), []);

  const commit = (list: Msg[]) => {
    msgsRef.current = list;
    setMsgs(list);
  };

  /** true — shu ovoz oxirigacha (yoki to'xtatilguncha) o'ynadi; false — uni boshqa ovoz almashtirdi */
  const speak = async (i: number, m: AiMsg, slow?: boolean) => {
    const c = cfg.current;
    const id = ++playId.current;
    setPlaying(i);
    await playTalk({ help: m.help, reply: m.ko, voice: partnerOf(c.partner).voice, slow: slow ?? c.level === "beginner" }, { onLoading: setLoadingAudio });
    if (id !== playId.current) return false;
    setLoadingAudio(false);
    setPlaying((p) => (p === i ? null : p));
    return true;
  };

  /** Uzluksiz rejimda: do'st gapirib bo'lgach mikrofon o'zi yoqiladi */
  const listenAgain = () => {
    if (alive.current && session.current && cfg.current.handsFree) void startRec();
  };

  const send = async (payload: { audio?: { data: string; mime: string }; text?: string; start?: boolean }) => {
    const list = msgsRef.current;
    const c = cfg.current;
    const g = gen.current;
    busyRef.current = true;
    setBusy(true);
    setErr("");
    setHintsFor(null);
    let reply: { index: number; msg: AiMsg } | null = null;
    try {
      const r = await postJson<TalkRes>("/api/talk", {
        ...payload,
        partner: c.partner,
        topic: c.topic,
        level: c.level,
        style: c.style,
        history: historyOf(list),
      });
      if (g !== gen.current) return;
      if (r.empty) {
        setErr("Ovoz eshitilmadi. Mikrofonga yaqinroq, aniqroq gapiring.");
        return;
      }
      const ai: AiMsg = { role: "ai", help: r.help ?? [], teach: r.teach, ko: r.reply, rom: r.rom, uz: r.uz, hints: r.hints ?? [] };
      const me: MeMsg[] = payload.start ? [] : [{ role: "me", text: r.transcript, fix: r.fix }];
      const next: Msg[] = [...list, ...me, ai];
      commit(next);
      if (!payload.start) touchStreak();
      reply = { index: next.length - 1, msg: ai };
    } catch (e) {
      if (g === gen.current) setErr(errText(e));
    } finally {
      if (g === gen.current) {
        busyRef.current = false;
        setBusy(false);
      }
    }
    if (!reply || !alive.current || g !== gen.current || !session.current) return;
    if (await speak(reply.index, reply.msg)) listenAgain();
  };

  const startRec = async () => {
    if (recState.current !== "idle" || busyRef.current) return;
    recState.current = "starting";
    setErr("");
    stopAudio();
    let r: Recording;
    try {
      r = await startRecording({
        silenceMs: SILENCE_MS[cfg.current.level] ?? SILENCE_MS.beginner,
        noSpeechMs: NO_SPEECH_MS,
        onLevel: (rms) => (micLevel.current = rms),
      });
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
    // Jim tursangiz mikrofon o'chadi — xato emas, navbat sizda qoladi
    if (res.kind === "cancel" || res.kind === "silent") return;
    if (res.kind === "short") return setErr("Juda qisqa yozuv. Mikrofonni bosib, gapiring.");
    await send({ audio: { data: await blobToBase64(res.blob), mime: res.blob.type } });
  };

  /** Mikrofonni to'xtatish (yubormasdan) — maslahat yoki namunani tinglaganda mikrofon ovozni yozib olmasligi uchun */
  const pauseMic = () => recRef.current?.cancel();

  const onMic = () => {
    unlockAudio();
    session.current = true;
    if (rec) {
      recRef.current?.stop();
      return;
    }
    if (busy) return;
    stopAudio(); // do'stni bo'lib, o'zingiz gapirasiz
    void startRec();
  };

  const sendText = async (q: string) => {
    const t = q.trim();
    if (!t || busyRef.current) return;
    unlockAudio();
    session.current = true;
    pauseMic();
    stopAudio();
    setText("");
    await send({ text: t });
  };

  const begin = async () => {
    unlockAudio();
    gen.current++;
    session.current = true;
    commit([]);
    setErr("");
    setStarted(true);
    await send({ start: true });
  };

  /** Suhbatni to'xtatish: ovoz va yozuv to'xtaydi, avtomatik tinglash o'chadi (suhbat qoladi) */
  const endSession = () => {
    session.current = false;
    stopAudio();
    setPlaying(null);
    pauseMic();
  };

  const backToSetup = () => {
    gen.current++;
    busyRef.current = false;
    setBusy(false);
    endSession();
    commit([]);
    setErr("");
    setHintsFor(null);
    setStarted(false);
  };

  const replay = async (i: number, slow?: boolean) => {
    unlockAudio();
    if (playing === i && !slow) {
      stopAudio();
      setPlaying(null);
      return;
    }
    const m = msgsRef.current[i];
    if (!m || m.role !== "ai") return;
    pauseMic();
    if ((await speak(i, m, slow)) && i === msgsRef.current.length - 1 && !busyRef.current) listenAgain();
  };

  // ---------- Tanlash ekrani ----------
  if (!started)
    return (
      <main className="container page" style={{ maxWidth: 900 }}>
        <div className="section-head">
          <span className="eyebrow">💬 말하기 · erkin suhbat</span>
          <h1 className="h1">
            Koreys do‘st bilan <span className="gradient-text">erkin suhbat</span>
          </h1>
          <p className="lead">
            Xuddi koreys odam bilan gaplashgandek: siz koreyscha gapirasiz, do‘stingiz darhol koreyscha javob beradi. Bilmagan so‘zingizni o‘zbekcha ayting — u qisqa
            o‘zbekcha tushuntiradi va yana koreyscha davom etadi.
          </p>
        </div>

        <h2 className="h3" style={{ margin: "0 0 12px" }}>Kim bilan gaplashasiz?</h2>
        <div className="tk-partners">
          {PARTNERS.map((p) => (
            <button key={p.id} className={`tk-partner ${partner.id === p.id ? "on" : ""}`} onClick={() => patch({ partner: p.id })} aria-pressed={partner.id === p.id}>
              <span className={`tk-avatar lg ${p.voice}`}>{p.name[0]}</span>
              <span className="stack" style={{ gap: 2 }}>
                <b className="kr">{p.name}</b>
                <span className="tiny muted">{p.uz}</span>
              </span>
            </button>
          ))}
        </div>

        <h2 className="h3" style={{ margin: "22px 0 12px" }}>Mavzu</h2>
        <div className="row-wrap" style={{ gap: 8 }}>
          {TOPICS.map((t) => (
            <button key={t.id} className={`chip ${topic.id === t.id ? "active" : ""}`} onClick={() => patch({ topic: t.id })} aria-pressed={topic.id === t.id}>
              {t.emoji} {t.uz}
            </button>
          ))}
        </div>

        <div className="card row-wrap between" style={{ marginTop: 22, gap: 16 }}>
          <div className="stack" style={{ gap: 8 }}>
            <b className="small">Darajangiz</b>
            <div className="seg" role="group" aria-label="Daraja">
              {LEVELS.map(([k, t]) => (
                <button key={k} className={s.level === k ? "on" : ""} onClick={() => patch({ level: k })}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <b className="small">Gaplashish uslubi</b>
            <div className="seg" role="group" aria-label="Uslub">
              {STYLES.map(([k, ko, uz]) => (
                <button key={k} className={s.style === k ? "on" : ""} onClick={() => patch({ style: k })} title={uz}>
                  <span className="kr">{ko}</span>
                  <span className="hide-mobile"> · {uz}</span>
                </button>
              ))}
            </div>
          </div>
          <button className="btn btn-primary btn-lg" onClick={begin}>
            <Icon name="mic" size={20} /> Suhbatni boshlash
          </button>
        </div>

        <div className="grid-3" style={{ marginTop: 22 }}>
          <div className="card tk-step">
            <span className="tk-num">1</span>
            <b>Koreyscha gapiring</b>
            <span className="small muted">Gapirib bo‘lgach biroz jim turing — o‘zi yuboriladi. Do‘stingiz javob berib, mikrofon yana o‘zi yoqiladi.</span>
          </div>
          <div className="card tk-step">
            <span className="tk-num">2</span>
            <b>Bilmasangiz — o‘zbekcha ayting</b>
            <span className="small muted">
              “Bozor koreyschada nima?” yoki “어제 <i>bozorga</i> 갔어요”. Do‘stingiz o‘zbekcha tushuntiradi va koreyscha davom etadi.
            </span>
          </div>
          <div className="card tk-step">
            <span className="tk-num">3</span>
            <b>Xatolar gap ostida tuzatiladi</b>
            <span className="small muted">Suhbat to‘xtamaydi: to‘g‘ri varianti va qisqa izohi xabaringiz ostida chiqadi. 🐢 sekinroq qaytarish va 💡 javob g‘oyalari ham bor.</span>
          </div>
        </div>
        <div className="callout info" style={{ marginTop: 16 }}>
          🎧 Quloqchin bilan gaplashing — mikrofon do‘stingiz ovozini eshitmaydi. Shovqinsiz joyda yaxshiroq ishlaydi.
        </div>
      </main>
    );

  // ---------- Suhbat ----------
  const speaking = playing !== null && !loadingAudio;
  const mode: OrbMode = rec ? "listen" : busy || (playing !== null && loadingAudio) ? "think" : speaking ? "speak" : "idle";
  const [status, sub] =
    mode === "listen"
      ? ["Tinglayapman", "Koreyscha gapiring — jim tursangiz o‘zi yuboriladi"]
      : busy
        ? [`${partner.name} o‘ylayapti…`, "Bir-ikki soniya"]
        : mode === "think"
          ? [`${partner.name} javob bermoqda…`, "Ovoz tayyorlanmoqda"]
          : mode === "speak"
            ? [`${partner.name} gapiryapti`, "Bo‘lib gapirish uchun mikrofonni bosing"]
            : ["Navbat sizda", "Mikrofonni bosing va koreyscha gapiring"];
  const levelName = LEVELS.find(([k]) => k === s.level)?.[1];
  const styleName = STYLES.find(([k]) => k === s.style)?.[1];
  const said = msgs.filter((m) => m.role === "me" && m.text !== DIDNT_GET).length;
  const lastAi = msgs.length - 1;
  const voice = partner.voice;

  return (
    <main className="container" style={{ maxWidth: 820, paddingTop: 16 }}>
      <div className="card row tk-head" style={{ padding: 12, marginBottom: 16, position: "sticky", top: 74, zIndex: 20 }}>
        <span className={`tk-avatar lg ${voice}`}>{partner.name[0]}</span>
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="tk-sub">
            <b className="kr">{partner.name}</b>
            <span className="small muted">
              {" "}
              · {topic.emoji} {topic.uz}
            </span>
          </div>
          <div className="tiny muted tk-sub">
            {levelName} · <span className="kr">{styleName}</span> · 🗣️ {said} ta gap
          </div>
        </div>
        <button className={`chip ${s.rom ? "active" : ""}`} onClick={() => patch({ rom: !s.rom })} aria-pressed={s.rom} title="Lotincha o‘qilishi">
          Aa
        </button>
        <button className={`chip ${s.tr ? "active" : ""}`} onClick={() => patch({ tr: !s.tr })} aria-pressed={s.tr} title="O‘zbekcha tarjima">
          🌐
        </button>
        <button className={`chip ${s.handsFree ? "active" : ""}`} onClick={() => patch({ handsFree: !s.handsFree })} aria-pressed={s.handsFree} title="Uzluksiz suhbat">
          🔁<span className="hide-mobile"> Uzluksiz</span>
        </button>
        <button className="icon-btn sm" onClick={backToSetup} aria-label="Boshqa suhbatdosh yoki mavzu" title="Boshqa suhbatdosh yoki mavzu">
          <Icon name="rotate" size={16} />
        </button>
      </div>

      <div className="chat">
        {msgs.map((m, i) =>
          m.role === "ai" ? (
            <div key={i} className="msg ai" onClickCapture={pauseMic}>
              <div className="vs-who">
                <span className={`tk-avatar ${voice}`}>{partner.name[0]}</span> <span className="kr">{partner.name}</span>
                {playing === i && !loadingAudio && (
                  <span className="vs-eq" aria-label="gapiryapti">
                    <i />
                    <i />
                    <i />
                  </span>
                )}
              </div>
              <div className="bubble">
                {m.help.length > 0 && (
                  <div className="tk-help">
                    <span aria-hidden>🇺🇿</span>
                    <div className="vs-text">
                      <Mixed segments={m.help} />
                    </div>
                  </div>
                )}
                {m.teach?.ko && (
                  <div className="vs-pr" style={{ marginTop: 0, marginBottom: 10 }}>
                    <div className="grow">
                      <div className="ko">{m.teach.ko}</div>
                      {s.rom && m.teach.rom && <div className="rom">{m.teach.rom}</div>}
                      {m.teach.uz && <div className="uz">{m.teach.uz}</div>}
                    </div>
                    <SpeakBtn text={m.teach.ko} opts={{ slow: true, voice }} />
                  </div>
                )}
                {m.ko && (
                  <div className="row" style={{ alignItems: "flex-start", gap: 8 }}>
                    <div className="grow">
                      <div className="ko">{m.ko}</div>
                      {s.rom && m.rom && <div className="rom">{m.rom}</div>}
                    </div>
                    <button className="icon-btn sm" onClick={() => replay(i)} disabled={busy} aria-label="Qayta tinglash">
                      {playing === i && loadingAudio ? (
                        <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                      ) : (
                        <Icon name={playing === i ? "stop" : "volume"} size={16} />
                      )}
                    </button>
                  </div>
                )}
                {s.tr && m.uz && <div className="tr">{m.uz}</div>}
              </div>

              {i === lastAi && !busy && (
                <div className="row-wrap tk-quick">
                  <button className="chip" onClick={() => replay(i, true)}>
                    🐢 Sekinroq
                  </button>
                  <button className="chip" onClick={() => sendText(DIDNT_GET)}>
                    {DIDNT_GET}
                  </button>
                  {m.hints.length > 0 && (
                    <button className={`chip ${hintsFor === i ? "active" : ""}`} onClick={() => setHintsFor((h) => (h === i ? null : i))} aria-expanded={hintsFor === i}>
                      💡 Nima desam?
                    </button>
                  )}
                </div>
              )}
              {i === lastAi && hintsFor === i && (
                <div className="tk-hints">
                  {m.hints.map((h) => (
                    <div key={h.ko} className="tk-hint">
                      <div className="grow">
                        <div className="kr" style={{ fontWeight: 700 }}>
                          {h.ko}
                        </div>
                        <div className="tiny muted">{h.uz}</div>
                      </div>
                      <SpeakBtn text={h.ko} opts={{ talk: true, voice, slow: true }} />
                    </div>
                  ))}
                  <div className="tiny muted">Tinglang, so‘ng mikrofonni bosib o‘zingiz ayting.</div>
                </div>
              )}
            </div>
          ) : (
            <div key={i} className="msg me">
              <div className="bubble">{HANGUL.test(m.text) ? <span className="kr">{m.text}</span> : m.text}</div>
              {m.fix && (
                <div className="feedback tk-fix">
                  <div className="row" style={{ gap: 8 }}>
                    <span className="kr grow" style={{ color: "var(--green)", fontWeight: 700 }}>
                      ✓ {m.fix.ko}
                    </span>
                    <SpeakBtn text={m.fix.ko} opts={{ talk: true, voice, slow: true }} />
                  </div>
                  {m.fix.uz && <div className="small muted">{m.fix.uz}</div>}
                </div>
              )}
            </div>
          )
        )}
        {busy && (
          <div className="msg ai">
            <div className="vs-who">
              <span className={`tk-avatar ${voice}`}>{partner.name[0]}</span> <span className="kr">{partner.name}</span>
            </div>
            <div className="bubble">
              <span className="vs-dots" aria-label="yozmoqda">
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
              className="input grow kr"
              style={{ border: 0, boxShadow: "none" }}
              placeholder="Koreyscha yoki o‘zbekcha yozing…"
              value={text}
              autoFocus
              disabled={busy}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendText(text)}
            />
            <button className="icon-btn primary sm" onClick={() => sendText(text)} disabled={busy || !text.trim()} aria-label="Yuborish">
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
          <button className={`icon-btn sm ${typing ? "on" : ""}`} onClick={() => setTyping((v) => !v)} aria-pressed={typing} aria-label="Yozib yuborish" title="Yozib yuborish">
            <Icon name="pen" size={16} />
          </button>
          <button className="vbar-end" onClick={endSession} aria-label="Suhbatni to‘xtatish">
            <Icon name="phone" size={16} /> <span className="hide-mobile">To‘xtatish</span>
          </button>
        </div>
        <div className="tiny muted" style={{ textAlign: "center", marginTop: 8 }}>
          Bilmagan so‘zingizni o‘zbekcha ayting · quloqchin bilan yaxshiroq ishlaydi
        </div>
      </div>
    </main>
  );
}
