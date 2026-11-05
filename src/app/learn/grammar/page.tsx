"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { SpeakBtn } from "@/components/ui";
import { GRAMMAR, type Level } from "@/data/knowledge/grammar";
import { MISTAKES } from "@/data/knowledge/mistakes";
import { STAGES } from "@/data/knowledge/curriculum";
import { WORK_NOTES } from "@/data/knowledge/work";
import { WRITING_NOTES } from "@/data/knowledge/writing";
import { SOURCES } from "@/data/knowledge/sources";
import { findGrammar, norm } from "@/lib/knowledge";

type Tab = "grammar" | "mistakes" | "plan" | "work" | "writing";

const TABS: { id: Tab; t: string }[] = [
  { id: "grammar", t: "📘 Grammatika" },
  { id: "mistakes", t: "⚠️ O‘zbeklarga xos xatolar" },
  { id: "plan", t: "🗺️ Daraja rejasi" },
  { id: "work", t: "🏭 EPS va ish joyi" },
  { id: "writing", t: "✍️ Yozish (쓰기)" },
];

const AREA: Record<string, string> = {
  afzallik: "👍 Afzallik",
  talaffuz: "🗣️ Talaffuz",
  grammatika: "📐 Grammatika",
  odob: "🤝 Odob",
  imlo: "✏️ Imlo",
};

