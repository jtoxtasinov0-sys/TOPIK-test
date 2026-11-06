"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ExamId, Section, SectionId, Test } from "@/lib/exam";
import { allQuestions, EXAM_INFO, levelFor, nextLevelGap, qKey, scoreSection, sectionMax, SECTION_LABEL } from "@/lib/exam";
import { updateHistory } from "@/lib/store";
import { Icon } from "../Icon";
import { Confetti, ScoreRing, useAiErrorText } from "../ui";
import { GroupView } from "./GroupView";
import { gradeWriting, hasWritingAnswer, type WritingAnswer, type WritingResult, WritingResultView } from "./Writing";

type WState = { status: "idle" | "loading" | "done" | "error" | "empty"; result?: WritingResult; error?: string };

export function computeTotals(exam: ExamId, test: Test, sections: Section[], answers: Record<string, number>, writingScore: number | null) {
  const per: Partial<Record<SectionId, { score: number; max: number; correct?: number; total?: number }>> = {};
  for (const s of sections) {
    if (s.id === "writing") {
      const max = s.writing!.reduce((a, w) => a + w.pts, 0);
      if (writingScore !== null) per.writing = { score: writingScore, max };
    } else {
      const r = scoreSection(s, answers);
      per[s.id] = { score: r.score, max: r.max, correct: r.correct, total: r.total };
    }
  }
  const examMax = EXAM_INFO[exam].max;
  const full = sections.length === test.sections.length;
  const sum = Object.values(per).reduce((a, x) => a + (x?.score ?? 0), 0);
  const sumMax = Object.values(per).reduce((a, x) => a + (x?.max ?? 0), 0);
  let total = sum;
  let estimated = false;
  if (!full || sumMax !== examMax) {
    total = sumMax ? Math.round((sum / sumMax) * examMax) : 0;
    estimated = true;
  }
  return { per, total, max: examMax, estimated, level: levelFor(exam, total) };
}

