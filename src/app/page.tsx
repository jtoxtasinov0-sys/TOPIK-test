"use client";

import Link from "next/link";
import { Icon } from "@/components/Icon";
import { useLang } from "@/lib/i18n";
import { daysUntil, DEFAULT_PROFILE, KEYS, type Profile, useStored } from "@/lib/store";
import type { HistoryItem } from "@/lib/exam";

const LEVELS = [
  { lv: "1급", s: "80+", c: "linear-gradient(160deg,#19c6a7,#3a86ff)" },
  { lv: "2급", s: "140+", c: "linear-gradient(160deg,#3a86ff,#5b4bff)" },
  { lv: "3급", s: "120+", c: "linear-gradient(160deg,#5b4bff,#8b3dff)" },
  { lv: "4급", s: "150+", c: "linear-gradient(160deg,#8b3dff,#b83dff)" },
  { lv: "5급", s: "190+", c: "linear-gradient(160deg,#b83dff,#ff5c9a)" },
  { lv: "6급", s: "230+", c: "linear-gradient(160deg,#ff5c9a,#ffad33)" },
];

function PhoneMock() {
  return (
    <div className="phones" aria-hidden>
      <div className="phone p2">
        <div className="notch" />
        <div className="screen" style={{ padding: "40px 14px 14px" }}>
          <div className="tiny muted" style={{ fontWeight: 700 }}>TOPIK II · 읽기</div>
          <div className="kr" style={{ fontWeight: 700, fontSize: ".78rem", margin: "8px 0", lineHeight: 1.5 }}>※ 다음 글의 주제로 가장 알맞은 것을 고르십시오.</div>
          <div className="kr" style={{ fontSize: ".66rem", background: "#fff", borderRadius: 10, padding: 8, lineHeight: 1.6, border: "1px solid #e9e5fb" }}>
            많은 사람들이 운동을 시작할 때 처음부터 무리한 목표를 세운다…
          </div>
          {["①", "②", "③", "④"].map((c, i) => (
            <div key={c} className="kr" style={{ fontSize: ".66rem", marginTop: 6, padding: "7px 8px", borderRadius: 9, background: i === 1 ? "rgba(139,61,255,.12)" : "#fff", border: `1.5px solid ${i === 1 ? "#8b3dff" : "#ebe7fb"}` }}>
              {c} {["매일 두 시간 운동", "작은 목표부터 시작", "식사량 줄이기", "걷기가 가장 쉽다"][i]}
            </div>
          ))}
          <div style={{ marginTop: 10, height: 6, borderRadius: 9, background: "rgba(139,61,255,.12)" }}>
            <div style={{ width: "62%", height: "100%", borderRadius: 9, background: "var(--grad-btn)" }} />
          </div>
        </div>
      </div>
      <div className="phone p1">
        <div className="notch" />
        <div className="screen" style={{ background: "linear-gradient(180deg,#efe7ff,#fff 60%)", padding: "38px 14px 14px" }}>
          <div className="row between">
            <div>
              <div className="tiny muted">Xush kelibsiz 👋</div>
              <div style={{ fontWeight: 800, fontSize: ".95rem" }}>Salom, Aziz</div>
            </div>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--grad-pink)" }} />
          </div>
          <div className="level-card violet" style={{ marginTop: 12, padding: 14, borderRadius: 18 }}>
            <div className="tiny" style={{ opacity: 0.85 }}>Taxminiy daraja</div>
            <div className="row between" style={{ alignItems: "flex-end" }}>
              <div className="kr" style={{ fontSize: "1.9rem", fontWeight: 800, lineHeight: 1.1 }}>4급</div>
              <div className="tiny" style={{ fontWeight: 800 }}>168 / 300</div>
            </div>
            <div style={{ marginTop: 8, height: 5, borderRadius: 9, background: "rgba(255,255,255,.25)" }}>
              <div style={{ width: "56%", height: "100%", borderRadius: 9, background: "#fff" }} />
            </div>
            <div className="tiny" style={{ marginTop: 6, opacity: 0.9 }}>Imtihongacha 74 kun ⏳</div>
          </div>
          <div className="row between" style={{ marginTop: 14 }}>
            {["📝", "✍️", "🗣️", "한"].map((e) => (
              <div key={e} className="kr" style={{ width: 42, height: 42, borderRadius: "50%", display: "grid", placeItems: "center", border: "1.5px solid #ddd6fb", background: "#fff", fontWeight: 800 }}>
                {e}
              </div>
            ))}
          </div>
          <div style={{ fontWeight: 800, fontSize: ".8rem", marginTop: 14 }}>So‘nggi natijalar</div>
          {[
            ["듣기", 72, "#8b3dff"],
            ["읽기", 61, "#3a86ff"],
            ["쓰기", 35, "#ff5c9a"],
          ].map(([k, v, c]) => (
            <div key={k as string} className="row" style={{ marginTop: 8, gap: 8 }}>
              <span className="kr tiny" style={{ width: 28, fontWeight: 700 }}>{k}</span>
              <div style={{ flex: 1, height: 7, borderRadius: 9, background: "#efe9ff" }}>
                <div style={{ width: `${v}%`, height: "100%", borderRadius: 9, background: c as string }} />
              </div>
              <span className="tiny" style={{ fontWeight: 800 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="hero-chip glass" style={{ top: 30, right: 6 }}>
        <span className="ic">🎧</span> 듣기 · AI audio
      </div>
      <div className="hero-chip glass" style={{ bottom: 40, left: 0, animationDelay: "-2s" }}>
        <span className="ic">📸</span> Daftardan AI tekshiruv
      </div>
      <div className="hero-chip glass" style={{ bottom: 120, right: -6, animationDelay: "-4s" }}>
        <span className="ic">🗣️</span> 말하기 · Gemini
      </div>
    </div>
  );
}

export default function Home() {
  const { L } = useLang();
  const [profile, setProfile] = useStored<Profile>(KEYS.profile, DEFAULT_PROFILE);
  const [history] = useStored<HistoryItem[]>(KEYS.history, []);
  const [streak] = useStored<{ last: string; count: number }>(KEYS.streak, { last: "", count: 0 });
  const days = daysUntil(profile.examDate);
  const last = history.find((h) => h.total > 0);

  const actions = [
    { href: "/test", e: "📝", t: L("Mock test", "Тест") },
    { href: "/writing", e: "✍️", t: L("Yozish", "Письмо") },
    { href: "/speak", e: "🗣️", t: L("Gaplashish", "Разговор") },
    { href: "/learn/hangul", e: "한", t: L("Hangul", "Хангыль") },
    { href: "/words", e: "🃏", t: L("So‘zlar", "Слова") },
    { href: "/tutor", e: "🤖", t: L("AI Ustoz", "AI Учитель") },
    { href: "/guide", e: "🇰🇷", t: L("Koreya", "Корея") },
  ];

  return (
    <main>
      {/* ---------- HERO ---------- */}
      <section className="hero">
        <div className="blob b1" />
        <div className="blob b2" />
        <div className="blob b3" />
        <div className="hero-noise" />
        <span className="float-kr" style={{ fontSize: 160, top: 20, left: "4%" }}>한</span>
        <span className="float-kr" style={{ fontSize: 110, bottom: 10, left: "42%", animationDelay: "-3s" }}>글</span>
        <span className="float-kr" style={{ fontSize: 90, top: 60, right: "38%", animationDelay: "-6s" }}>국</span>

        <div className="container hero-grid">
          <div className="stack" style={{ gap: 20 }}>
            <span className="badge white" style={{ alignSelf: "flex-start", padding: "7px 14px" }}>
              ✨ TOPIK I · TOPIK II · {L("0 dan", "с нуля")} · AI
            </span>
            <h1 className="h1">
              {L("Imtihondan oldin", "Узнайте свой")}
              <br />
              <span style={{ background: "linear-gradient(90deg,#fff,#ffd6f5,#bfe3ff)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
                {L("darajangizni biling", "уровень до экзамена")}
              </span>
            </h1>
            <p className="lead" style={{ maxWidth: 540 }}>
              {L(
                "Haqiqiy TOPIK formatidagi mock testlar, daftardagi yozma ishni AI tekshiruvi, Gemini bilan jonli suhbat va koreys tilini noldan o‘rganish — hammasi bitta joyda, bepul.",
                "Пробные тесты в формате настоящего TOPIK, проверка письма из тетради с AI, живой разговор с Gemini и корейский с нуля — всё в одном месте и бесплатно."
              )}
            </p>
            <div className="row-wrap">
              <Link href="/test" className="btn btn-white btn-lg">
                {L("Testni boshlash", "Начать тест")} <Icon name="right" size={20} />
              </Link>
              <Link href="/learn" className="btn btn-glass btn-lg">
                🌱 {L("0 dan o‘rganish", "Учить с нуля")}
              </Link>
            </div>
            <div className="stat-row" style={{ marginTop: 6 }}>
              <div>
                <div className="n">174+</div>
                <div className="l">{L("TOPIK savollari", "вопроса TOPIK")}</div>
              </div>
              <div>
                <div className="n">∞</div>
                <div className="l">{L("AI variantlar", "вариантов с AI")}</div>
              </div>
              <div>
                <div className="n">UZ · RU</div>
                <div className="l">{L("tushuntirishlar", "объяснения")}</div>
              </div>
            </div>
          </div>
          <PhoneMock />
        </div>
      </section>

      <div className="container" style={{ marginTop: -36, position: "relative", zIndex: 5 }}>
        {/* ---------- Shaxsiy panel ---------- */}
        <div className="grid-3">
          <div className="level-card" style={{ minHeight: 170 }}>
            <div className="row between">
              <span className="small" style={{ opacity: 0.9, fontWeight: 700 }}>{L("Imtihongacha", "До экзамена")}</span>
              <Icon name="calendar" size={18} />
            </div>
            <div className="display" style={{ fontSize: "2.4rem", fontWeight: 700, margin: "6px 0" }}>
              {days === null ? "—" : days > 0 ? days : 0} <span style={{ fontSize: "1rem" }}>{L("kun", "дн.")}</span>
            </div>
            <label className="small" style={{ display: "flex", gap: 8, alignItems: "center", opacity: 0.95 }}>
              {L("Sana:", "Дата:")}
              <input
                type="date"
                value={profile.examDate}
                onChange={(e) => setProfile({ ...profile, examDate: e.target.value })}
                style={{ background: "rgba(255,255,255,.2)", border: "1px solid rgba(255,255,255,.35)", color: "#fff", borderRadius: 10, padding: "4px 8px", colorScheme: "dark" }}
              />
            </label>
          </div>
          <div className="level-card violet" style={{ minHeight: 170 }}>
            <div className="row between">
              <span className="small" style={{ opacity: 0.9, fontWeight: 700 }}>{L("So‘nggi natija", "Последний результат")}</span>
              <Icon name="trophy" size={18} />
            </div>
            {last ? (
              <>
                <div className="kr" style={{ fontSize: "2.4rem", fontWeight: 800, margin: "4px 0" }}>{last.level ?? L("—", "—")}</div>
                <div className="small" style={{ opacity: 0.9 }}>
                  {last.title} · {last.total}/{last.max}
                  {last.estimated ? "*" : ""}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontWeight: 700, margin: "10px 0" }}>{L("Hali test topshirmadingiz", "Вы ещё не проходили тест")}</div>
                <Link href="/test" className="btn btn-white btn-sm">
                  {L("Darajani aniqlash", "Узнать уровень")}
                </Link>
              </>
            )}
          </div>
          <div className="card" style={{ minHeight: 170, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div className="row between">
              <span className="small muted" style={{ fontWeight: 700 }}>{L("Faollik seriyasi", "Серия активности")}</span>
              <span style={{ color: "var(--rose)" }}>
                <Icon name="flame" size={20} />
              </span>
            </div>
            <div className="display" style={{ fontSize: "2.4rem", fontWeight: 700 }}>
              {streak.count} <span style={{ fontSize: "1rem" }} className="muted">{L("kun", "дн.")}</span>
            </div>
            <div className="small muted">{L("Har kuni kamida bitta mashq qiling 🔥", "Занимайтесь хотя бы раз в день 🔥")}</div>
          </div>
        </div>

        {/* ---------- Tezkor harakatlar ---------- */}
        <div className="card" style={{ marginTop: 18 }}>
          <div className="actions">
            {actions.map((a) => (
              <Link key={a.href} href={a.href} className="action">
                <span className="ring kr" style={{ fontWeight: 800 }}>{a.e}</span>
                {a.t}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ---------- TOPIK I / II ---------- */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">📝 Mock test</span>
            <h2 className="h2">
              {L("Xuddi haqiqiy ", "Как на настоящем ")}
              <span className="gradient-text">TOPIK</span>
              {L(" kabi", "")}
            </h2>
            <p className="lead">{L("Savollar tartibi, yo‘riqnomalar, vaqt va ball tizimi — rasmiy formatda.", "Порядок вопросов, инструкции, время и баллы — в официальном формате.")}</p>
          </div>
          <div className="grid-2">
            {[
              { href: "/test/topik1", t: "TOPIK I", lv: "1–2급", q: "70", m: "100", max: 200, d: L("Boshlovchilar uchun: tinglash (30) va o‘qish (40)", "Для начинающих: аудирование (30) и чтение (40)"), g: "var(--grad-mint)" },
              { href: "/test/topik2", t: "TOPIK II", lv: "3–6급", q: "104", m: "180", max: 300, d: L("Tinglash (50), yozish (4) va o‘qish (50)", "Аудирование (50), письмо (4) и чтение (50)"), g: "var(--grad)" },
            ].map((x) => (
              <Link key={x.href} href={x.href} className="card hover" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ background: x.g, color: "#fff", padding: "26px 24px", position: "relative", overflow: "hidden" }}>
                  <span className="float-kr" style={{ fontSize: 120, right: 10, top: -20, color: "rgba(255,255,255,.14)" }}>{x.t === "TOPIK I" ? "初" : "高"}</span>
                  <div className="badge white">{x.lv}</div>
                  <div className="display" style={{ fontSize: "2rem", fontWeight: 700, marginTop: 10 }}>{x.t}</div>
                  <div style={{ opacity: 0.9, marginTop: 4 }}>{x.d}</div>
                </div>
                <div className="row between" style={{ padding: "16px 24px" }}>
                  <div className="row" style={{ gap: 20 }}>
                    <div><b className="display">{x.q}</b> <span className="small muted">{L("savol", "вопр.")}</span></div>
                    <div><b className="display">{x.m}</b> <span className="small muted">{L("daqiqa", "мин")}</span></div>
                    <div><b className="display">{x.max}</b> <span className="small muted">{L("ball", "баллов")}</span></div>
                  </div>
                  <span className="icon-btn primary sm"><Icon name="right" size={18} /></span>
                </div>
              </Link>
            ))}
          </div>
          <div className="card" style={{ marginTop: 20 }}>
            <div className="row between" style={{ marginBottom: 12, flexWrap: "wrap" }}>
              <b>{L("Darajalar shkalasi", "Шкала уровней")}</b>
              <span className="small muted">TOPIK I: 200 · TOPIK II: 300 {L("ball", "баллов")}</span>
            </div>
            <div className="levels">
              {LEVELS.map((l) => (
                <div key={l.lv} className="lv" style={{ background: l.c }}>
                  <b>{l.lv}</b>
                  <span>{l.s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Yozish ---------- */}
      <section className="section" style={{ background: "linear-gradient(180deg, transparent, rgba(139,61,255,.06), transparent)" }}>
        <div className="container feature">
          <div className="stack" style={{ gap: 16 }}>
            <span className="eyebrow">✍️ 쓰기 · Writing</span>
            <h2 className="h2">
              {L("Daftarga yozing — ", "Пишите в тетради — ")}
              <span className="gradient-text">{L("AI tekshiradi", "AI проверит")}</span>
            </h2>
            <p className="lead">
              {L(
                "51–54-topshiriqlarni vaqt bilan yozing, rasmga oling va yuklang. Gemini qo‘lyozmangizni o‘qiydi, rasmiy TOPIK mezonlari bo‘yicha ball qo‘yadi, xatolarni tuzatadi va namunaviy javob beradi.",
                "Пишите задания 51–54 на время, сфотографируйте и загрузите. Gemini распознает почерк, выставит баллы по официальным критериям TOPIK, исправит ошибки и покажет образец."
              )}
            </p>
            <div className="row-wrap">
              <span className="chip">⏱️ {L("Vaqt bilan", "На время")}</span>
              <span className="chip">📸 {L("Rasm yuklash", "Фото")}</span>
              <span className="chip">📊 {L("Mezonlar bo‘yicha ball", "Баллы по критериям")}</span>
              <span className="chip kr">원고지</span>
            </div>
            <Link href="/writing" className="btn btn-primary" style={{ alignSelf: "flex-start" }}>
              {L("Yozishni boshlash", "Начать письмо")} <Icon name="right" size={18} />
            </Link>
          </div>
          <div className="feature-visual">
            <div className="card" style={{ width: "min(360px, 100%)", transform: "rotate(-3deg)", padding: 18 }}>
              <div className="row between">
                <b className="small">54. 교육에서의 인공지능</b>
                <span className="badge green">38 / 50</span>
              </div>
              <div className="wongoji" style={{ marginTop: 12 }}>
                {Array.from("인공지능은교육현장에서많은변화를가져오고있다.첫째,학생개개인의수준에맞는학습이가능하다.").slice(0, 60).map((c, i) => (
                  <span key={i}>{c}</span>
                ))}
              </div>
              {[
                ["내용 및 과제 수행", 9, 12],
                ["글의 전개 구조", 10, 12],
                ["언어 사용", 19, 26],
              ].map(([n, s, m]) => (
                <div key={n as string} style={{ marginTop: 10 }}>
                  <div className="row between tiny kr" style={{ fontWeight: 700 }}>
                    <span>{n}</span>
                    <span>{s}/{m}</span>
                  </div>
                  <div className="bar thin" style={{ marginTop: 4 }}>
                    <i style={{ width: `${((s as number) / (m as number)) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Gaplashish ---------- */}
      <section className="section">
        <div className="container feature rev">
          <div className="stack" style={{ gap: 16 }}>
            <span className="eyebrow">🗣️ 말하기 · Gemini</span>
            <h2 className="h2">
              {L("AI bilan ", "Говорите с AI ")}
              <span className="gradient-text">{L("jonli gaplashing", "вживую")}</span>
            </h2>
            <p className="lead">
              {L(
                "Restoran, kasalxona, bank, migratsiya xizmati, zavod, ish suhbati… Gapiring — Gemini 3.5 Transcribe nutqingizni yozadi, AI xatolaringizni o‘zbekcha yoki ruscha tushuntiradi va koreyscha javob beradi.",
                "Ресторан, больница, банк, миграционная служба, завод, собеседование… Говорите — Gemini 3.5 Transcribe распознаёт речь, AI объясняет ошибки по-русски и отвечает по-корейски."
              )}
            </p>
            <Link href="/speak" className="btn btn-primary" style={{ alignSelf: "flex-start" }}>
              <Icon name="mic" size={18} /> {L("Suhbatni boshlash", "Начать разговор")}
            </Link>
          </div>
          <div className="feature-visual" style={{ background: "var(--grad-night)" }}>
            <div className="stack" style={{ width: "min(380px,100%)", gap: 12 }}>
              <div className="msg ai" style={{ maxWidth: "100%" }}>
                <div className="bubble">
                  <div className="ko">어서 오세요! 몇 분이세요?</div>
                  <div className="rom">eoseo oseyo! myeot buniseyo?</div>
                  <div className="tr">{L("Xush kelibsiz! Necha kishisiz?", "Добро пожаловать! Сколько вас?")}</div>
                </div>
              </div>
              <div className="msg me" style={{ maxWidth: "100%" }}>
                <div className="bubble">
                  <div className="ko">두 명이에요. 돼지고기 없는 메뉴 있어요?</div>
                </div>
              </div>
              <div className="feedback" style={{ alignSelf: "flex-end" }}>
                <span className="badge green">96 / 100</span> {L("Juda yaxshi! Tabiiy jumla 👏", "Отлично! Естественная фраза 👏")}
              </div>
              <div className="row" style={{ justifyContent: "center", marginTop: 6 }}>
                <span className="mic rec" style={{ width: 64, height: 64 }}>
                  <Icon name="mic" size={26} />
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Kimlar uchun ---------- */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-head center" style={{ alignItems: "center" }}>
            <span className="eyebrow">💜 {L("Kimlar uchun", "Для кого")}</span>
            <h2 className="h2">{L("Har bir bosqichda yoningizda", "Рядом на каждом этапе")}</h2>
          </div>
          <div className="grid-3">
            {[
              { e: "🌱", c: "mint", t: L("Noldan boshlovchilar", "Начинающие с нуля"), d: L("Hangul alifbosi, bo‘g‘in yasash, 12 ta hayotiy dars va ovozli talaffuz.", "Алфавит хангыль, сборка слогов, 12 жизненных уроков и озвучка."), href: "/learn" },
              { e: "🎓", c: "", t: L("TOPIK’ka tayyorlanuvchilar", "Готовящиеся к TOPIK"), d: L("To‘liq mock testlar, AI variantlar, yozma ish tekshiruvi va xatolar tahlili.", "Полные пробные тесты, варианты AI, проверка письма и разбор ошибок."), href: "/test" },
              { e: "🇰🇷", c: "pink", t: L("Koreyada yashayotganlar", "Живущие в Корее"), d: L("Kasalxona, bank, ish, uy ijarasi iboralari, favqulodda raqamlar va foydali ilovalar.", "Фразы для больницы, банка, работы, аренды, экстренные номера и приложения."), href: "/guide" },
            ].map((x) => (
              <Link key={x.href} href={x.href} className="card hover stack" style={{ gap: 12 }}>
                <span className={`icon-tile ${x.c}`}>{x.e}</span>
                <h3 className="h3">{x.t}</h3>
                <p className="muted" style={{ margin: 0 }}>{x.d}</p>
                <span className="small" style={{ color: "var(--p1)", fontWeight: 800 }}>
                  {L("Boshlash", "Начать")} →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container stack" style={{ gap: 8 }}>
          <div className="row between" style={{ flexWrap: "wrap", gap: 12 }}>
            <span style={{ fontWeight: 800, color: "var(--ink)" }}>HanQadam · 한걸음</span>
            <span>Gemini 3.8 Flash · Gemini 3.5 Transcribe · Gemini TTS</span>
          </div>
          <div>
            {L(
              "HanQadam — mustaqil o‘quv loyiha, rasmiy TOPIK (NIIED) sayti emas. Barcha test savollari original mashq materiallaridir. Natijalar taxminiy.",
              "HanQadam — независимый учебный проект, не официальный сайт TOPIK (NIIED). Все вопросы — оригинальные учебные материалы. Результаты примерные."
            )}
          </div>
        </div>
      </footer>
    </main>
  );
}
