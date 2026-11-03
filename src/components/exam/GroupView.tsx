"use client";

import { useEffect, useState } from "react";
import type { ExamId, Group, Question, SectionId } from "@/lib/exam";
import { CIRCLED, qKey } from "@/lib/exam";
import { playKorean, prefetchAudio, stopAudio } from "@/lib/audio";
import { ChartView } from "../ChartView";
import { Icon } from "../Icon";
import { Notice, RichKo } from "../ui";
import { Explain } from "./Explain";

/** TOPIK'dagi kabi tinglash soni: TOPIK I — 2 marta; TOPIK II — 1~20 bir marta, 21~50 ikki marta */
export function maxPlays(exam: ExamId, n: number) {
  if (exam === "topik1") return 2;
  return n <= 20 ? 1 : 2;
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
            <div className="scene">{o}</div>
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
}) {
  const [showScript, setShowScript] = useState<Record<string, boolean>>({});
  const listening = section === "listening";

  useEffect(() => {
    if (!listening) return;
    if (group.script) prefetchAudio(group.script);
    group.questions.forEach((q) => q.script && prefetchAudio(q.script));
  }, [group, listening]);

  const scriptBlock = (key: string, text: string, n: number, answered: boolean) => (
    <>
      {!review && <ListenPlayer text={text} max={maxPlays(exam, n)} used={plays[key] ?? 0} onUse={() => onPlay(key)} practice={practice} />}
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
                <Explain group={group} question={q} userAnswer={chosen} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