export function Results({
  test,
  sections: all,
  answers,
  writing,
  mode,
  historyId,
  reached = null,
  onRetry,
  onNewAi,
}: {
  test: Test;
  sections: Section[];
  answers: Record<string, number>;
  writing: Record<number, WritingAnswer>;
  mode: "exam" | "practice";
  historyId: string;
  /** «Tugatish» bilan oldinroq yakunlangan bo'lsa — natija shuncha bo'lim bo'yicha (qolganlari boshlanmagan) */
  reached?: number | null;
  onRetry: () => void;
  onNewAi: () => void;
}) {
  const sections = useMemo(() => (reached === null ? all : all.slice(0, reached)), [all, reached]);
  const skipped = reached === null ? [] : all.slice(reached);
  const early = reached !== null;
  const errText = useAiErrorText();
  const writingSection = sections.find((s) => s.id === "writing");
  const [ws, setWs] = useState<Record<number, WState>>({});
  const started = useRef(false);

  const runGrade = async (n: number) => {
    const task = writingSection?.writing?.find((w) => w.n === n);
    if (!task) return;
    setWs((p) => ({ ...p, [n]: { status: "loading" } }));
    try {
      const result = await gradeWriting(task, writing[n]);
      setWs((p) => ({ ...p, [n]: { status: "done", result } }));
    } catch (e) {
      setWs((p) => ({ ...p, [n]: { status: "error", error: errText(e) } }));
    }
  };

  useEffect(() => {
    if (!writingSection || started.current) return;
    started.current = true;
    const init: Record<number, WState> = {};
    for (const t of writingSection.writing!) init[t.n] = hasWritingAnswer(writing[t.n]) ? { status: "idle" } : { status: "empty" };
    setWs(init);
    for (const t of writingSection.writing!) if (init[t.n].status === "idle") void runGrade(t.n);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const writingDone = writingSection ? writingSection.writing!.every((t) => ["done", "empty"].includes(ws[t.n]?.status ?? "")) : true;
  const writingFailed = writingSection ? writingSection.writing!.some((t) => ws[t.n]?.status === "error") : false;
  const writingScore = writingSection && writingDone ? writingSection.writing!.reduce((a, t) => a + Math.min(t.pts, Math.max(0, ws[t.n]?.result?.score ?? 0)), 0) : null;

  const totals = useMemo(
    () => computeTotals(test.exam, test, writingFailed ? sections.filter((s) => s.id !== "writing") : sections, answers, writingScore),
    [test, sections, answers, writingScore, writingFailed]
  );

  useEffect(() => {
    if (writingSection && !writingDone && !writingFailed) return;
    const secs: Partial<Record<SectionId, { score: number; max: number }>> = {};
    for (const [k, v] of Object.entries(totals.per)) if (v) secs[k as SectionId] = { score: v.score, max: v.max };
    updateHistory(historyId, { sections: secs, total: totals.total, level: totals.level, estimated: totals.estimated });
  }, [totals, historyId, writingSection, writingDone, writingFailed]);

  const answeredOf = (s: Section) => allQuestions(s).filter(({ q }) => answers[qKey(s.id, q.n)]).length;
  const gap = nextLevelGap(test.exam, totals.total);
  const info = EXAM_INFO[test.exam];
  const levelText = totals.level ? info.levelText?.[totals.level] : undefined;
  const objective = sections.filter((s) => s.id !== "writing");
  const [reviewSec, setReviewSec] = useState<SectionId>(objective[0]?.id ?? "listening");
  const [onlyWrong, setOnlyWrong] = useState(true);
  const rs = objective.find((s) => s.id === reviewSec);
  const shownGroups = (rs?.groups ?? []).filter((g) => !onlyWrong || g.questions.some((q) => answers[qKey(rs!.id, q.n)] !== q.answer));
  const pending = writingSection && !writingDone && !writingFailed;

  return (
    <div className="container page">
      <div className="result-hero">
        {totals.level && !pending && <Confetti />}
        <div className="blob b1" style={{ opacity: 0.45 }} />
        <div className="row" style={{ position: "relative", zIndex: 2, gap: 26, flexWrap: "wrap", justifyContent: "center" }}>
          <ScoreRing
            value={pending ? 0 : totals.total}
            max={totals.max}
            size={190}
            label={
              <div className="display" style={{ fontSize: "2.6rem", fontWeight: 700, lineHeight: 1 }}>
                {pending ? <span className="spinner white" /> : totals.total}
              </div>
            }
            sub={<div className="small" style={{ opacity: 0.85, marginTop: 4 }}>/ {totals.max}</div>}
          />
          <div style={{ minWidth: 240, flex: 1 }}>
            <div className="row-wrap" style={{ gap: 8 }}>
              <div className="badge white">
                {test.title} · {mode === "exam" ? "Imtihon rejimi" : "Mashq rejimi"}
              </div>
              {early && <div className="badge white">⏹️ Muddatidan oldin tugatildi</div>}
            </div>
            <h1 className="h1" style={{ marginTop: 12, fontSize: "clamp(2rem,6vw,3.2rem)" }}>
              {pending ? "Yozma ish tekshirilmoqda…" : totals.level ? <span className="kr">{totals.level}</span> : info.levelText ? "Minimal ball yetmadi" : "Daraja yo‘q"}
            </h1>
            <p className="lead" style={{ color: "rgba(255,255,255,.88)", marginTop: 8 }}>
              {pending
                ? "AI daftaringizdagi javoblarni o‘qib, TOPIK mezonlari bo‘yicha baholamoqda."
                : levelText
                  ? `Tabriklaymiz! ${info.name}: ${levelText}. Haqiqiy tanlovda ball qancha yuqori bo‘lsa, imkoniyat shuncha katta.`
                  : totals.level
                    ? `Tabriklaymiz! Sizning taxminiy darajangiz — ${totals.level}.`
                    : info.levelText
                      ? `${info.name}: boshqa sohalar uchun kamida 45, ishlab chiqarish uchun 60 ball kerak. Xatolarni tahlil qilib, yana urinib ko‘ring!`
                      : "Hozircha daraja uchun ball yetmadi — lekin bu boshlanish! Xatolarni tahlil qiling."}
            </p>
            {!pending && gap && (
              <div className="badge white" style={{ marginTop: 10 }}>
                🎯 {`${gap.level} uchun yana ${gap.need} ball kerak`}
              </div>
            )}
            {totals.estimated && !pending && (
              <div className="tiny" style={{ marginTop: 10, opacity: 0.85 }}>
                *{" "}
                {writingFailed
                  ? "Yozma ish baholanmadi — umumiy ball 듣기+읽기 asosida taxminiy hisoblandi."
                  : skipped.length
                    ? "Test oxirigacha ishlanmadi — umumiy ball faqat ishlangan bo‘limlar asosida taxminiy hisoblandi."
                    : "Faqat ayrim bo‘limlar topshirildi — umumiy ball taxminiy."}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid-3" style={{ marginTop: 20 }}>
        {sections.map((s) => {
          const r = totals.per[s.id];
          const lab = SECTION_LABEL[s.id];
          return (
            <div className="card" key={s.id}>
              <div className="row between">
                <div className="row">
                  <span className="icon-tile" style={{ width: 44, height: 44, fontSize: "1.2rem" }}>
                    {lab.icon}
                  </span>
                  <div>
                    <div className="kr" style={{ fontWeight: 800 }}>{lab.ko}</div>
                    <div className="tiny muted">{lab.uz}</div>
                  </div>
                </div>
                <div className="display" style={{ fontSize: "1.3rem", fontWeight: 700 }}>
                  {r ? r.score : s.id === "writing" && pending ? <span className="spinner" /> : "—"}
                  <span className="muted small"> / {s.id === "writing" ? s.writing!.reduce((a, w) => a + w.pts, 0) : r?.max}</span>
                </div>
              </div>
              <div className="bar" style={{ marginTop: 14 }}>
                <i style={{ width: `${r ? (r.score / r.max) * 100 : 0}%` }} />
              </div>
              {r?.total !== undefined && (
                <div className="small muted" style={{ marginTop: 8 }}>
                  {`${r.correct} / ${r.total} ta to‘g‘ri javob`}
                  {early && answeredOf(s) < r.total && ` · ${r.total - answeredOf(s)} ta javobsiz`}
                </div>
              )}
            </div>
          );
        })}
        {skipped.map((s) => {
          const lab = SECTION_LABEL[s.id];
          return (
            <div className="card" key={s.id} style={{ opacity: 0.6 }}>
              <div className="row between">
                <div className="row">
                  <span className="icon-tile" style={{ width: 44, height: 44, fontSize: "1.2rem" }}>
                    {lab.icon}
                  </span>
                  <div>
                    <div className="kr" style={{ fontWeight: 800 }}>{lab.ko}</div>
                    <div className="tiny muted">{lab.uz}</div>
                  </div>
                </div>
                <div className="display" style={{ fontSize: "1.3rem", fontWeight: 700 }}>
                  —<span className="muted small"> / {sectionMax(s)}</span>
                </div>
              </div>
              <div className="bar" style={{ marginTop: 14 }}>
                <i style={{ width: 0 }} />
              </div>
              <div className="small muted" style={{ marginTop: 8 }}>
                Boshlanmagan — natijaga kirmadi
              </div>
            </div>
          );
        })}
      </div>

      <div className="row-wrap" style={{ marginTop: 18 }}>
        <button className="btn btn-primary" onClick={onRetry}>
          <Icon name="replay" size={18} /> Qayta topshirish
        </button>
        <button className="btn" onClick={onNewAi}>
          <Icon name="spark" size={18} /> AI yangi variant
        </button>
        <Link className="btn btn-ghost" href="/progress">
          <Icon name="chart" size={18} /> Natijalarim
        </Link>
      </div>

      {writingSection && (
        <section style={{ marginTop: 34 }}>
          <h2 className="h2" style={{ marginBottom: 14 }}>
            ✍️ Yozma ish natijalari
          </h2>
          <div className="stack">
            {writingSection.writing!.map((t) => {
              const st = ws[t.n];
              if (!st || st.status === "empty")
                return (
                  <div key={t.n} className="card flat row">
                    <b>{t.n}.</b> <span className="muted">Javob berilmagan — 0 ball</span>
                  </div>
                );
              if (st.status === "loading" || st.status === "idle")
                return (
                  <div key={t.n} className="card row">
                    <span className="spinner" />
                    <b>{t.n}.</b> AI tekshirmoqda… (20–40 soniya)
                  </div>
                );
              if (st.status === "error")
                return (
                  <div key={t.n} className="card stack">
                    <div className="callout">
                      {t.n}. {st.error}
                    </div>
                    <button className="btn btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => runGrade(t.n)}>
                      <Icon name="replay" size={16} /> Qayta urinish
                    </button>
                  </div>
                );
              return <WritingResultView key={t.n} task={t} result={st.result!} />;
            })}
          </div>
        </section>
      )}

      {objective.length > 0 && (
        <section style={{ marginTop: 34 }}>
          <div className="row between" style={{ flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
            <h2 className="h2">🔎 Tahlil</h2>
            <div className="row-wrap">
              {objective.length > 1 && (
                <div className="seg">
                  {objective.map((s) => (
                    <button key={s.id} className={reviewSec === s.id ? "on" : ""} onClick={() => setReviewSec(s.id)}>
                      {SECTION_LABEL[s.id].icon} <span className="kr">{SECTION_LABEL[s.id].ko}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="seg">
                <button className={onlyWrong ? "on" : ""} onClick={() => setOnlyWrong(true)}>
                  Xatolar
                </button>
                <button className={!onlyWrong ? "on" : ""} onClick={() => setOnlyWrong(false)}>
                  Hammasi
                </button>
              </div>
            </div>
          </div>
          <div className="stack">
            {rs && shownGroups.length === 0 && <div className="card empty">🎉 Bu bo‘limda xato yo‘q!</div>}
            {rs &&
              shownGroups.map((g) => (
                <GroupView key={`${rs.id}-${g.from}`} exam={test.exam} section={rs.id} group={g} answers={answers} onAnswer={() => {}} plays={{}} onPlay={() => {}} practice review />
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
