"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { micToLevel, RecMeter } from "@/components/MicWave";
import { ApiError, blobToBase64, postNdjson, SpeakBtn, useAiErrorText } from "@/components/ui";
import { VoiceOrb, type OrbMode } from "@/components/VoiceOrb";
import { LEVELS, PARTNERS, STYLES, TOPICS, greeting, partnerOf, topicOf, type TalkLevel, type TalkStyle } from "@/data/talk";
import { expectAudio, outputLevel, playTalk, prefetchTalk, stopAudio, unlockAudio, type AudioWait, type Segment, type TtsOpts } from "@/lib/audio";
import Link from "next/link";
import { MIC_DEAD_TEXT, MicError, micSettled, releaseMic, startRecording, warmMic, type Recording } from "@/lib/mic";
import { romanize } from "@/lib/romanize";
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
/**
 * /api/talk oqimi hodisalari: heard — o'quvchi gapi; reply — do'st javobi (ovoz darhol boshlanadi);
 * done — to'liq natija (lotincha yozuv, tarjima, tuzatish, maslahatlar). t bo'lmasa — oddiy (oqimsiz) javob.
 */
type TalkEvent = Partial<TalkRes> & {
  t?: "heard" | "reply" | "done" | "audio";
  error?: string;
  /** reply: server shu bo'laklar ovozini o'zi tayyorlab yuboradi */
  tts?: { text: string; opts: TtsOpts }[];
  /** audio: bo'lak matni va ovozi (base64 WAV); failed — server tayyorlay olmadi */
  text?: string;
  data?: string;
  failed?: boolean;
};

type Setup = { partner: string; topic: string; level: TalkLevel; style: TalkStyle; rom: boolean; tr: boolean; handsFree: boolean };
const DEFAULT_SETUP: Setup = { partner: "minjun", topic: "free", level: "beginner", style: "polite", rom: true, tr: true, handsFree: true };

