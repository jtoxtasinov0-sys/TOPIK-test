"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ExamId, Group, Section, SectionId, Test, WritingTask } from "@/lib/exam";
import { allQuestions, EXAM_INFO, formatTime, qKey, SECTION_LABEL } from "@/lib/exam";
import { prefetchAudio, stopAudio } from "@/lib/audio";
import { addHistory, KEYS, load, remove, save, saveAiTest, uid, useStored } from "@/lib/store";
import { TOPIK1 } from "@/data/topik1";
import { TOPIK2 } from "@/data/topik2";
import { Icon } from "../Icon";
import { ApiError, postJson, useAiErrorText } from "../ui";
import { GroupView } from "./GroupView";
import { Results } from "./Results";
import { emptyWriting, gradeWriting, hasWritingAnswer, type WritingAnswer, type WritingResult, WritingResultView, WritingTaskView } from "./Writing";

type Phase = "intro" | "generating" | "run" | "break" | "results";
type Mode = "exam" | "practice";
type Scope = "all" | SectionId;

type Saved = {
  testId: string;
  mode: Mode;
  scope: Scope;
  secIdx: number;
  groupIdx: number;
  answers: Record<string, number>;
  writing: Record<number, Omit<WritingAnswer, "images">>;
  timeLeft: number;
  plays: Record<string, number>;
  at: number;
};

const BUILTIN: Record<ExamId, Test> = { topik1: TOPIK1, topik2: TOPIK2 };
const GRACE_SECONDS = 180;

