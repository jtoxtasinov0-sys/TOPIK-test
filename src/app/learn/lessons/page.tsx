"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { SpeakBtn } from "@/components/ui";
import { LESSONS, type Lesson } from "@/data/lessons";
import { playKorean } from "@/lib/audio";
import { useLang } from "@/lib/i18n";
import { touchStreak } from "@/lib/store";

function MiniQuiz({ lesson }: { lesson: Lesson }) {
  const { L, lang } = useLang();
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [ok, setOk] = useState(0);
  const [order] = useState<number[]>(() => lesson.phrases.map((_, i) => i).sort((a, b) => ((a * 5 + 3) % 7) - ((b * 5 + 3) % 7)));

  if (!order.length) return null;
  if (idx >= order.length)
    return (
      <div className="card center stack" style={{ alignItems: "center" }}>
        <div style={{ fontSize: "2.4rem" }}>{ok === order.length ? "🏆" : "👏"}</div>
        <b>
          {ok} / {order.length} {L("to‘g‘ri", "верно")}
        </b>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            setIdx(0);
            setOk(0);
            setPicked(null);
          }}
        >
          <Icon name="replay" size={16} /> {L("Qayta", "Заново")}
        </button>
      </div>
    );

  const p = lesson.phrases[order[idx]];
  const meaning = (i: number) => (lang === "ru" ? lesson.phrases[i].ru : lesson.phrases[i].uz);
  const opts = [order[idx], ...order.filter((x) => x !== order[idx]).slice(0, 3)].sort((a, b) => ((a * 7 + idx) % 5) - ((b * 7 + idx) % 5));

  return (
    <div className="card stack">
      <div className="row between">
        <b className="small">🎯 {L("Mini test", "Мини-тест")}</b>
        <span className="badge">
          {idx + 1} / {order.length}
        </span>
      </div>
      <div className="row">
        <span className="kr" style={{ fontSize: "1.4rem", fontWeight: 800 }}>{p.ko}</span>
        <SpeakBtn text={p.ko} opts={{ slow: true }} />
      </div>
      <div className="options">
        {opts.map((i) => {
          let cls = "option";
          if (picked !== null) cls += i === order[idx] ? " ok" : i === picked ? " bad" : "";
          return (
            <button
              key={i}
              className={cls}
              style={{ fontFamily: "var(--font-body)" }}
              disabled={picked !== null}
              onClick={() => {
                setPicked(i);
                if (i === order[idx]) setOk((x) => x + 1);
                touchStreak();
              }}
            >
              {meaning(i)}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <button
          className="btn btn-primary btn-sm"
          style={{ alignSelf: "flex-end" }}
          onClick={() => {
            setIdx((x) => x + 1);
            setPicked(null);
          }}
        >
          {L("Keyingisi", "Дальше")} <Icon name="right" size={16} />
        </button>
      )}
    </div>
  );
}

export default function LessonsPage() {
  const { L, tr, lang } = useLang();
  const [sel, setSel] = useState<Lesson>(LESSONS[0]);

  useEffect(() => {
    const h = window.location.hash.slice(1);
    const found = LESSONS.find((l) => l.id === h);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (found) setSel(found);
  }, []);

  const playAll = async () => {
    for (const p of sel.phrases) await playKorean(p.ko, { slow: true });
  };

  return (
    <main className="container page">
      <Link href="/learn" className="btn btn-ghost btn-sm" style={{ paddingLeft: 6, marginBottom: 10 }}>
        <Icon name="left" size={18} /> {L("O‘rganish", "Обучение")}
      </Link>
      <div className="scroll-x" style={{ marginBottom: 18 }}>
        {LESSONS.map((l, i) => (
          <button
            key={l.id}
            className={`scenario ${sel.id === l.id ? "on" : ""}`}
            style={{ width: 150 }}
            onClick={() => {
              setSel(l);
              history.replaceState(null, "", `#${l.id}`);
            }}
          >
            <span className="em">{l.emoji}</span>
            <b className="small">
              {i + 1}. {tr(l.title)}
            </b>
            <span className="kr tiny" style={{ opacity: 0.75 }}>{l.ko}</span>
          </button>
        ))}
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="card stack">
          <div className="row between">
            <h2 className="h2">
              {sel.emoji} {tr(sel.title)}
            </h2>
            <button className="btn btn-soft btn-sm" onClick={playAll}>
              <Icon name="play" size={14} fill /> {L("Hammasini tinglash", "Слушать всё")}
            </button>
          </div>
          {sel.phrases.map((p) => (
            <div key={p.ko} className="row" style={{ padding: "12px 0", borderBottom: "1px dashed var(--line)", alignItems: "flex-start" }}>
              <div className="grow">
                <div className="kr" style={{ fontWeight: 800, fontSize: "1.12rem" }}>{p.ko}</div>
                <div className="tiny muted" style={{ fontStyle: "italic" }}>{p.rom}</div>
                <div className="small" style={{ marginTop: 2 }}>{lang === "ru" ? p.ru : p.uz}</div>
              </div>
              <SpeakBtn text={p.ko} opts={{ slow: true }} />
            </div>
          ))}
        </div>
        <div className="stack">
          <div className="level-card violet">
            <div className="small" style={{ fontWeight: 800, opacity: 0.9 }}>📐 {L("Grammatika", "Грамматика")}</div>
            <div style={{ marginTop: 8, lineHeight: 1.6 }} className="kr">
              {tr(sel.grammar)}
            </div>
          </div>
          <MiniQuiz key={sel.id} lesson={sel} />
          <Link href="/speak" className="card hover row">
            <span className="icon-tile pink">🗣️</span>
            <div className="grow">
              <b>{L("Endi gapirib ko‘ring", "Теперь попробуйте сказать")}</b>
              <div className="small muted">{L("AI bilan shu mavzuda suhbat", "Разговор с AI на эту тему")}</div>
            </div>
            <Icon name="right" size={18} />
          </Link>
        </div>
      </div>
    </main>
  );
}