// Gapirib bo'lgach shuncha jim tursangiz — yuboriladi (boshlang'ichlar gap orasida ko'proq o'ylaydi).
// Jonli suhbatdagidek: odam gapini tugatgach bir lahzada javob keladi
const SILENCE_MS: Record<TalkLevel, number> = { beginner: 1100, intermediate: 800, advanced: 650 };
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
      releaseMic();
    };
  }, []);

  // Suhbat ekranida pastki menyu yashiriladi
  useEffect(() => {
    document.body.classList.toggle("voice-mode", started);
    return () => document.body.classList.remove("voice-mode");
  }, [started]);

  // Tanlash ekranida: server uyg'otiladi va birinchi salom ovozi oldindan tayyorlanadi —
  // «Suhbatni boshlash» bosilishi bilan do'st kutmasdan gapiradi
  useEffect(() => {
    for (const u of ["/api/talk", "/api/tts"]) void fetch(u, { method: "GET" }).catch(() => {});
  }, []);
  useEffect(() => {
    if (started) return;
    const t = setTimeout(() => {
      const g = greeting(s.partner, s.topic, s.style);
      prefetchTalk({ reply: g.ko, voice: partnerOf(s.partner).voice, slow: s.level === "beginner" });
    }, 700);
    return () => clearTimeout(t);
  }, [started, s.partner, s.topic, s.style, s.level]);

  // Shar uchun ovoz balandligi: yozayotganda — mikrofon, gapirayotganda — do'st ovozi
  const getLevel = useCallback(() => (recState.current === "rec" ? Math.min(1, micLevel.current * 7) : outputLevel()), []);
  // Yozuv grafigi uchun: faqat mikrofon
  const getMicLevel = useCallback(() => micToLevel(micLevel.current), []);

  const commit = (list: Msg[]) => {
    msgsRef.current = list;
    setMsgs(list);
  };

  /**
   * Do'st gapiradi. Shu paytda mikrofon yopiq: navbat — do'stda (iPhone ham ovozni pasaytirmaydi).
   * true — oxirigacha o'qildi, endi navbat o'quvchiga; false — to'xtatildi, ovoz chiqmadi yoki boshqa ovoz almashtirdi.
   */
  const speak = async (i: number, m: AiMsg, slow?: boolean) => {
    const c = cfg.current;
    const id = ++playId.current;
    pauseMic();
    setPlaying(i);
    setLoadingAudio(true);
    await micSettled(); // quloqchinsiz — mikrofon yopiladi (javob baland karnaydan); quloqchin — rejimini almashtirib olsin
    if (id !== playId.current) return false;
    const played = await playTalk({ help: m.help, reply: m.ko, voice: partnerOf(c.partner).voice, slow: slow ?? c.level === "beginner" }, { onLoading: setLoadingAudio });
    if (id !== playId.current) return false;
    setLoadingAudio(false);
    setPlaying((p) => (p === i ? null : p));
    return played;
  };

  /** Uzluksiz rejimda: do'st gapirib bo'lgach mikrofon o'zi yoqiladi */
  const listenAgain = () => {
    if (alive.current && session.current && cfg.current.handsFree) void startRec();
  };

  const send = async (payload: { audio?: { data: string; mime: string }; text?: string; start?: boolean }) => {
    const c = cfg.current;
    const g = gen.current;
    const history = historyOf(msgsRef.current);
    const live = () => g === gen.current;
    busyRef.current = true;
    setBusy(true);
    setErr("");
    setHintsFor(null);
    const idle = () => {
      if (!live()) return;
      busyRef.current = false;
      setBusy(false);
    };

    let meAt = -1;
    let aiAt = -1;
    // Server javob ovozini o'zi tayyorlab yuboradi — shu bo'laklarni kutamiz (qayta so'ramaymiz)
    const waits = new Map<string, AudioWait>();
    const patchMsg = (i: number, p: Partial<AiMsg> | Partial<MeMsg>) => {
      const m = msgsRef.current[i];
      if (!m) return;
      const next = msgsRef.current.slice();
      next[i] = { ...m, ...p } as Msg;
      commit(next);
    };
    // O'quvchi gapi — model eshitishi bilan (yozilgan bo'lsa — darhol) ko'rinadi
    const addMe = (text: string) => {
      if (payload.start || meAt >= 0 || !text) return;
      const next: Msg[] = [...msgsRef.current, { role: "me", text }];
      meAt = next.length - 1;
      commit(next);
      touchStreak();
    };
    const onEvent = (e: TalkEvent) => {
      if (e.t === "audio") {
        const w = waits.get(e.text ?? "");
        waits.delete(e.text ?? "");
        if (w && e.data) w.resolve(e.data);
        else w?.fail();
        return;
      }
      if (!live()) return;
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
      if (aiAt < 0) {
        // Javob keldi — tarjima va maslahatlarni kutmasdan ko'rsatamiz va ovozni boshlaymiz
        const ai: AiMsg = { role: "ai", help: e.help ?? [], teach: e.teach, ko: e.reply ?? "", rom: e.rom, uz: e.uz, hints: e.hints ?? [] };
        const next: Msg[] = [...msgsRef.current, ai];
        aiAt = next.length - 1;
        commit(next);
        idle();
        for (const ch of e.tts ?? []) waits.set(ch.text, expectAudio(ch.text, ch.opts));
        // Do'st gapirib bo'lishi bilan — navbat sizda (tarjima va maslahatlar oqimi tugashini kutmasdan)
        if (alive.current && session.current)
          void speak(aiAt, ai).then((played) => {
            if (played && alive.current && live() && session.current) listenAgain();
          });
      }
      if (e.t === "reply") return;
      // To'liq natija: lotincha yozuv, tarjima, maslahatlar va o'quvchi gapidagi tuzatish
      patchMsg(aiAt, { rom: e.rom, uz: e.uz, hints: e.hints ?? [], ...(e.teach ? { teach: e.teach } : {}) });
      if (meAt >= 0 && e.fix) patchMsg(meAt, { fix: e.fix });
    };

    if (payload.text) addMe(payload.text);
    try {
      await postNdjson<TalkEvent>(
        "/api/talk",
        { ...payload, stream: true, partner: c.partner, topic: c.topic, level: c.level, style: c.style, history },
        onEvent
      );
    } catch (e) {
      // Javob allaqachon ko'rsatilgan bo'lsa — qolgan qismi (tarjima) kelmay qolgani muhim emas
      if (live() && aiAt < 0) setErr(errText(e));
    } finally {
      idle();
      // Oqim tugadi, ba'zi bo'laklar ovozi kelmadi — ular odatdagidek alohida so'raladi
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
      r = await startRecording({
        keep: true, // quloqchin bilan mikrofon suhbat davomida ochiq; quloqchinsiz — faqat yozuv paytida (javob karnaydan)
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
    if (res.kind === "dead") return setErr(MIC_DEAD_TEXT);
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

  /**
   * Suhbat boshlanishi: mikrofonga ruxsat shu bosishda so'raladi (quloqchin bilan mikrofon suhbat davomida ochiq turadi).
   * Salom AI'siz, darhol (ovozi oldindan tayyor); do'st gapirib bo'lgach — navbat sizda.
   */
  const begin = async () => {
    unlockAudio();
    void warmMic();
    gen.current++;
    const g = gen.current;
    session.current = true;
    const hi = greeting(cfg.current.partner, cfg.current.topic, cfg.current.style);
    const ai: AiMsg = { role: "ai", help: [], ko: hi.ko, rom: romanize(hi.ko), uz: hi.uz, hints: hi.hints };
    commit([ai]);
    setErr("");
    setStarted(true);
    if ((await speak(0, ai)) && g === gen.current) listenAgain();
  };

  /** Suhbatni to'xtatish: ovoz va yozuv to'xtaydi, avtomatik tinglash o'chadi (suhbat qoladi) */
  const endSession = () => {
    session.current = false;
    stopAudio();
    setPlaying(null);
    pauseMic();
    releaseMic();
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
        <Link href="/speak" className="back-link">
          <Icon name="left" size={16} /> AI Ustoz
        </Link>
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
          <br />
          🎙️ Ovozingiz faqat navbatingizda yoziladi. Quloqchinsiz mikrofon faqat yozuv paytida ochiladi — do‘stingiz ovozi baland karnaydan
          eshitiladi; quloqchin bilan mikrofon suhbat davomida ochiq turadi. iPhone’da mikrofon ruxsatini qayta-qayta so‘ramasligi uchun: Safari’da
          «aA» → «Veb-sayt sozlamalari» → Mikrofon → «Ruxsat berish».
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
    <main className="container voice-focus" style={{ maxWidth: 820, paddingTop: 16 }}>
      <div className="card row tk-head" style={{ padding: 12, marginBottom: 16, position: "sticky", top: 74, zIndex: 20 }}>
        <button className="icon-btn sm" onClick={backToSetup} aria-label="Chiqish" title="Chiqish — boshqa suhbatdosh yoki mavzu">
          <Icon name="left" size={18} />
        </button>
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
        <div ref={endRef} className="chat-end" style={{ height: 4 }} />
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
          <button className={`icon-btn sm ${typing ? "on" : ""}`} onClick={() => setTyping((v) => !v)} aria-pressed={typing} aria-label="Yozib yuborish" title="Yozib yuborish">
            <Icon name="pen" size={16} />
          </button>
          <button className="vbar-end" onClick={endSession} aria-label="Suhbatni to‘xtatish">
            <Icon name="phone" size={16} /> <span className="hide-mobile">To‘xtatish</span>
          </button>
        </div>
        {rec ? (
          <div className="rec-hint">Ovozingiz yozilmoqda — koreyscha gapiring, jim tursangiz o‘zi yuboriladi</div>
        ) : (
          <div className="tiny muted" style={{ textAlign: "center", marginTop: 8 }}>
            Bilmagan so‘zingizni o‘zbekcha ayting · quloqchin bilan yaxshiroq ishlaydi
          </div>
        )}
      </div>
    </main>
  );
}
