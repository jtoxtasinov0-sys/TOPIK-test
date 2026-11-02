"use client";

import Link from "next/link";
import { Icon } from "@/components/Icon";
import { LESSONS } from "@/data/lessons";
import { useLang } from "@/lib/i18n";

export default function LearnHub() {
  const { L, tr } = useLang();
  const steps = [
    { n: 1, href: "/learn/hangul", t: L("Hangul alifbosi", "Алфавит хангыль"), d: L("40 ta harf, tovushi bilan — 1–2 kunda o‘qishni o‘rganasiz", "40 букв со звуком — научитесь читать за 1–2 дня"), g: "var(--grad-mint)" },
    { n: 2, href: "/learn/hangul#builder", t: L("Bo‘g‘in yasash", "Сборка слогов"), d: L("Harflarni bo‘g‘inga yig‘ing va eshiting", "Соберите слог из букв и послушайте"), g: "var(--grad-btn)" },
    { n: 3, href: "/learn/lessons", t: L("Hayotiy darslar", "Жизненные уроки"), d: L("12 ta dars: salomlashish, restoran, ish, kasalxona…", "12 уроков: приветствие, ресторан, работа, больница…"), g: "var(--grad)" },
    { n: 4, href: "/words", t: L("So‘z kartochkalari", "Карточки слов"), d: L("80 ta asosiy so‘z, takrorlash tizimi bilan", "80 базовых слов с системой повторения"), g: "var(--grad-pink)" },
    { n: 5, href: "/speak", t: L("AI bilan gaplashish", "Разговор с AI"), d: L("O‘rganganlaringizni jonli suhbatda qo‘llang", "Применяйте выученное в живом разговоре"), g: "var(--grad-sun)" },
    { n: 6, href: "/test/topik1", t: L("TOPIK I mock test", "Пробный TOPIK I"), d: L("Darajangizni tekshiring", "Проверьте свой уровень"), g: "var(--grad-night)" },
  ];
  return (
    <main className="container page">
      <div className="section-head">
        <span className="eyebrow">🌱 {L("0 dan boshlash", "С нуля")}</span>
        <h1 className="h1">
          {L("Koreys tili — ", "Корейский — ")}
          <span className="gradient-text">{L("qadam-baqadam", "шаг за шагом")}</span>
        </h1>
        <p className="lead">
          {L(
            "Koreyaga endi kelgan yoki hali umuman bilmaydiganlar uchun yo‘l xaritasi. Har bir so‘z va iborani ovoz bilan eshitish mumkin.",
            "Дорожная карта для тех, кто только приехал в Корею или совсем не знает язык. Каждое слово и фразу можно послушать."
          )}
        </p>
      </div>

      <div className="grid-2">
        <div className="card stack" style={{ gap: 4 }}>
          <h3 className="h3" style={{ marginBottom: 10 }}>🗺️ {L("Yo‘l xaritasi", "Дорожная карта")}</h3>
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
              <div style={{ fontWeight: 700, marginTop: 10 }}>{L("Alifboni boshlash →", "Начать алфавит →")}</div>
            </div>
          </Link>
          <div className="card">
            <h3 className="h3" style={{ marginBottom: 12 }}>📚 {L("Darslar", "Уроки")}</h3>
            <div className="row-wrap">
              {LESSONS.map((l) => (
                <Link key={l.id} href={`/learn/lessons#${l.id}`} className="chip">
                  {l.emoji} {tr(l.title)}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
