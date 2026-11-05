"use client";

import Link from "next/link";
import { useState } from "react";
import { OFFICIAL_LINKS, PAST_PARTS, PAST_ROUNDS, QTYPES, pastUrl } from "@/data/pastExams";

type QKey = keyof typeof QTYPES;

export default function PastExamsPage() {
  const [qk, setQk] = useState<QKey>("t1l");
  const tabs: { id: QKey; label: string }[] = [
    { id: "t1l", label: "I · 듣기" },
    { id: "t1r", label: "I · 읽기" },
    { id: "t2l", label: "II · 듣기" },
    { id: "t2w", label: "II · 쓰기" },
    { id: "t2r", label: "II · 읽기" },
  ];
  const cur = QTYPES[qk];

  return (
    <main className="container page">
      <div className="section-head">
        <span className="eyebrow">🗂️ 기출문제</span>
        <h1 className="h1">
          Rasmiy o‘tgan{" "}
          <span className="gradient-text">TOPIK testlari</span>
        </h1>
        <p className="lead">
          NIIED rasmiy saytida ochiq e’lon qilingan {PAST_ROUNDS.length} ta sessiya (35–102). Har bir tugma o‘sha testni rasmiy saytda, audiosi bilan,
          yangi oynada ochadi.
        </p>
      </div>

      <div className="callout info" style={{ marginBottom: 18 }}>
        <span>
          ℹ️ Savollar NIIED (국립국제교육원) mualliflik huquqi ostida — ularni ilovaga ko‘chirish uchun ruxsat kerak. Shuning uchun bu yerda
          rasmiy havolalar va savol turlari tahlili berilgan. Shu formatdagi original mashqlarni{" "}
          <Link href="/test" style={{ textDecoration: "underline", fontWeight: 700 }}>
            mock testlar
          </Link>{" "}
          bo‘limida yechishingiz mumkin.
        </span>
      </div>

      <div className="grid-2">
        {PAST_ROUNDS.map((r) => (
          <div key={r.no} className="card stack" style={{ gap: 10 }}>
            <div className="row between">
              <div>
                <div className="kr" style={{ fontWeight: 800, fontSize: "1.25rem" }}>제{r.no}회 한국어능력시험</div>
                <div className="small muted">
                  {r.year}-yil{r.note ? ` · ${r.note}` : ""}
                </div>
              </div>
              <span className="badge">{r.year}</span>
            </div>
            <div className="grid-2" style={{ gap: 8 }}>
              {PAST_PARTS.map((p) => (
                <a
                  key={p.label}
                  className="btn btn-soft btn-sm"
                  href={pastUrl(r.no, p.grade, p.type)}
                  target="_blank"
                  rel="noreferrer"
                  title={`${p.count} savol · ${p.minutes} daqiqa`}
                >
                  {p.type === "h" ? "🎧" : "📖"} <span className="kr">{p.label}</span>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="card stack" style={{ marginTop: 24 }}>
        <h2 className="h2" style={{ margin: 0 }}>🧭 Savol turlari xaritasi</h2>
        <p className="small muted" style={{ margin: 0 }}>
          O‘tgan testlarda har bir savol raqami doim bir xil turdagi topshiriq bo‘ladi. Qaysi raqamda nima so‘ralishini bilsangiz, vaqtni tejaysiz.
        </p>
        <div className="seg" style={{ alignSelf: "flex-start", flexWrap: "wrap" }}>
          {tabs.map((t) => (
            <button key={t.id} className={qk === t.id ? "on" : ""} onClick={() => setQk(t.id)}>
              <span className="kr">{t.label}</span>
            </button>
          ))}
        </div>
        <h3 className="h3 kr" style={{ margin: "6px 0 0" }}>{cur.title}</h3>
        <div className="stack" style={{ gap: 8 }}>
          {cur.items.map((it) => (
            <div key={it.range} className="row" style={{ alignItems: "flex-start", gap: 12, padding: "10px 0", borderBottom: "1px dashed var(--line)" }}>
              <span className="badge" style={{ minWidth: 64, justifyContent: "center" }}>
                {it.range}
              </span>
              <div className="grow">
                <b className="kr">{it.ko}</b> — {it.uz}
                <div className="small muted">💡 {it.tip}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid-3" style={{ marginTop: 24 }}>
        {OFFICIAL_LINKS.map((l) => (
          <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className="card hover stack" style={{ gap: 6 }}>
            <b className="kr">{l.t} ↗</b>
            <span className="small muted">{l.d}</span>
          </a>
        ))}
      </div>
    </main>
  );
}
