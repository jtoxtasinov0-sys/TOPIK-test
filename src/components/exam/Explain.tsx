"use client";

import { useEffect, useRef, useState } from "react";
import type { ExamId, Group, Question } from "@/lib/exam";
import { CIRCLED } from "@/lib/exam";
import { hash } from "@/lib/audio";
import { Icon } from "../Icon";
import { ApiError, postJson, useAiErrorText } from "../ui";

type Explanation = {
  translation: string;
  correct_reason: string;
  wrong_options?: string;
  /** O'quvchi tanlagan variant nega xato (qaysi tuzoqqa tushdi) */
  user_mistake?: string;
  /** Shu savolni qanday to'g'ri yechish: 2–4 qadam */
  steps?: string[];
  vocab: { ko: string; meaning: string }[];
  grammar: { pattern: string; meaning: string }[];
  tip: string;
};

const cache = new Map<string, Explanation>();
const inflight = new Map<string, Promise<Explanation>>();

// Natija sahifasida xatolar tushuntirishi o'zi yuklanadi — bir vaqtda ko'pi bilan 2 ta so'rov
const AUTO_PARALLEL = 2;
/** Savol ekranda shuncha turgandan keyin yuklanadi — tez aylantirib o'tib ketilgan savollar uchun so'ralmaydi */
const DWELL_MS = 500;
let active = 0;
const waiting: (() => void)[] = [];
/** Kirilmagan, sinov tugagan yoki limit tugagan — boshqa savollar uchun o'zi so'ralmaydi (tugma qoladi) */
let autoOff = false;

async function limited<T>(job: () => Promise<T>): Promise<T> {
  if (active >= AUTO_PARALLEL) await new Promise<void>((r) => waiting.push(r));
  else active++;
  try {
    return await job();
  } finally {
    // Navbatdagiga joy to'g'ridan-to'g'ri beriladi (bo'shasa — kamayadi)
    const next = waiting.shift();
    if (next) next();
    else active--;
  }
}

export function questionContext(g: Group, q: Question) {
  const parts = [g.instruction];
  if (g.example) parts.push(`<보기>\n${g.example}`);
  const script = q.script ?? g.script;
  if (script) parts.push(`[듣기 대본]\n${script}`);
  const passage = q.passage ?? g.passage;
  if (passage) parts.push(`[지문]\n${passage.replace(/<\/?u>/g, "__")}`);
  if (q.sign) parts.push(`[안전 표지] ${{ prohibit: "금지표지 (빨간 원과 사선)", warn: "경고표지 (노란 삼각형)", order: "지시표지 (파란 원)", guide: "안내표지 (초록색)" }[q.sign.kind]}: ${q.sign.icon}`);
  else if (q.pictureImage || q.picture) parts.push(`[그림] ${q.pictureImage ?? q.picture}`);
  const notice = q.notice ?? g.notice;
  if (notice) parts.push(`[안내문]\n${notice.title ?? ""}\n${notice.lines.join("\n")}`);
  const chart = q.chart ?? g.chart;
  if (chart) parts.push(`[도표] ${JSON.stringify(chart)}`);
  const given = q.given ?? g.given;
  if (given) parts.push(`[주어진 문장] ${given}`);
  parts.push(`${q.n}. ${q.prompt ?? ""}`);
  if (q.optionStyle === "chart" && q.optionCharts) parts.push(q.optionCharts.map((c, i) => `${CIRCLED[i]} ${JSON.stringify(c)}`).join("\n"));
  else if (q.optionStyle === "picture" && q.optionImages?.length === 4) parts.push(q.optionImages.map((o, i) => `${CIRCLED[i]} [그림] ${o}`).join("\n"));
  else parts.push(q.options.map((o, i) => `${CIRCLED[i]} ${o}`).join("\n"));
  return parts.join("\n\n");
}

