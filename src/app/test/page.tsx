"use client";

import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Visual } from "@/components/Visual";
import type { VisualId } from "@/data/visuals";
import { TRIAL_DAYS } from "@/lib/access";

export default function TestHub() {
  const cards: { href: string; v: VisualId; title: string; lv: string; g: string; rows: string[][]; pass: string }[] = [
    {
      href: "/test/topik1",
      v: "exam:topik1",
      title: "TOPIK I",
      lv: "1급 · 2급",
      g: "var(--grad-mint)",
      rows: [
        ["🎧 듣기", "30", "40"],
        ["📖 읽기", "40", "60"],
      ],
      pass: "80+ → 1급 · 140+ → 2급 (200 balldan)",
    },
    {
      href: "/test/topik2",
      v: "exam:topik2",
      title: "TOPIK II",
      lv: "3급 – 6급",
      g: "var(--grad)",
      rows: [
        ["🎧 듣기", "50", "60"],
        ["✍️ 쓰기", "4", "50"],
        ["📖 읽기", "50", "70"],
      ],
      pass: "120+ → 3급 · 150+ → 4급 · 190+ → 5급 · 230+ → 6급",
    },
    {
      href: "/test/eps",
      v: "exam:eps",
      title: "EPS-TOPIK",
      lv: "Ishchilar · E-9",
      g: "var(--grad-sun)",
      rows: [
        ["📖 읽기", "20", "25"],
        ["🎧 듣기", "20", "25"],
      ],
      pass: "100 ball · ishlab chiqarish 60+ · boshqa sohalar 45+",
    },
  ];
  return (
    <main className="container page">
      <div className="section-head">
        <span className="eyebrow">📝 Mock test</span>
        <h1 className="h1">
          Darajangizni{" "}
          <span className="gradient-text">aniqlang</span>
        </h1>
        <p className="lead">
          Imtihon rejimida — haqiqiy vaqt va qoidalar bilan. Mashq rejimida — har bir savoldan keyin AI o‘zbek tilida tushuntiradi.
        </p>
      </div>
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="callout info">
          <span>🆓</span>
          <span>
            {`TOPIK I, TOPIK II va EPS-TOPIK asosiy variantlari — bepul, kirmasdan ham ishlaydi. AI tushuntirish, yozma ishni AI baholash va yangi AI variantlar — Gmail orqali kirib, ${TRIAL_DAYS} kun bepul.`}
          </span>
        </div>
        <div className="callout">
          <span>ℹ️</span>
          <span>
            Bu — mashq (mock) testi, rasmiy TOPIK imtihoni emas. Rasmiy imtihonni NIIED o‘tkazadi; bu sayt unga ro‘yxatdan o‘tkazmaydi. Natijalar taxminiy.
          </span>
        </div>
      </div>

      <div className="grid-3">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="card hover" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ background: c.g, color: "#fff", padding: "28px 24px", position: "relative" }}>
              <span style={{ position: "absolute", top: 18, right: 18 }}>
                <Visual id={c.v} size={64} shape="tile" />
              </span>
              <span className="badge white">{c.lv}</span>
              <div className="display" style={{ fontSize: "2.2rem", fontWeight: 700, marginTop: 10 }}>{c.title}</div>
              <div className="small" style={{ opacity: 0.9 }}>{c.pass}</div>
            </div>
            <div style={{ padding: "8px 24px 20px" }}>
              {c.rows.map(([s, q, m]) => (
                <div key={s} className="row between" style={{ padding: "12px 0", borderBottom: "1px dashed var(--line)" }}>
                  <b className="kr">{s}</b>
                  <span className="small muted">
                    {q} {s.includes("쓰기") ? "topshiriq" : "savol"} · {m} daqiqa
                  </span>
                </div>
              ))}
              <div className="row between" style={{ marginTop: 16 }}>
                <span style={{ fontWeight: 800, color: "var(--p1)" }}>Boshlash</span>
                <span className="icon-btn primary sm">
                  <Icon name="right" size={18} />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid-3" style={{ marginTop: 20 }}>
        <Link href="/writing" className="card hover stack" style={{ gap: 10 }}>
          <span className="icon-tile pink">✍️</span>
          <h3 className="h3">Faqat yozish (쓰기)</h3>
          <p className="small muted" style={{ margin: 0 }}>50 daqiqa, daftardan rasm yuklash va AI baholash.</p>
        </Link>
        <div className="card stack" style={{ gap: 10 }}>
          <span className="icon-tile">✨</span>
          <h3 className="h3">Cheksiz AI variantlar</h3>
          <p className="small muted" style={{ margin: 0 }}>
            Test sahifasida «AI bilan yangi variant» tugmasini bosing — Gemini rasmiy formatda yangi test tuzadi.
          </p>
        </div>
        <div className="card stack" style={{ gap: 10 }}>
          <span className="icon-tile mint">💡</span>
          <h3 className="h3">Maslahat</h3>
          <p className="small muted" style={{ margin: 0 }}>
            Avval mashq rejimida xatolarni o‘rganing, keyin imtihon rejimida vaqt bilan sinab ko‘ring.
          </p>
        </div>
      </div>
    </main>
  );
}
