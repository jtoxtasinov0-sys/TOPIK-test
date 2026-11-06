"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import type { ExamId, Group, ListenItem, Question, SectionId } from "@/lib/exam";
import { answerSeconds, CIRCLED, listenItems, maxPlays, qKey } from "@/lib/exam";
import { playExamAudio, playKorean, prefetchAudio, stopAudio, unlockAudio, unlockSpeech } from "@/lib/audio";
import { ChartView } from "../ChartView";
import { Icon } from "../Icon";
import { Notice, RichKo } from "../ui";
import { Explain } from "./Explain";
import { GenImage, SafetySign } from "./GenImage";

export { maxPlays };

/** Sahifa ochilgach audio boshlanguncha (savolni ko'z yugurtirib chiqish uchun) */
const LEAD_MS = 1500;
/** Ikki eshittirish orasidagi tanaffus */
const REPEAT_MS = 2500;

type Stage = "load" | "play" | "again" | "answer" | "blocked";
type AutoNow = { key: string; stage: Stage; round: number; left: number };

/**
 * Imtihon rejimi: sahifadagi audiolar haqiqiy imtihondagidek o'zi, ketma-ket o'ynaydi —
 * har biri belgilangan marta (1 yoki 2), orasida tanaffus, keyin javob uchun vaqt. To'xtatib bo'lmaydi.
 * Shu sahifada audio eshittirilgan bo'lsa, oxirida onDone() — keyingi sahifaga o'tiladi.
 * onBusy(true) — sahifada hali eshittirilmagan audio bor (boshqa sahifaga o'tsa, qayta eshita olmaydi).
 */