const LABEL = { fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em" } as const;

/**
 * AI tushuntirish (o'zbekcha). auto — natija sahifasidagi xato savol: ekranga yaqinlashganda o'zi yuklanadi,
 * tugma bosish shart emas.
 */
export function Explain({ group, question, userAnswer, exam, auto = false }: { group: Group; question: Question; userAnswer?: number; exam?: ExamId; auto?: boolean }) {
  const errText = useAiErrorText();
  const ctx = questionContext(group, question);
  const key = hash(`${ctx}|${userAnswer ?? 0}`);
  const [data, setData] = useState<Explanation | null>(() => cache.get(key) ?? null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const box = useRef<HTMLDivElement>(null);

  const run = async (queued = false) => {
    setLoading(true);
    setErr("");
    try {
      let job = inflight.get(key);
      if (!job) {
        const req = () => postJson<Explanation>("/api/explain", { context: ctx, answer: question.answer, user: userAnswer, exam });
        job = (queued ? limited(req) : req()).finally(() => inflight.delete(key));
        inflight.set(key, job);
      }
      const r = await job;
      cache.set(key, r);
      setData(r);
    } catch (e) {
      if (e instanceof ApiError && [401, 402, 429].includes(e.status)) autoOff = true;
      setErr(errText(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!auto || data || autoOff) return;
    const el = box.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Faqat ekrandagi va biroz pastdagi savollar: yuqoridagi tahlil ochilib, o'qilayotgan joy pastga surilmaydi
    const io = new IntersectionObserver(
      (entries) => {
        clearTimeout(timer);
        if (!entries[entries.length - 1]?.isIntersecting) return;
        timer = setTimeout(() => {
          if (autoOff) return;
          io.disconnect();
          void run(true);
        }, DWELL_MS);
      },
      { rootMargin: "0px 0px 240px 0px" }
    );
    io.observe(el);
    return () => {
      clearTimeout(timer);
      io.disconnect();
    };
    // run — har renderda yangi; kalit o'zgarsa qayta kuzatamiz
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, key, data]);

  if (!data)
    return (
      <div className="stack" style={{ gap: 8 }} ref={box}>
        <button className="btn btn-soft btn-sm" onClick={() => run()} disabled={loading} style={{ alignSelf: "flex-start" }}>
          {loading ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <Icon name="spark" size={16} />}
          {loading ? "AI tahlil qilmoqda…" : "AI tushuntirsin (o‘zbekcha)"}
        </button>
        {err && <div className="callout">{err}</div>}
      </div>
    );

  const wrong = !!userAnswer && userAnswer !== question.answer;
  const optText = (n: number) => (question.optionStyle === "chart" || question.optionStyle === "picture" ? "" : ` ${question.options[n - 1] ?? ""}`);

  return (
    <div className="card flat" style={{ background: "var(--surface-2)", padding: 16, borderRadius: 18 }}>
      <div className="row" style={{ marginBottom: 8 }}>
        <span className="badge">
          <Icon name="spark" size={13} /> AI
        </span>
        <b className="small">{wrong || !userAnswer ? "Tahlil: qanday to‘g‘ri yechiladi" : "Tushuntirish"}</b>
      </div>
      <div className="stack" style={{ gap: 10, fontSize: "0.93rem" }}>
        {wrong && data.user_mistake && (
          <div className="explain-mistake">
            <div className="tiny" style={{ ...LABEL, color: "var(--red)" }}>
              ✗ Siz tanladingiz: <span className="kr">{CIRCLED[userAnswer! - 1]}{optText(userAnswer!)}</span> — nega xato
            </div>
            <div>{data.user_mistake}</div>
          </div>
        )}
        {!!data.steps?.length && (
          <div>
            <div className="tiny" style={{ ...LABEL, color: "var(--p1)" }}>
              🧭 Qanday yechiladi
            </div>
            <ol className="explain-steps">
              {data.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </div>
        )}
        <div>
          <div className="tiny" style={{ ...LABEL, color: "var(--green)" }}>
            ✓ Nega to‘g‘ri: <span className="kr">{CIRCLED[question.answer - 1]}{optText(question.answer)}</span>
          </div>
          <div>{data.correct_reason}</div>
        </div>
        {data.wrong_options && (
          <div>
            <div className="tiny" style={{ ...LABEL, color: "var(--red)" }}>
              ✗ Boshqa variantlar
            </div>
            <div>{data.wrong_options}</div>
          </div>
        )}
        {data.translation && (
          <details className="explain-tr">
            <summary className="tiny muted" style={LABEL}>
              Tarjima (o‘zbekcha)
            </summary>
            <div style={{ whiteSpace: "pre-line", marginTop: 6 }}>{data.translation}</div>
          </details>
        )}
        {!!data.vocab?.length && (
          <div className="row-wrap" style={{ gap: 6 }}>
            {data.vocab.map((v) => (
              <span key={v.ko} className="chip" style={{ padding: "5px 10px", fontSize: "0.82rem" }}>
                <b className="kr">{v.ko}</b> — {v.meaning}
              </span>
            ))}
          </div>
        )}
        {data.grammar?.map((g) => (
          <div key={g.pattern} className="callout violet" style={{ padding: "10px 12px" }}>
            <b className="kr">{g.pattern}</b> — {g.meaning}
          </div>
        ))}
        {data.tip && (
          <div className="callout info" style={{ padding: "10px 12px" }}>
            💡 {data.tip}
          </div>
        )}
      </div>
    </div>
  );
}
