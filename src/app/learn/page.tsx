"use client";

import Link from "next/link";
import { Icon } from "@/components/Icon";
import { LESSONS } from "@/data/lessons";

export default function LearnHub() {
  const steps = [
    { n: 1, href: "/learn/hangul", t: "Hangul alifbosi", d: "40 ta harf, tovushi bilan — 1–2 kunda o‘qishni o‘rganasiz", g: "var(--grad-mint)" },
    { n: 2, href: "/learn/hangul#builder", t: "Bo‘g‘in yasash", d: "Harflarni bo‘g‘inga yig‘ing va eshiting", g: "var(--grad-btn)" },
    { n: 3, href: "/learn/lessons", t: "Hayotiy darslar", d: "12 ta dars: salomlashish, restoran, ish, kasalxona…", g: "var(--grad)" },
    { n: 4, href: "/learn/grammar", t: "Grammatika va ustoz eslatmalari", d: "1–6급 grammatika o‘zbekcha izoh bilan, o‘zbeklarga xos xatolar, daraja rejasi", g: "var(--grad-night)" },
    { n: 5, href: "/words", t: "So‘z kartochkalari", d: "130+ so‘z: TOPIK va EPS (ish joyi), takrorlash tizimi bilan", g: "var(--grad-pink)" },
    { n: 6, href: "/speak", t: "AI bilan gaplashish", d: "O‘rganganlaringizni jonli suhbatda qo‘llang", g: "var(--grad-sun)" },
    { n: 7, href: "/test", t: "TOPIK / EPS-TOPIK mock test", d: "Darajangizni tekshiring yoki ishga borish imtihoniga tayyorlaning", g: "var(--grad-mint)" },
  ];
  return (
    <main className="container page">
      <div className="section-head">
        <span className="eyebrow">🌱 0 dan boshlash</span>
        <h1 className="h1">
          Koreys tili — 
          <span className="gradient-text">qadam-baqadam</span>
        </h1>
        <p className="lead">
          Koreyaga endi kelgan yoki hali umuman bilmaydiganlar uchun yo‘l xaritasi. Har bir so‘z va iborani ovoz bilan eshitish mumkin.
        </p>
      </div>

      <div className="grid-2">
        <div className="card stack" style={{ gap: 4 }}>
          <h3 className="h3" style={{ marginBottom: 10 }}>🗺️ Yo‘l xaritasi</h3>
          {steps.map((s) => (
            <Link key={s.n} href={s.href} className="path-step" style={{ padding: "10px 0" }}>
              <span className="path-dot" style={{ background: s.g }}>{s.n}</span>
              <div className="grow">
                <b>{s.t}</b>
                <div className="small muted">{s.d}</div>
              </div>
              <Icon name="right" size={18} />
            </Link>
          ))}
        </div>
        <div className="stack">
          <Link href="/learn/hangul" className="feature-visual" style={{ minHeight: 260, color: "#fff" }}>
            <div className="center">
              <div className="big-glyph" style={{ textShadow: "0 20px 50px rgba(0,0,0,.25)" }}>한글</div>
              <div style={{ fontWeight: 700, marginTop: 10 }}>Alifboni boshlash →</div>
            </div>
          </Link>
          <div className="card">
            <h3 className="h3" style={{ marginBottom: 12 }}>📚 Darslar</h3>
            <div className="row-wrap">
              {LESSONS.map((l) => (
                <Link key={l.id} href={`/learn/lessons#${l.id}`} className="chip">
                  {l.emoji} {l.title}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