function useExamAudio(
  enabled: boolean,
  items: ListenItem[],
  plays: Record<string, number>,
  onPlay: (key: string) => void,
  onDone: () => void,
  onBusy: (busy: boolean) => void
) {
  const [now, setNow] = useState<AutoNow | null>(null);
  const [attempt, setAttempt] = useState(0);
  const used = useRef<Record<string, number> | null>(null);
  const played = useRef(false);
  const play = useEffectEvent(onPlay);
  const done = useEffectEvent(onDone);
  const busy = useEffectEvent(onBusy);
  const startPlays = useEffectEvent(() => plays);

  useEffect(() => {
    if (!enabled || !items.length) return;
    // Necha marta eshittirilgani — sahifa ochilgandagi holatdan (qayta kirsa, eshittirilgani qaytarilmaydi)
    if (!used.current) used.current = Object.fromEntries(items.map((it) => [it.key, startPlays()[it.key] ?? 0]));
    const u = used.current;
    const remaining = () => items.some((it) => (u[it.key] ?? 0) < it.max);
    let alive = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const sleep = (ms: number) => new Promise<void>((r) => timers.push(setTimeout(r, ms)));

    const run = async () => {
      if (!remaining()) return; // bu sahifa audiosi avval eshittirilgan
      busy(true);
      await sleep(attempt ? 300 : LEAD_MS);
      if (!alive) return;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if ((u[it.key] ?? 0) >= it.max) continue;
        // Keyingi savol audiosi boshlanganda — o'sha savolni ko'rsatamiz
        if (i > 0 && it.questions.length === 1)
          document.getElementById(`q-${it.key}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        while ((u[it.key] ?? 0) < it.max) {
          const round = (u[it.key] ?? 0) + 1;
          setNow({ key: it.key, stage: "load", round, left: 0 });
          let started = false;
          const r = await playExamAudio(it.text, {
            onStart: () => {
              if (started) return;
              started = true;
              u[it.key] = round;
              played.current = true;
              play(it.key);
              setNow({ key: it.key, stage: "play", round, left: 0 });
            },
          });
          if (!alive || r === "stopped") return;
          if (r === "failed") {
            // Ovoz chiqmadi — bu eshittirish hisoblanmaydi, foydalanuvchi bosib qayta boshlaydi
            if (started) u[it.key] = round - 1;
            setNow({ key: it.key, stage: "blocked", round, left: 0 });
            return;
          }
          if ((u[it.key] ?? 0) < it.max) {
            setNow({ key: it.key, stage: "again", round, left: 0 });
            await sleep(REPEAT_MS);
            if (!alive) return;
          }
        }
        if (!remaining()) busy(false);
        for (let s = answerSeconds(it); s > 0; s--) {
          setNow({ key: it.key, stage: "answer", round: it.max, left: s });
          await sleep(1000);
          if (!alive) return;
        }
      }
      setNow(null);
      if (played.current) done();
    };
    void run();
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
      stopAudio();
      busy(false);
    };
  }, [enabled, items, attempt]);

  const retry = () => {
    unlockAudio();
    unlockSpeech();
    setNow(null);
    setAttempt((a) => a + 1);
  };
  return { now, retry };
}

/** Imtihon rejimidagi pleer: tugmasi yo'q — audio o'zi boshlanadi va oxirigacha o'ynaydi */
function ExamListen({ item, used, now, onRetry }: { item: ListenItem; used: number; now: AutoNow | null; onRetry: () => void }) {
  const mine = now?.key === item.key ? now : null;
  const stage = mine?.stage;
  const heard = Math.min(item.max, used);
  const title =
    stage === "load"
      ? "Audio tayyorlanmoqda…"
      : stage === "play"
        ? item.max > 1
          ? `Tinglang… (${mine!.round}-marta)`
          : "Tinglang…"
        : stage === "again"
          ? "Yana bir marta eshittiriladi…"
          : stage === "answer"
            ? `Javobni belgilang · ${mine!.left} s`
            : stage === "blocked"
              ? "Ovoz o‘ynamadi — boshlash uchun bosing"
              : heard >= item.max
                ? "Audio eshittirildi"
                : "Audio o‘zi boshlanadi…";
  return (
    <div className={`player exam ${stage === "answer" || (!mine && heard >= item.max) ? "over" : ""}`}>
      {stage === "blocked" ? (
        <button className="play" onClick={onRetry} aria-label="Tinglash">
          <Icon name="play" size={22} fill />
        </button>
      ) : (
        <span className="play" aria-hidden>
          {stage === "load" ? <span className="spinner" /> : <Icon name={stage === "answer" ? "pen" : heard >= item.max && !mine ? "check" : "volume"} size={22} />}
        </span>
      )}
      <div className="grow" aria-live="polite">
        <div style={{ fontWeight: 800, fontSize: "0.92rem" }}>{title}</div>
        <div className="tiny" style={{ opacity: 0.75 }}>
          {`Imtihon rejimi: audio ${item.max} marta o‘zi eshittiriladi, to‘xtatib bo‘lmaydi · ${heard}/${item.max}`}
        </div>
      </div>
      <div className={`eq ${stage === "play" ? "on" : ""}`} aria-hidden>
        {Array.from({ length: 9 }).map((_, i) => (
          <i key={i} />
        ))}
      </div>
    </div>
  );
}

export function ListenPlayer({ text, max, used, onUse, practice }: { text: string; max: number; used: number; onUse: () => void; practice: boolean }) {
  const [st, setSt] = useState<"idle" | "load" | "play">("idle");
  const [slow, setSlow] = useState(false);
  const left = Math.max(0, max - used);
  const can = practice || left > 0;

  useEffect(() => () => stopAudio(), []);

  const toggle = async () => {
    if (st !== "idle") {
      stopAudio();
      setSt("idle");
      return;
    }
    if (!can) return;
    onUse();
    await playKorean(text, { slow, onLoading: (b) => setSt(b ? "load" : "play"), onStart: () => setSt("play") });
    setSt("idle");
  };

  return (
    <div className="player">
      <button className="play" onClick={toggle} disabled={!can && st === "idle"} aria-label="Tinglash">
        {st === "load" ? <span className="spinner" /> : <Icon name={st === "play" ? "pause" : "play"} size={22} fill={st !== "play"} />}
      </button>
      <div className="grow">
        <div style={{ fontWeight: 800, fontSize: "0.92rem" }}>
          {st === "load" ? "Audio tayyorlanmoqda…" : st === "play" ? "Tinglang…" : "Audioni tinglang"}
        </div>
        <div className="tiny" style={{ opacity: 0.75 }}>
          {practice ? "Mashq rejimi: cheksiz tinglash" : `Qolgan tinglash: ${left} / ${max}`}
        </div>
      </div>
      <div className={`eq ${st === "play" ? "on" : ""}`} aria-hidden>
        {Array.from({ length: 9 }).map((_, i) => (
          <i key={i} />
        ))}
      </div>
      {practice && (
        <button
          className="chip"
          style={{ background: slow ? "#fff" : "rgba(255,255,255,.14)", color: slow ? "var(--p1)" : "#fff", borderColor: "rgba(255,255,255,.3)", padding: "6px 10px" }}
          onClick={() => setSlow((s) => !s)}
        >
          🐢 Sekin
        </button>
      )}
    </div>
  );
}

function Options({ q, chosen, onPick, reveal }: { q: Question; chosen?: number; onPick: (i: number) => void; reveal: boolean }) {
  const cls = (i: number) => {
    const n = i + 1;
    if (reveal) {
      if (n === q.answer) return "option ok";
      if (n === chosen) return "option bad";
      return "option";
    }
    return n === chosen ? "option sel" : "option";
  };

  if (q.optionStyle === "picture")
    return (
      <div className="options pics">
        {q.options.map((o, i) => (
          <button key={i} className={`${cls(i)} pic`} onClick={() => onPick(i + 1)} disabled={reveal}>
            <span className="mark">{i + 1}</span>
            {q.optionImages?.[i]?.trim() ? <GenImage key={q.optionImages[i]} prompt={q.optionImages[i]} fallback={o} /> : <div className="scene">{o}</div>}
          </button>
        ))}
      </div>
    );

  if (q.optionStyle === "chart" && q.optionCharts)
    return (
      <div className="options pics charts">
        {q.optionCharts.map((c, i) => (
          <button key={i} className={`${cls(i)} chart`} onClick={() => onPick(i + 1)} disabled={reveal}>
            <span className="mark">{i + 1}</span>
            <ChartView chart={c} compact />
          </button>
        ))}
      </div>
    );

  const short = q.options.every((o) => o.length <= 10);
  return (
    <div className={`options ${short ? "two" : ""}`}>
      {q.options.map((o, i) => (
        <button key={i} className={cls(i)} onClick={() => onPick(i + 1)} disabled={reveal}>
          <span className="mark">{reveal && i + 1 === q.answer ? "✓" : reveal && i + 1 === chosen ? "✗" : i + 1}</span>
          <span>{o}</span>
        </button>
      ))}
    </div>
  );
}

export function GroupView({
  exam,
  section,
  group,
  answers,
  onAnswer,
  plays,
  onPlay,
  practice,
  review,
  onAudioDone,
  onAudioBusy,
}: {
  exam: ExamId;
  section: SectionId;
  group: Group;
  answers: Record<string, number>;
  onAnswer: (n: number, choice: number) => void;
  plays: Record<string, number>;
  onPlay: (key: string) => void;
  practice: boolean;
  review?: boolean;
  /** Imtihon rejimi: sahifadagi audio va javob vaqti tugadi */
  onAudioDone?: () => void;
  /** Imtihon rejimi: sahifada hali eshittirilmagan audio bormi */
  onAudioBusy?: (busy: boolean) => void;
}) {
  const [showScript, setShowScript] = useState<Record<string, boolean>>({});
  const listening = section === "listening";
  // Imtihon rejimida tinglash — haqiqiy imtihondagidek o'zi o'ynaydi, pauza yo'q
  const auto = listening && !practice && !review;
  const items = useMemo(() => (listening ? listenItems(exam, section, group) : []), [exam, section, group, listening]);
  const examAudio = useExamAudio(auto, items, plays, onPlay, () => onAudioDone?.(), (b) => onAudioBusy?.(b));

  useEffect(() => {
    if (!listening) return;
    if (group.script) prefetchAudio(group.script);
    group.questions.forEach((q) => q.script && prefetchAudio(q.script));
  }, [group, listening]);

  const scriptBlock = (key: string, text: string, n: number, answered: boolean) => (
    <>
      {!review &&
        (auto ? (
          <ExamListen item={items.find((it) => it.key === key) ?? { key, text, max: maxPlays(exam, n), questions: [n] }} used={plays[key] ?? 0} now={examAudio.now} onRetry={examAudio.retry} />
        ) : (
          <ListenPlayer text={text} max={maxPlays(exam, n)} used={plays[key] ?? 0} onUse={() => onPlay(key)} practice={practice} />
        ))}
      {(review || (practice && answered)) && (
        <>
          <button className="btn btn-ghost btn-sm" style={{ marginBottom: 8, paddingLeft: 6 }} onClick={() => setShowScript((s) => ({ ...s, [key]: !s[key] }))}>
            <Icon name="eye" size={16} /> {showScript[key] ? "Matnni yashirish" : "Audio matnini ko‘rish"}
          </button>
          {showScript[key] && <div className="script-box">{text}</div>}
        </>
      )}
    </>
  );

  const groupAnswered = group.questions.every((q) => answers[qKey(section, q.n)]);

  return (
    <div className="paper">
      <p className="instruction">{group.instruction}</p>
      {group.example && <div className="boki">{group.example}</div>}
      {group.script && scriptBlock(`${section}-g${group.from}`, group.script, group.from, groupAnswered)}
      {group.notice && <Notice notice={group.notice} />}
      {group.chart && (
        <div className="card flat" style={{ padding: 12, marginBottom: 16 }}>
          <ChartView chart={group.chart} />
        </div>
      )}
      {group.passage && (
        <div className="passage">
          <RichKo text={group.passage} />
        </div>
      )}
      {group.given && (
        <div className="given">
          <span className="tiny muted" style={{ fontWeight: 800 }}>
            &lt;보기&gt;
          </span>
          <div>{group.given}</div>
        </div>
      )}

      {group.questions.map((q) => {
        const k = qKey(section, q.n);
        const chosen = answers[k];
        const reveal = review || (practice && !!chosen);
        return (
          <div className="q" key={q.n} id={`q-${k}`}>
            <div className="q-head">
              <span className="q-num">{q.n}.</span>
              <span>{q.prompt ?? ""}</span>
              {reveal && (
                <span className={`badge ${chosen === q.answer ? "green" : "red"}`} style={{ marginLeft: "auto" }}>
                  {chosen === q.answer ? "To‘g‘ri" : chosen ? "Xato" : "Javobsiz"}
                </span>
              )}
            </div>
            {q.script && scriptBlock(k, q.script, q.n, !!chosen)}
            {q.sign ? (
              <SafetySign sign={q.sign} />
            ) : q.pictureImage?.trim() ? (
              <div className="q-picture img">
                <GenImage key={q.pictureImage} prompt={q.pictureImage} fallback={q.picture} big />
              </div>
            ) : (
              q.picture && (
                <div className="q-picture" role="img" aria-label="Rasm">
                  {q.picture}
                </div>
              )
            )}
            {q.notice && <Notice notice={q.notice} />}
            {q.chart && (
              <div className="card flat" style={{ padding: 12, marginBottom: 14 }}>
                <ChartView chart={q.chart} />
              </div>
            )}
            {q.passage && (
              <div className="passage">
                <RichKo text={q.passage} />
              </div>
            )}
            {q.given && (
              <div className="given">
                <span className="tiny muted" style={{ fontWeight: 800 }}>
                  &lt;보기&gt;
                </span>
                <div>{q.given}</div>
              </div>
            )}
            <Options q={q} chosen={chosen} onPick={(i) => !reveal && onAnswer(q.n, i)} reveal={reveal} />
            {reveal && (
              <div style={{ marginTop: 12 }}>
                {chosen !== q.answer && (
                  <div className="small" style={{ marginBottom: 8 }}>
                    To‘g‘ri javob: <b className="kr">{CIRCLED[q.answer - 1]} {q.optionStyle === "chart" ? "" : q.options[q.answer - 1]}</b>
                  </div>
                )}
                <Explain group={group} question={q} userAnswer={chosen} exam={exam} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
