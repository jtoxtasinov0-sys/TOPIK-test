"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SpeakBtn } from "@/components/ui";
import { GRAMMAR } from "@/data/grammar";

const LEVELS = [
  { id: 0, label: "Hammasi" },
  { id: 1, label: "1급" },
  { id: 2, label: "2급" },
  { id: 3, label: "3급" },
  { id: 4, label: "4급" },
  { id: 5, label: "5–6급" },
];

export default function GrammarPage() {
  const [lv, setLv] = useState(0);
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return GRAMMAR.filter((g) => (lv === 0 ? true : lv === 5 ? g.lv >= 5 : g.lv === lv)).filter(
      (g) => !s || g.p.includes(s) || g.uz.toLowerCase().includes(s) || g.ex.includes(s) || g.tags.some((t) => t.includes(s)),
    );
  }, [lv, q]);

  return (
    <main className="container page">
      <div className="section-head">
        <span className="eyebrow">📐 문법</span>
        <h1 className="h1">
          TOPIK{" "}
          <span className="gradient-text">grammatikasi</span>
        </h1>
        <p className="lead">
          {GRAMMAR.length} ta asosiy qolip — 1급 dan 6급 gacha, o‘zbekcha izoh va misollar bilan. Tushunmaganingizni{" "}
          <Link href="/tutor" style={{ textDecoration: "underline", fontWeight: 700 }}>
            AI Ustoz
          </Link>
          dan so‘rang — u ham shu bazaga tayanadi.
        </p>
      </div>

      <div className="row between" style={{ marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div className="seg" style={{ flexWrap: "wrap" }}>
          {LEVELS.map((l) => (
            <button key={l.id} className={lv === l.id ? "on" : ""} onClick={() => setLv(l.id)}>
              {l.label}
            </button>
          ))}
        </div>
        <input
          className="input"
          style={{ maxWidth: 280 }}
          placeholder="🔎 Qidirish: 니까, sabab, maqsad…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Grammatika qidirish"
        />
      </div>

      <div className="grid-2">
        {list.map((g) => (
          <div key={g.id} className="card stack" style={{ gap: 8 }}>
            <div className="row between">
              <b className="kr" style={{ fontSize: "1.2rem" }}>{g.p}</b>
              <span className={`badge ${g.lv <= 2 ? "green" : g.lv <= 4 ? "" : "amber"}`}>{g.lv}급</span>
            </div>
            <div className="small">{g.uz}</div>
            <div className="row" style={{ alignItems: "flex-start", gap: 8 }}>
              <div className="grow">
                <div className="kr" style={{ fontWeight: 700 }}>{g.ex}</div>
                <div className="small muted">{g.exUz}</div>
              </div>
              <SpeakBtn text={g.ex} />
            </div>
            {g.note && <div className="tiny muted">💡 {g.note}</div>}
          </div>
        ))}
      </div>
      {!list.length && <p className="muted">Hech narsa topilmadi.</p>}
    </main>
  );
}
