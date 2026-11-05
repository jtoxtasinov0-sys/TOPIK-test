"use client";

import { useState } from "react";
import type { ExamId, Group, Question } from "@/lib/exam";
import { CIRCLED } from "@/lib/exam";
import { hash } from "@/lib/audio";
import { Icon } from "../Icon";
import { postJson, useAiErrorText } from "../ui";

type Explanation = {
  translation: string;
  correct_reason: string;
  wrong_options?: string;
  vocab: { ko: string; meaning: string }[];
  grammar: { pattern: string; meaning: string }[];
  tip: string;
};

const cache = new Map<string, Explanation>();

export function questionContext(g: Group, q: Question) {
  const parts = [g.instruction];
  if (g.example) parts.push(`<보기>\n${g.example}`);
  const script = q.script ?? g.script;
  if (script) parts.push(`[듣기 대본]\n${script}`);
  const passage = q.passage ?? g.passage;
  if (passage) parts.push(`[지문]\n${passage.replace(/<\/?u>/g, "__")}`);
  if (q.picture) parts.push(`[그림] ${q.picture}`);
  const notice = q.notice ?? g.notice;
  if (notice) parts.push(`[안내문]\n${notice.title ?? ""}\n${notice.lines.join("\n")}`);
  const chart = q.chart ?? g.chart;
  if (chart) parts.push(`[도표] ${JSON.stringify(chart)}`);
  const given = q.given ?? g.given;
  if (given) parts.push(`[주어진 문장] ${given}`);
  parts.push(`${q.n}. ${q.prompt ?? ""}`);
  if (q.optionStyle === "chart" && q.optionCharts) parts.push(q.optionCharts.map((c, i) => `${CIRCLED[i]} ${JSON.stringify(c)}`).join("\n"));
  else parts.push(q.options.map((o, i) => `${CIRCLED[i]} ${o}`).join("\n"));
  return parts.join("\n\n");
}

export function Explain({ group, question, userAnswer, exam }: { group: Group; question: Question; userAnswer?: number; exam?: ExamId }) {
  const errText = useAiErrorText();
  const ctx = questionContext(group, question);
  const key = hash(ctx);
  const [data, setData] = useState<Explanation | null>(() => cache.get(key) ?? null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const run = async () => {
    setLoading(true);
    setErr("");
    try {
      const r = await postJson<Explanation>("/api/explain", { context: ctx, answer: question.answer, user: userAnswer, exam });
      cache.set(key, r);
      setData(r);
    } catch (e) {
      setErr(errText(e));
    } finally {
      setLoading(false);
    }
  };

  if (!data)
    return (
      <div className="stack" style={{ gap: 8 }}>
        <button className="btn btn-soft btn-sm" onClick={run} disabled={loading} style={{ alignSelf: "flex-start" }}>
          {loading ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <Icon name="spark" size={16} />}
          {loading ? "AI tushuntirmoqda…" : "AI tushuntirsin (o‘zbekcha)"}
        </button>
        {err && <div className="callout">{err}</div>}
      </div>
    );

  return (
    <div className="card flat" style={{ background: "var(--surface-2)", padding: 16, borderRadius: 18 }}>
      <div className="row" style={{ marginBottom: 8 }}>
        <span className="badge">
          <Icon name="spark" size={13} /> AI
        </span>
        <b className="small">Tushuntirish</b>
      </div>
      <div className="stack" style={{ gap: 10, fontSize: "0.93rem" }}>
        <div>
          <div className="tiny muted" style={{ fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em" }}>Tarjima</div>
          <div style={{ whiteSpace: "pre-line" }}>{data.translation}</div>
        </div>
        <div>
          <div className="tiny" style={{ fontWeight: 800, color: "var(--green)", textTransform: "uppercase", letterSpacing: ".06em" }}>
            ✓ Nega to‘g‘ri
          </div>
          <div>{data.correct_reason}</div>
        </div>
        {data.wrong_options && (
          <div>
            <div className="tiny" style={{ fontWeight: 800, color: "var(--red)", textTransform: "uppercase", letterSpacing: ".06em" }}>
              ✗ Boshqa variantlar
            </div>
            <div>{data.wrong_options}</div>
          </div>
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