export function ExamRunner({ exam, preset }: { exam: ExamId; preset?: SectionId }) {
  const errText = useAiErrorText();
  const [aiTests, , aiReady] = useStored<Test[]>(KEYS.aiTests, []);
  const [test, setTest] = useState<Test>(BUILTIN[exam]);
  const [phase, setPhase] = useState<Phase>("intro");
  const [mode, setMode] = useState<Mode>("exam");
  const [scope, setScope] = useState<Scope>(preset ?? "all");
  const [secIdx, setSecIdx] = useState(0);
  const [groupIdx, setGroupIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [writing, setWriting] = useState<Record<number, WritingAnswer>>({});
  const [plays, setPlays] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [grace, setGrace] = useState<number | null>(null);
  const [omrOpen, setOmrOpen] = useState(false);
  const [historyId, setHistoryId] = useState("");
  const [gen, setGen] = useState({ done: 0, total: 0, failed: 0 });
  const [genError, setGenError] = useState("");
  const [saved, setSaved] = useState<Saved | null>(null);
  const [wGrade, setWGrade] = useState<Record<number, { loading?: boolean; result?: WritingResult; error?: string }>>({});
  const topRef = useRef<HTMLDivElement>(null);

  const ourAi = useMemo(() => aiTests.filter((t) => t.exam === exam), [aiTests, exam]);
  const sections: Section[] = useMemo(() => (scope === "all" ? test.sections : test.sections.filter((s) => s.id === scope)), [test, scope]);
  const section = sections[secIdx];
  const practice = mode === "practice";
  const groups = useMemo(() => section?.groups ?? [], [section]);
  const tasks = useMemo(() => section?.writing ?? [], [section]);
  const pageCount = section?.writing ? tasks.length : groups.length;
  const examName = EXAM_INFO[exam].name;

  // Saqlangan (tugallanmagan) urinishni topish
  useEffect(() => {
    const s = load<Saved | null>(KEYS.attempt(exam), null);
    if (s && Date.now() - s.at < 3 * 86400000) setSaved(s);
  }, [exam]);

  // Imtihon paytida menyuni yashirish
  useEffect(() => {
    const on = phase === "run" || phase === "break" || phase === "generating";
    document.body.classList.toggle("exam-mode", on);
    return () => document.body.classList.remove("exam-mode");
  }, [phase]);

  // Sahifadan chiqib ketishda ogohlantirish
  useEffect(() => {
    if (phase !== "run") return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [phase]);

  // Taymer
  useEffect(() => {
    if (phase !== "run") return;
    const t = setInterval(() => {
      if (practice) setElapsed((e) => e + 1);
      else if (grace !== null) setGrace((g) => (g === null ? null : g - 1));
      else setTimeLeft((x) => x - 1);
    }, 1000);
    return () => clearInterval(t);
  }, [phase, practice, grace]);

  // Progressni saqlash (har 5 soniyada va javob o'zgarganda)
  useEffect(() => {
    if (phase !== "run") return;
    const data: Saved = {
      testId: test.id,
      mode,
      scope,
      secIdx,
      groupIdx,
      answers,
      writing: Object.fromEntries(Object.entries(writing).map(([k, v]) => [k, { mode: v.mode, text: v.text, a: v.a, b: v.b }])),
      timeLeft,
      plays,
      at: Date.now(),
    };
    save(KEYS.attempt(exam), data);
    // timeLeft har soniyada o'zgaradi — faqat 5 soniyada bir saqlaymiz
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, answers, writing, secIdx, groupIdx, plays, Math.floor(timeLeft / 5)]);

  const scrollTop = () => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const startSection = useCallback(
    (idx: number, keepTime?: number) => {
      stopAudio();
      setSecIdx(idx);
      setGroupIdx(0);
      setGrace(null);
      setTimeLeft(keepTime ?? sections[idx].minutes * 60);
      setPhase("run");
      window.scrollTo({ top: 0 });
    },
    [sections]
  );

  const begin = (t: Test = test) => {
    setTest(t);
    setAnswers({});
    setWriting({});
    setPlays({});
    setElapsed(0);
    setWGrade({});
    remove(KEYS.attempt(exam));
    setSaved(null);
    stopAudio();
    setSecIdx(0);
    setGroupIdx(0);
    setGrace(null);
    const secs = scope === "all" ? t.sections : t.sections.filter((s) => s.id === scope);
    setTimeLeft(secs[0].minutes * 60);
    setPhase("run");
    window.scrollTo({ top: 0 });
  };

  const resume = () => {
    if (!saved) return;
    const t = saved.testId === BUILTIN[exam].id ? BUILTIN[exam] : ourAi.find((x) => x.id === saved.testId);
    if (!t) {
      remove(KEYS.attempt(exam));
      setSaved(null);
      return;
    }
    setTest(t);
    setMode(saved.mode);
    setScope(saved.scope);
    setAnswers(saved.answers);
    setWriting(Object.fromEntries(Object.entries(saved.writing).map(([k, v]) => [k, { ...v, images: [] }])));
    setPlays(saved.plays);
    setSecIdx(saved.secIdx);
    setGroupIdx(saved.groupIdx);
    setTimeLeft(saved.timeLeft);
    setGrace(null);
    setPhase("run");
  };

  const finish = useCallback(() => {
    stopAudio();
    const id = uid();
    setHistoryId(id);
    addHistory({
      id,
      testId: test.id,
      exam,
      title: test.title,
      date: Date.now(),
      mode,
      sections: {},
      total: 0,
      max: EXAM_INFO[exam].max,
      level: null,
      estimated: true,
    });
    remove(KEYS.attempt(exam));
    setPhase("results");
    window.scrollTo({ top: 0 });
  }, [test, exam, mode]);

  const nextSection = useCallback(() => {
    stopAudio();
    if (secIdx + 1 < sections.length) {
      setPhase("break");
      window.scrollTo({ top: 0 });
    } else finish();
  }, [secIdx, sections.length, finish]);

  // Vaqt tugaganda
  useEffect(() => {
    if (phase !== "run" || practice) return;
    if (grace === null && timeLeft <= 0) {
      if (section?.id === "writing") setGrace(GRACE_SECONDS);
      else nextSection();
    }
    if (grace !== null && grace <= 0) {
      setGrace(null);
      nextSection();
    }
  }, [timeLeft, grace, phase, practice, section, nextSection]);

  // Keyingi guruh audiosini oldindan yuklash
  useEffect(() => {
    if (phase !== "run" || section?.id !== "listening") return;
    const g = groups[groupIdx + 1];
    if (!g) return;
    if (g.script) prefetchAudio(g.script);
    g.questions.forEach((q) => q.script && prefetchAudio(q.script));
  }, [phase, section, groups, groupIdx]);

  // ---------- AI yangi variant yaratish ----------
  const generate = async () => {
    setGenError("");
    const base = BUILTIN[exam];
    const jobs: { kind: "g" | "w"; si: number; gi: number }[] = [];
    base.sections.forEach((s, si) => {
      s.groups?.forEach((_, gi) => jobs.push({ kind: "g", si, gi }));
      s.writing?.forEach((_, gi) => jobs.push({ kind: "w", si, gi }));
    });
    setGen({ done: 0, total: jobs.length, failed: 0 });
    setPhase("generating");
    const out: Test = JSON.parse(JSON.stringify(base));
    out.id = `ai-${exam}-${uid()}`;
    out.ai = true;
    out.createdAt = Date.now();
    out.title = `${examName} · AI ${new Date().toLocaleDateString("uz-UZ")}`;
    let failed = 0;
    let fatal: unknown = null;
    let cursor = 0;
    const worker = async () => {
      while (cursor < jobs.length && !fatal) {
        const j = jobs[cursor++];
        try {
          if (j.kind === "g") {
            const g = base.sections[j.si].groups![j.gi];
            out.sections[j.si].groups![j.gi] = await postJson<Group>("/api/generate", { exam, group: g });
          } else {
            const w = base.sections[j.si].writing![j.gi];
            out.sections[j.si].writing![j.gi] = await postJson<WritingTask>("/api/generate", { exam, writing: w });
          }
        } catch (e) {
          if (e instanceof ApiError && (e.status === 503 || e.status === 429)) fatal = e;
          failed++;
        }
        setGen((p) => ({ ...p, done: p.done + 1, failed }));
      }
    };
    await Promise.all(Array.from({ length: 5 }, worker));
    if (fatal) {
      setGenError(errText(fatal));
      setPhase("intro");
      return;
    }
    if (failed > jobs.length / 2) {
      setGenError("AI variant yaratishda ko‘p xato bo‘ldi. Keyinroq urinib ko‘ring.");
      setPhase("intro");
      return;
    }
    saveAiTest(out);
    setTest(out);
    setPhase("intro");
  };

  const answeredCount = (s: Section) =>
    s.writing ? s.writing.filter((w) => hasWritingAnswer(writing[w.n])).length : allQuestions(s).filter(({ q }) => answers[qKey(s.id, q.n)]).length;
  const totalCount = (s: Section) => (s.writing ? s.writing.length : allQuestions(s).length);

  const gotoQuestion = (n: number) => {
    const gi = groups.findIndex((g) => g.questions.some((q) => q.n === n));
    if (gi >= 0) {
      setGroupIdx(gi);
      setOmrOpen(false);
      setTimeout(() => document.getElementById(`q-${qKey(section.id, n)}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
    }
  };

  const confirmSubmitSection = () => {
    const left = totalCount(section) - answeredCount(section);
    const msg =
      left > 0
        ? `${left} ta savolga javob berilmagan. Bo‘limni yakunlaysizmi?`
        : "Bo‘limni yakunlaysizmi?";
    if (window.confirm(msg)) nextSection();
  };

  // ======================= RENDER =======================

  if (phase === "results")
    return (
      <Results
        test={test}
        sections={sections}
        answers={answers}
        writing={writing}
        mode={mode}
        historyId={historyId}
        onRetry={() => setPhase("intro")}
        onNewAi={() => {
          setPhase("intro");
          void generate();
        }}
      />
    );

  if (phase === "generating") {
    const pct = gen.total ? Math.round((gen.done / gen.total) * 100) : 0;
    return (
      <div className="container page" style={{ display: "grid", placeItems: "center", minHeight: "80dvh" }}>
        <div className="card center" style={{ maxWidth: 520, width: "100%", padding: 32 }}>
          <div className="syllable-box" style={{ margin: "0 auto 22px", width: 120, height: 120, fontSize: "3.6rem", animation: "floatY 3s ease-in-out infinite" }}>
            시
          </div>
          <h2 className="h2">AI yangi variant tuzmoqda</h2>
          <p className="lead" style={{ marginTop: 8 }}>
            Har bir savol bloki rasmiy TOPIK formatida yangidan yozilmoqda…
          </p>
          <div className="bar" style={{ margin: "22px 0 10px", height: 14 }}>
            <i style={{ width: `${pct}%` }} />
          </div>
          <div className="small muted">
            {gen.done} / {gen.total} blok · {pct}%
          </div>
        </div>
      </div>
    );
  }

  if (phase === "intro") {
    const info = test.sections;
    const totalMin = sections.reduce((a, s) => a + s.minutes, 0);
    return (
      <div className="container page">
        <Link href="/test" className="btn btn-ghost btn-sm" style={{ paddingLeft: 6, marginBottom: 10 }}>
          <Icon name="left" size={18} /> Testlar
        </Link>
        <div className="result-hero" style={{ padding: "30px 24px" }}>
          <div className="blob b1" style={{ opacity: 0.4 }} />
          <div style={{ position: "relative", zIndex: 2 }}>
            <div className="row-wrap">
              <span className="badge white">{test.ai ? "✨ AI variant" : "Asosiy variant"}</span>
              <span className="badge white">
                {EXAM_INFO[exam].max} ball
              </span>
            </div>
            <h1 className="h1" style={{ marginTop: 14 }}>
              {preset === "writing" ? "Yozish imtihoni" : examName}
            </h1>
            <p className="lead" style={{ marginTop: 10, maxWidth: 640 }}>
              {exam === "topik1"
                ? "1–2-daraja. Tinglash va o‘qish — haqiqiy TOPIK I tuzilmasi va vaqti bilan."
                : "3–6-daraja. Tinglash, yozish (daftardan rasm bilan) va o‘qish — haqiqiy TOPIK II tuzilmasida."}
            </p>
          </div>
        </div>

        {saved && (
          <div className="callout info" style={{ marginTop: 16, alignItems: "center", flexWrap: "wrap" }}>
            <span className="grow">⏸️ Sizda tugallanmagan urinish bor.</span>
            <button className="btn btn-sm btn-primary" onClick={resume}>
              Davom ettirish
            </button>
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => {
                remove(KEYS.attempt(exam));
                setSaved(null);
              }}
            >
              O‘chirish
            </button>
          </div>
        )}

        <div className="grid-2" style={{ marginTop: 18 }}>
          <div className="card stack">
            <h3 className="h3">1. Variant</h3>
            <div className="stack" style={{ gap: 8 }}>
              <button className={`scenario ${test.id === BUILTIN[exam].id ? "on" : ""}`} onClick={() => setTest(BUILTIN[exam])}>
                <b>📘 {BUILTIN[exam].title}</b>
                <span className="small" style={{ opacity: 0.8 }}>
                  Tayyor original variant — internet AI’siz ham ishlaydi
                </span>
              </button>
              {aiReady &&
                ourAi.map((t) => (
                  <button key={t.id} className={`scenario ${test.id === t.id ? "on" : ""}`} onClick={() => setTest(t)}>
                    <b>✨ {t.title}</b>
                    <span className="small" style={{ opacity: 0.8 }}>
                      AI yaratgan variant
                    </span>
                  </button>
                ))}
              <button className="btn btn-soft" onClick={generate}>
                <Icon name="spark" size={18} /> AI bilan yangi variant yaratish
              </button>
              {genError && <div className="callout">{genError}</div>}
            </div>
          </div>

          <div className="card stack">
            <h3 className="h3">2. Rejim va bo‘lim</h3>
            <div className="grid-2" style={{ gap: 10 }}>
              <button className={`scenario ${mode === "exam" ? "on" : ""}`} onClick={() => setMode("exam")}>
                <span className="em">⏱️</span>
                <b>Imtihon</b>
                <span className="tiny" style={{ opacity: 0.85 }}>
                  Vaqt cheklangan, audio cheklangan, natija oxirida
                </span>
              </button>
              <button className={`scenario ${mode === "practice" ? "on" : ""}`} onClick={() => setMode("practice")}>
                <span className="em">🎯</span>
                <b>Mashq</b>
                <span className="tiny" style={{ opacity: 0.85 }}>
                  Vaqtsiz, javob darhol tekshiriladi + AI tushuntirish
                </span>
              </button>
            </div>
            <div className="row-wrap">
              <button className={`chip ${scope === "all" ? "active" : ""}`} onClick={() => setScope("all")}>
                To‘liq imtihon
              </button>
              {info.map((s) => (
                <button key={s.id} className={`chip ${scope === s.id ? "active" : ""}`} onClick={() => setScope(s.id)}>
                  {SECTION_LABEL[s.id].icon} <span className="kr">{s.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 18 }}>
          <h3 className="h3" style={{ marginBottom: 12 }}>
            Tuzilma
          </h3>
          <div className="stack" style={{ gap: 10 }}>
            {sections.map((s) => (
              <div key={s.id} className="row between" style={{ padding: "10px 0", borderBottom: "1px dashed var(--line)" }}>
                <div className="row">
                  <span style={{ fontSize: "1.3rem" }}>{SECTION_LABEL[s.id].icon}</span>
                  <div>
                    <b className="kr">
                      {exam === "topik2" ? `${s.period}교시 · ` : ""}
                      {s.title}
                    </b>
                    <div className="tiny muted">{SECTION_LABEL[s.id].uz}</div>
                  </div>
                </div>
                <div className="small" style={{ textAlign: "right" }}>
                  <b>{totalCount(s)}</b> {s.writing ? "topshiriq" : "savol"}
                  <div className="tiny muted">
                    {s.minutes} daqiqa
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="row between" style={{ marginTop: 18, flexWrap: "wrap", gap: 12 }}>
            <div className="small muted">
              ⏱️ {mode === "exam" ? `${totalMin} daqiqa` : "Vaqt cheklovi yo‘q"} · 🎧{" "}
              {exam === "topik1" ? "har bir audio 2 marta" : "1–20: 1 marta, 21–50: 2 marta"}
            </div>
            <button className="btn btn-primary btn-lg" onClick={() => begin()}>
              Boshlash <Icon name="right" size={20} />
            </button>
          </div>
        </div>

        {sections.some((s) => s.id === "writing") && (
          <div className="callout violet" style={{ marginTop: 16 }}>
            📸{" "}
            Yozish bo‘limida javobni daftarga yozib, rasmini yuklashingiz mumkin. Vaqt tugagach rasm yuklash uchun yana 3 daqiqa beriladi.
          </div>
        )}
      </div>
    );
  }

  if (phase === "break") {
    const next = sections[secIdx + 1];
    const isPeriodBreak = next && section && next.period !== section.period;
    return (
      <div className="container page" style={{ display: "grid", placeItems: "center", minHeight: "80dvh" }}>
        <div className="card center stack" style={{ maxWidth: 520, width: "100%", padding: 32, alignItems: "center" }}>
          <div style={{ fontSize: "3rem" }}>{isPeriodBreak ? "☕" : "✅"}</div>
          <h2 className="h2">
            <span className="kr">{section.title}</span> yakunlandi
          </h2>
          <p className="lead">
            {isPeriodBreak
              ? "Haqiqiy TOPIK’da bu yerda tanaffus bo‘ladi. Dam oling va tayyor bo‘lganda davom eting."
              : "Keyingi bo‘limga o‘tamiz."}
          </p>
          <div className="badge" style={{ fontSize: "0.9rem", padding: "8px 14px" }}>
            Keyingi: {SECTION_LABEL[next.id].icon} <span className="kr">{next.title}</span> · {next.minutes} daqiqa
          </div>
          <button className="btn btn-primary btn-lg" onClick={() => startSection(secIdx + 1)}>
            Davom etish <Icon name="right" size={20} />
          </button>
        </div>
      </div>
    );
  }

  // ---------- RUN ----------
  const lab = SECTION_LABEL[section.id];
  const done = answeredCount(section);
  const total = totalCount(section);
  const warn = !practice && (grace !== null || timeLeft <= 300);
  const isLast = groupIdx >= pageCount - 1;

  const omr = (
    <div className="card omr" style={{ padding: 16 }}>
      <div className="row between" style={{ marginBottom: 10 }}>
        <b className="small">Javoblar varaqasi</b>
        <span className="badge">
          {done}/{total}
        </span>
      </div>
      {section.writing ? (
        <div className="stack" style={{ gap: 6 }}>
          {tasks.map((t, i) => (
            <button key={t.n} className={`omr-row ${groupIdx === i ? "cur" : ""}`} style={{ border: 0, background: "transparent" }} onClick={() => { setGroupIdx(i); setOmrOpen(false); }}>
              <span className="n">{t.n}</span>
              <span className="small">{hasWritingAnswer(writing[t.n]) ? "✅" : "⬜"}</span>
              <span className="tiny muted">{t.pts} ball</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="omr-grid">
          {groups.flatMap((g, gi) =>
            g.questions.map((q) => {
              const a = answers[qKey(section.id, q.n)];
              return (
                <div key={q.n} className={`omr-row ${gi === groupIdx ? "cur" : ""}`} onClick={() => gotoQuestion(q.n)}>
                  <span className="n">{q.n}</span>
                  {[1, 2, 3, 4].map((i) => {
                    let c = "b";
                    if (a === i) c += practice ? (i === q.answer ? " ok" : " bad") : " f";
                    else if (practice && a && i === q.answer) c += " ok";
                    return (
                      <span key={i} className={c}>
                        {i}
                      </span>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      )}
      <button className="btn btn-primary btn-block btn-sm" style={{ marginTop: 14 }} onClick={confirmSubmitSection}>
        <Icon name="flag" size={16} /> Bo‘limni yakunlash
      </button>
    </div>
  );

  const task = tasks[groupIdx];
  const wAns = task ? writing[task.n] ?? emptyWriting() : undefined;

  return (
    <div>
      <div className="exam-top">
        <div className="container exam-top-in">
          <button
            className="icon-btn sm"
            aria-label="Chiqish"
            onClick={() => {
              if (window.confirm("Imtihondan chiqasizmi? Progress saqlanadi, keyin davom ettirishingiz mumkin.")) {
                stopAudio();
                setPhase("intro");
                setSaved(load<Saved | null>(KEYS.attempt(exam), null));
              }
            }}
          >
            <Icon name="x" size={18} />
          </button>
          <div className="grow">
            <div style={{ fontWeight: 800, fontSize: "0.95rem" }} className="row">
              <span>{lab.icon}</span>
              <span className="kr">
                {examName} · {exam === "topik2" ? `${section.period}교시 ` : ""}
                {section.title}
              </span>
            </div>
            <div className="bar thin" style={{ marginTop: 6, maxWidth: 360 }}>
              <i style={{ width: `${(done / Math.max(1, total)) * 100}%` }} />
            </div>
          </div>
          <div className={`timer ${practice ? "calm" : warn ? "warn" : ""}`}>
            <Icon name="clock" size={16} />
            {practice ? formatTime(elapsed) : grace !== null ? `📸 ${formatTime(grace)}` : formatTime(timeLeft)}
          </div>
          <button className="icon-btn sm hide-desktop" onClick={() => setOmrOpen(true)} aria-label="Javoblar varaqasi">
            <Icon name="grid" size={18} />
          </button>
        </div>
      </div>

      <div className="container" ref={topRef}>
        {grace !== null && (
          <div className="callout" style={{ marginTop: 16 }}>
            ⏰{" "}
            Yozish vaqti tugadi! Endi faqat daftaringizdagi javoblarning rasmini yuklashingiz mumkin.
          </div>
        )}
        <div className="exam-layout">
          <div className="stack" style={{ gap: 16 }}>
            {section.writing && task && wAns ? (
              <>
                <WritingTaskView task={task} value={wAns} onChange={(v) => setWriting((p) => ({ ...p, [task.n]: v }))} locked={grace !== null} uploadOnly={grace !== null} />
                {practice && hasWritingAnswer(wAns) && (
                  <div className="stack">
                    {!wGrade[task.n]?.result && (
                      <button
                        className="btn btn-primary"
                        style={{ alignSelf: "flex-start" }}
                        disabled={wGrade[task.n]?.loading}
                        onClick={async () => {
                          setWGrade((p) => ({ ...p, [task.n]: { loading: true } }));
                          try {
                            const r = await gradeWriting(task, wAns);
                            setWGrade((p) => ({ ...p, [task.n]: { result: r } }));
                          } catch (e) {
                            setWGrade((p) => ({ ...p, [task.n]: { error: errText(e) } }));
                          }
                        }}
                      >
                        {wGrade[task.n]?.loading ? <span className="spinner white" /> : <Icon name="spark" size={18} />}
                        {wGrade[task.n]?.loading ? "AI tekshirmoqda…" : "AI bilan tekshirish"}
                      </button>
                    )}
                    {wGrade[task.n]?.error && <div className="callout">{wGrade[task.n]!.error}</div>}
                    {wGrade[task.n]?.result && <WritingResultView task={task} result={wGrade[task.n]!.result!} />}
                  </div>
                )}
                <div className="tiny muted">
                  ⏱️ {`Tavsiya etilgan vaqt: ~${task.suggestedMinutes} daqiqa`}
                </div>
              </>
            ) : (
              groups[groupIdx] && (
                <GroupView
                  key={`${section.id}-${groupIdx}`}
                  exam={exam}
                  section={section.id}
                  group={groups[groupIdx]}
                  answers={answers}
                  onAnswer={(n, c) => setAnswers((p) => ({ ...p, [qKey(section.id, n)]: c }))}
                  plays={plays}
                  onPlay={(k) => setPlays((p) => ({ ...p, [k]: (p[k] ?? 0) + 1 }))}
                  practice={practice}
                />
              )
            )}

            <div className="row between" style={{ gap: 10 }}>
              <button
                className="btn"
                disabled={groupIdx === 0}
                onClick={() => {
                  stopAudio();
                  setGroupIdx((g) => g - 1);
                  scrollTop();
                }}
              >
                <Icon name="left" size={18} /> <span className="hide-mobile">Oldingi</span>
              </button>
              <span className="small muted">
                {groupIdx + 1} / {pageCount}
              </span>
              {isLast ? (
                <button className="btn btn-primary" onClick={confirmSubmitSection}>
                  {secIdx + 1 < sections.length ? "Keyingi bo‘lim" : "Topshirish"} <Icon name="flag" size={18} />
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    stopAudio();
                    setGroupIdx((g) => g + 1);
                    scrollTop();
                  }}
                >
                  Keyingi <Icon name="right" size={18} />
                </button>
              )}
            </div>
          </div>
          <aside className="hide-mobile">{omr}</aside>
        </div>
      </div>

      {omrOpen && (
        <>
          <div className="sheet-backdrop" onClick={() => setOmrOpen(false)} />
          <div className="sheet">
            <div className="sheet-handle" />
            {omr}
          </div>
        </>
      )}
    </div>
  );
}