export default function GrammarPage() {
  const [tab, setTab] = useState<Tab>("grammar");
  const [level, setLevel] = useState<Level | 0>(0);
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const byLevel = GRAMMAR.filter((g) => !level || g.level === level);
    const s = q.trim();
    if (!s) return byLevel;
    const ns = norm(s);
    const hits = findGrammar(s, 30).filter((g) => !level || g.level === level);
    const plain = byLevel.filter((g) => !hits.includes(g) && norm(`${g.form} ${g.uz} ${g.tags.join(" ")}`).includes(ns));
    return [...hits, ...plain];
  }, [level, q]);

  return (
    <main className="container page">
      <Link href="/learn" className="btn btn-ghost btn-sm" style={{ paddingLeft: 6, marginBottom: 10 }}>
        <Icon name="left" size={18} /> O‘rganish
      </Link>
      <div className="section-head">
        <span className="eyebrow">🧠 Ustoz bilim bazasi</span>
        <h1 className="h1">
          Grammatika va <span className="gradient-text">ustoz eslatmalari</span>
        </h1>
        <p className="lead">
          {`${GRAMMAR.length} ta grammatika (1–6급), o‘zbeklarga xos ${MISTAKES.length} ta xato, EPS va yozish bo‘yicha qo‘llanma. AI Ustoz ham aynan shu bazadan foydalanadi.`}
        </p>
      </div>

      <div className="scroll-x" style={{ marginBottom: 18 }}>
        {TABS.map((x) => (
          <button key={x.id} className={`chip ${tab === x.id ? "active" : ""}`} onClick={() => setTab(x.id)}>
            {x.t}
          </button>
        ))}
      </div>

      {tab === "grammar" && (
        <>
          <div className="card stack" style={{ marginBottom: 16 }}>
            <input
              className="input"
              placeholder="Qidirish: -(으)려고, sabab, 는데, taxmin…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Grammatika qidirish"
            />
            <div className="row-wrap">
              {([0, 1, 2, 3, 4, 5, 6] as const).map((l) => (
                <button key={l} className={`chip ${level === l ? "active" : ""}`} onClick={() => setLevel(l)}>
                  {l ? `${l}급` : "Hammasi"}
                </button>
              ))}
            </div>
          </div>
          {list.length === 0 ? (
            <div className="empty">
              <p>Hech narsa topilmadi. AI Ustozdan so‘rab ko‘ring.</p>
              <Link href="/tutor" className="btn btn-primary">
                AI Ustoz
              </Link>
            </div>
          ) : (
            <div className="stack">
              {list.map((g) => (
                <div key={g.id} className="card stack" style={{ gap: 8 }}>
                  <div className="row between" style={{ gap: 10, alignItems: "flex-start" }}>
                    <b className="kr" style={{ fontSize: "1.15rem" }}>{g.form}</b>
                    <span className="badge">{g.level}급</span>
                  </div>
                  <div>{g.uz}</div>
                  {g.rule && <div className="small muted">{g.rule}</div>}
                  <div className="stack" style={{ gap: 6 }}>
                    {g.examples.map(([ko, uz]) => (
                      <div key={ko} className="row" style={{ gap: 8, alignItems: "flex-start" }}>
                        <SpeakBtn text={ko} />
                        <div>
                          <div className="kr" style={{ fontWeight: 700 }}>{ko}</div>
                          <div className="small muted">{uz}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {g.note && <div className="callout info small">💡 {g.note}</div>}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "mistakes" && (
        <div className="stack">
          {MISTAKES.map((m) => (
            <div key={m.id} className="card stack" style={{ gap: 8 }}>
              <div className="row between" style={{ gap: 10, alignItems: "flex-start" }}>
                <b>{m.title}</b>
                <span className="badge">{AREA[m.area]}</span>
              </div>
              <div className="small">{m.why}</div>
              {m.wrong && m.right && (
                <div className="row-wrap small">
                  <span className="badge red kr">✗ {m.wrong}</span>
                  <span className="badge green kr">✓ {m.right}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "plan" && (
        <div className="stack">
          {STAGES.map((s) => (
            <div key={s.id} className="card stack" style={{ gap: 8 }}>
              <div className="row between" style={{ gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                <b>
                  <span className="kr">{s.id === "eps" ? "EPS" : s.id}</span> · {s.title}
                </b>
                <span className="badge">{s.exam}</span>
              </div>
              <div className="small muted">
                ⏱️ {s.hours} · 🃏 {s.words}
              </div>
              <div className="small">
                <b>Nimalarni qila oladi:</b>
                <ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>
                  {s.goals.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
              <div className="small">
                <b>Mavzular:</b> {s.topics.join(", ")}
              </div>
              <div className="callout small">💡 {s.tips.join(" · ")}</div>
              {s.grammarLevel && s.id !== "eps" && (
                <button
                  className="btn btn-soft btn-sm"
                  style={{ alignSelf: "flex-start" }}
                  onClick={() => {
                    setTab("grammar");
                    setLevel(s.grammarLevel as Level);
                    setQ("");
                    window.scrollTo({ top: 0 });
                  }}
                >
                  {s.grammarLevel}급 grammatikasi →
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "work" && (
        <div className="stack">
          <div className="callout info small">
            ⚠️ Maosh, sug‘urta va muddatlar o‘zgarib turadi — muhim qaror oldidan 1350 yoki 1345 ga qo‘ng‘iroq qilib tekshiring.
          </div>
          {WORK_NOTES.map((w) => (
            <div key={w.id} className="card stack" style={{ gap: 6 }}>
              <b>{w.title}</b>
              <ul className="small" style={{ margin: 0, paddingLeft: 20 }}>
                {w.points.map((p) => (
                  <li key={p} style={{ marginBottom: 4 }}>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <Link href="/test/eps" className="btn btn-primary" style={{ alignSelf: "flex-start" }}>
            EPS-TOPIK mock test <Icon name="right" size={18} />
          </Link>
        </div>
      )}

      {tab === "writing" && (
        <div className="stack">
          {WRITING_NOTES.map((w) => (
            <div key={w.id} className="card stack" style={{ gap: 6 }}>
              <b>{w.title}</b>
              <ul className="small" style={{ margin: 0, paddingLeft: 20 }}>
                {w.points.map((p) => (
                  <li key={p} style={{ marginBottom: 4 }}>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <Link href="/writing" className="btn btn-primary" style={{ alignSelf: "flex-start" }}>
            Yozishni mashq qilish <Icon name="right" size={18} />
          </Link>
        </div>
      )}

      <details className="card" style={{ marginTop: 24 }}>
        <summary style={{ cursor: "pointer", fontWeight: 800 }}>📚 Manbalar</summary>
        <p className="small muted" style={{ marginTop: 10 }}>
          Tushuntirishlar va misollar HanUstoz uchun yozilgan. Quyidagi ochiq manbalardan darajalar tuzilmasi, imtihon formati va rasmiy qoidalar uchun tayanch sifatida foydalanilgan.
        </p>
        <ul className="small" style={{ paddingLeft: 20, margin: 0 }}>
          {SOURCES.map((s) => (
            <li key={s.name} style={{ marginBottom: 6 }}>
              <a href={s.url} target="_blank" rel="noreferrer" className="kr" style={{ fontWeight: 700 }}>
                {s.name}
              </a>{" "}
              — {s.org}. <span className="muted">{s.usedFor}</span>
            </li>
          ))}
        </ul>
      </details>
    </main>
  );
}
