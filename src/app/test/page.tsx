"use client";

import Link from "next/link";
import { Icon } from "@/components/Icon";
import { TRIAL_DAYS } from "@/lib/access";
import { useLang } from "@/lib/i18n";

export default function TestHub() {
  const { L } = useLang();
  const cards = [
    {
      href: "/test/topik1",
      title: "TOPIK I",
      lv: "1급 · 2급",
      g: "var(--grad-mint)",
      rows: [
        ["🎧 듣기", "30", "40"],
        ["📖 읽기", "40", "60"],
      ],
      pass: L("80+ → 1급 · 140+ → 2급 (200 balldan)", "80+ → 1급 · 140+ → 2급 (из 200)"),
    },
    {
      href: "/test/topik2",
      title: "TOPIK II",
      lv: "3급 – 6급",
      g: "var(--grad)",
      rows: [
        ["🎧 듣기", "50", "60"],
        ["✍️ 쓰기", "4", "50"],
        ["📖 읽기", "50", "70"],
      ],
      pass: L("120+ → 3급 · 150+ → 4급 · 190+ → 5급 · 230+ → 6급", "120+ → 3급 · 150+ → 4급 · 190+ → 5급 · 230+ → 6급"),
    },
  ];
  return (
    <main className="container page">
      <div className="section-head">
        <span className="eyebrow">📝 Mock test</span>
        <h1 className="h1">
          {L("Darajangizni ", "Узнайте свой ")}
          <span className="gradient-text">{L("aniqlang", "уровень")}</span>
        </h1>
        <p className="lead">
          {L(
            "Imtihon rejimida — haqiqiy vaqt va qoidalar bilan. Mashq rejimida — har bir savoldan keyin AI o‘zbek yoki rus tilida tushuntiradi.",
            "В режиме экзамена — реальное время и правила. В режиме практики — после каждого вопроса объяснение AI на русском."
          )}
        </p>
      </div>
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="callout info">
          <span>🆓</span>
          <span>
            {L(
              `TOPIK I va TOPIK II asosiy variantlari — bepul, kirmasdan ham ishlaydi. AI tushuntirish, yozma ishni AI baholash va yangi AI variantlar — Gmail orqali kirib, ${TRIAL_DAYS} kun bepul.`,
              `Основные варианты TOPIK I и TOPIK II — бесплатно, даже без входа. AI-объяснения, AI-оценка письма и новые AI-варианты — после входа через Gmail, ${TRIAL_DAYS} дней бесплатно.`
            )}
          </span>
        </div>
        <div className="callout">
          <span>ℹ️</span>
          <span>
            {L(
              "Bu — mashq (mock) testi, rasmiy TOPIK imtihoni emas. Rasmiy imtihonni NIIED o‘tkazadi; bu sayt unga ro‘yxatdan o‘tkazmaydi. Natijalar taxminiy.",
              "Это пробный (mock) тест, а не официальный экзамен TOPIK. Официальный экзамен проводит NIIED; этот сайт не регистрирует на него. Результаты примерные."
            )}
          </span>
        </div>
      </div>

      <div className="grid-2">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="card hover" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ background: c.g, color: "#fff", padding: "28px 24px" }}>
              <span className="badge white">{c.lv}</span>
              <div className="display" style={{ fontSize: "2.2rem", fontWeight: 700, marginTop: 10 }}>{c.title}</div>
              <div className="small" style={{ opacity: 0.9 }}>{c.pass}</div>
            </div>
            <div style={{ padding: "8px 24px 20px" }}>
              {c.rows.map(([s, q, m]) => (
                <div key={s} className="row between" style={{ padding: "12px 0", borderBottom: "1px dashed var(--line)" }}>
                  <b className="kr">{s}</b>
                  <span className="small muted">
                    {q} {s.includes("쓰기") ? L("topshiriq", "задания") : L("savol", "вопросов")} · {m} {L("daqiqa", "мин")}
                  </span>
                </div>
              ))}
              <div className="row between" style={{ marginTop: 16 }}>
                <span style={{ fontWeight: 800, color: "var(--p1)" }}>{L("Boshlash", "Начать")}</span>
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
          <h3 className="h3">{L("Faqat yozish (쓰기)", "Только письмо (쓰기)")}</h3>
          <p className="small muted" style={{ margin: 0 }}>{L("50 daqiqa, daftardan rasm yuklash va AI baholash.", "50 минут, фото из тетради и оценка AI.")}</p>
        </Link>
        <div className="card stack" style={{ gap: 10 }}>
          <span className="icon-tile">✨</span>
          <h3 className="h3">{L("Cheksiz AI variantlar", "Бесконечные варианты AI")}</h3>
          <p className="small muted" style={{ margin: 0 }}>
            {L("Test sahifasida «AI bilan yangi variant» tugmasini bosing — Gemini rasmiy formatda yangi test tuzadi.", "На странице теста нажмите «Новый вариант с AI» — Gemini составит новый тест в официальном формате.")}
          </p>
        </div>
        <div className="card stack" style={{ gap: 10 }}>
          <span className="icon-tile mint">💡</span>
          <h3 className="h3">{L("Maslahat", "Совет")}</h3>
          <p className="small muted" style={{ margin: 0 }}>
            {L("Avval mashq rejimida xatolarni o‘rganing, keyin imtihon rejimida vaqt bilan sinab ko‘ring.", "Сначала разберите ошибки в режиме практики, затем проверьте себя на время в режиме экзамена.")}
          </p>
        </div>
      </div>
    </main>
  );
}
