"use client";

import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Visual } from "@/components/Visual";
import { InstallApp } from "@/components/Pwa";
import type { VisualId } from "@/data/visuals";
import { daysUntil, DEFAULT_PROFILE, KEYS, type Profile, useStored } from "@/lib/store";
import { TRIAL_DAYS } from "@/lib/access";
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
  const [profile, setProfile] = useStored<Profile>(KEYS.profile, DEFAULT_PROFILE);
  const [history] = useStored<HistoryItem[]>(KEYS.history, []);
  const [streak] = useStored<{ last: string; count: number }>(KEYS.streak, { last: "", count: 0 });
  const days = daysUntil(profile.examDate);
  const last = history.find((h) => h.total > 0);

  const actions: { href: string; v: VisualId; t: string }[] = [
    { href: "/test", v: "home:test", t: "Mock test" },
    { href: "/writing", v: "home:writing", t: "Yozish" },
    { href: "/speak", v: "home:speak", t: "Gaplashish" },
    { href: "/speak/ustoz", v: "home:ustoz", t: "Ovozli ustoz" },
    { href: "/learn/hangul", v: "home:hangul", t: "Hangul" },
    { href: "/words", v: "home:words", t: "So‘zlar" },
    { href: "/tutor", v: "home:tutor", t: "AI Ustoz" },
    { href: "/guide", v: "home:guide", t: "Koreya" },
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
              ✨ TOPIK I · TOPIK II · 0 dan · AI
            </span>
            <h1 className="h1">
              Imtihondan oldin
              <br />
              <span style={{ background: "linear-gradient(90deg,#fff,#ffd6f5,#bfe3ff)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
                darajangizni biling
              </span>
            </h1>
            <p className="lead" style={{ maxWidth: 540 }}>
              Haqiqiy TOPIK formatidagi mock testlar, daftardagi yozma ishni AI tekshiruvi, Gemini bilan jonli suhbat va koreys tilini noldan o‘rganish — hammasi bitta joyda. Gmail orqali kiring — AI {TRIAL_DAYS} kun bepul.
            </p>
            <div className="row-wrap">
              <Link href="/test" className="btn btn-white btn-lg">
                Testni boshlash <Icon name="right" size={20} />
              </Link>
              <Link href="/learn" className="btn btn-glass btn-lg">
                🌱 0 dan o‘rganish
              </Link>
            </div>
            <div className="stat-row" style={{ marginTop: 6 }}>
              <div>
                <div className="n">174+</div>
                <div className="l">TOPIK savollari</div>
              </div>
              <div>
                <div className="n">∞</div>
                <div className="l">AI variantlar</div>
              </div>
              <div>
                <div className="n">AI</div>
                <div className="l">o‘zbekcha tushuntirish</div>
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
              <span className="small" style={{ opacity: 0.9, fontWeight: 700 }}>Imtihongacha</span>
              <Icon name="calendar" size={18} />
            </div>
            <div className="display" style={{ fontSize: "2.4rem", fontWeight: 700, margin: "6px 0" }}>
              {days === null ? "—" : days > 0 ? days : 0} <span style={{ fontSize: "1rem" }}>kun</span>
            </div>
            <label className="small" style={{ display: "flex", gap: 8, alignItems: "center", opacity: 0.95 }}>
              Sana:
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
              <span className="small" style={{ opacity: 0.9, fontWeight: 700 }}>So‘nggi natija</span>
              <Icon name="trophy" size={18} />
            </div>
            {last ? (
              <>
                <div className="kr" style={{ fontSize: "2.4rem", fontWeight: 800, margin: "4px 0" }}>{last.level ?? "—"}</div>
                <div className="small" style={{ opacity: 0.9 }}>
                  {last.title} · {last.total}/{last.max}
                  {last.estimated ? "*" : ""}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontWeight: 700, margin: "10px 0" }}>Hali test topshirmadingiz</div>
                <Link href="/test" className="btn btn-white btn-sm">
                  Darajani aniqlash
                </Link>
              </>
            )}
          </div>
          <div className="card" style={{ minHeight: 170, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div className="row between">
              <span className="small muted" style={{ fontWeight: 700 }}>Faollik seriyasi</span>
              <span style={{ color: "var(--rose)" }}>
                <Icon name="flame" size={20} />
              </span>
            </div>
            <div className="display" style={{ fontSize: "2.4rem", fontWeight: 700 }}>
              {streak.count} <span style={{ fontSize: "1rem" }} className="muted">kun</span>
            </div>
            <div className="small muted">Har kuni kamida bitta mashq qiling 🔥</div>
          </div>
        </div>

        <InstallApp />

        {/* ---------- Tezkor harakatlar ---------- */}
        <div className="card" style={{ marginTop: 18 }}>
          <div className="actions">
            {actions.map((a) => (
              <Link key={a.href} href={a.href} className="action">
                <span className="ring has-img">
                  <Visual id={a.v} size={66} eager />
                </span>
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
              Xuddi haqiqiy{" "}
              <span className="gradient-text">TOPIK</span>
               {" "}kabi
            </h2>
            <p className="lead">Savollar tartibi, yo‘riqnomalar, vaqt va ball tizimi — rasmiy formatda.</p>
          </div>
          <div className="grid-3">
            {[
              { href: "/test/topik1", t: "TOPIK I", lv: "1–2급", q: "70", m: "100", max: 200, d: "Boshlovchilar uchun: tinglash (30) va o‘qish (40)", g: "var(--grad-mint)" },
              { href: "/test/topik2", t: "TOPIK II", lv: "3–6급", q: "104", m: "180", max: 300, d: "Tinglash (50), yozish (4) va o‘qish (50)", g: "var(--grad)" },
              { href: "/test/eps", t: "EPS-TOPIK", lv: "Ishchilar", q: "40", m: "50", max: 100, d: "Koreyaga ishga borish uchun: o‘qish (20) va tinglash (20)", g: "var(--grad-sun)" },
            ].map((x) => (
              <Link key={x.href} href={x.href} className="card hover" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ background: x.g, color: "#fff", padding: "26px 24px", position: "relative", overflow: "hidden" }}>
                  <span className="float-kr" style={{ fontSize: 120, right: 10, top: -20, color: "rgba(255,255,255,.14)" }}>{x.t === "TOPIK I" ? "初" : x.t === "TOPIK II" ? "高" : "工"}</span>
                  <div className="badge white">{x.lv}</div>
                  <div className="display" style={{ fontSize: "2rem", fontWeight: 700, marginTop: 10 }}>{x.t}</div>
                  <div style={{ opacity: 0.9, marginTop: 4 }}>{x.d}</div>
                </div>
                <div className="row between" style={{ padding: "16px 24px" }}>
                  <div className="row" style={{ gap: 20 }}>
                    <div><b className="display">{x.q}</b> <span className="small muted">savol</span></div>
                    <div><b className="display">{x.m}</b> <span className="small muted">daqiqa</span></div>
                    <div><b className="display">{x.max}</b> <span className="small muted">ball</span></div>
                  </div>
                  <span className="icon-btn primary sm"><Icon name="right" size={18} /></span>
                </div>
              </Link>
            ))}
          </div>
          <div className="card" style={{ marginTop: 20 }}>
            <div className="row between" style={{ marginBottom: 12, flexWrap: "wrap" }}>
              <b>Darajalar shkalasi</b>
              <span className="small muted">TOPIK I: 200 · TOPIK II: 300 ball</span>
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
              Daftarga yozing —{" "}
              <span className="gradient-text">AI tekshiradi</span>
            </h2>
            <p className="lead">
              51–54-topshiriqlarni vaqt bilan yozing, rasmga oling va yuklang. Gemini qo‘lyozmangizni o‘qiydi, rasmiy TOPIK mezonlari bo‘yicha ball qo‘yadi, xatolarni tuzatadi va namunaviy javob beradi.
            </p>
            <div className="row-wrap">
              <span className="chip">⏱️ Vaqt bilan</span>
              <span className="chip">📸 Rasm yuklash</span>
              <span className="chip">📊 Mezonlar bo‘yicha ball</span>
              <span className="chip kr">원고지</span>
            </div>
            <Link href="/writing" className="btn btn-primary" style={{ alignSelf: "flex-start" }}>
              Yozishni boshlash <Icon name="right" size={18} />
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
              AI bilan{" "}
              <span className="gradient-text">jonli gaplashing</span>
            </h2>
            <p className="lead">
              Restoran, kasalxona, bank, migratsiya xizmati, zavod, ish suhbati… Gapiring — Gemini 3.5 Transcribe nutqingizni yozadi, AI xatolaringizni o‘zbekcha tushuntiradi va koreyscha javob beradi.
              Erkin suhbatda esa koreys do‘st bilan tez-tez gaplashasiz: bilmagan so‘zingizni o‘zbekcha aytsangiz, u tushuntirib, yana koreyscha davom etadi.
            </p>
            <div className="row-wrap" style={{ gap: 10 }}>
              <Link href="/speak" className="btn btn-primary">
                <Icon name="mic" size={18} /> Suhbatni boshlash
              </Link>
              <Link href="/speak/free" className="btn">
                <Icon name="chat" size={18} /> Erkin suhbat
              </Link>
            </div>
          </div>
          <div className="feature-visual" style={{ background: "var(--grad-night)" }}>
            <div className="stack" style={{ width: "min(380px,100%)", gap: 12 }}>
              <div className="msg ai" style={{ maxWidth: "100%" }}>
                <div className="bubble">
                  <div className="ko">어서 오세요! 몇 분이세요?</div>
                  <div className="rom">eoseo oseyo! myeot buniseyo?</div>
                  <div className="tr">Xush kelibsiz! Necha kishisiz?</div>
                </div>
              </div>
              <div className="msg me" style={{ maxWidth: "100%" }}>
                <div className="bubble">
                  <div className="ko">두 명이에요. 돼지고기 없는 메뉴 있어요?</div>
                </div>
              </div>
              <div className="feedback" style={{ alignSelf: "flex-end" }}>
                <span className="badge green">96 / 100</span> Juda yaxshi! Tabiiy jumla 👏
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
            <span className="eyebrow">💜 Kimlar uchun</span>
            <h2 className="h2">Har bir bosqichda yoningizda</h2>
          </div>
          <div className="grid-3">
            {[
              { v: "who:beginner" as const, t: "Noldan boshlovchilar", d: "Hangul alifbosi, bo‘g‘in yasash, 12 ta hayotiy dars, 125 ta grammatika kartochkasi va ovozli talaffuz.", href: "/learn" },
              { v: "who:topik" as const, t: "TOPIK va EPS-TOPIK’ka tayyorlanuvchilar", d: "To‘liq mock testlar, AI variantlar, yozma ish tekshiruvi va xatolar tahlili.", href: "/test" },
              { v: "who:korea" as const, t: "Koreyada yashayotganlar", d: "Kasalxona, bank, ish, uy ijarasi iboralari, favqulodda raqamlar va foydali ilovalar.", href: "/guide" },
            ].map((x) => (
              <Link key={x.href} href={x.href} className="card hover stack" style={{ gap: 12 }}>
                <Visual id={x.v} size={72} shape="tile" />
                <h3 className="h3">{x.t}</h3>
                <p className="muted" style={{ margin: 0 }}>{x.d}</p>
                <span className="small" style={{ color: "var(--p1)", fontWeight: 800 }}>
                  Boshlash →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Bepul sinov ---------- */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="result-hero" style={{ padding: "34px 26px" }}>
            <div className="feature" style={{ gap: 24 }}>
              <div className="stack" style={{ gap: 14 }}>
                <span className="badge white" style={{ alignSelf: "flex-start" }}>🎁 Bepul sinov</span>
                <h2 className="h2" style={{ color: "#fff" }}>
                  {`${TRIAL_DAYS} kun — barcha AI imkoniyatlar bepul`}
                </h2>
                <p style={{ margin: 0, opacity: 0.9 }}>
                  Gmail orqali kiring — karta kerak emas. AI tekshiruv, Gemini bilan suhbat, AI Ustoz va AI variantlar darhol ochiladi.
                </p>
                <div className="row-wrap">
                  <Link href="/login" className="btn btn-white btn-lg">
                    Bepul boshlash <Icon name="right" size={20} />
                  </Link>
                </div>
              </div>
              <ul className="check-list" style={{ color: "#fff" }}>
                <li>Parolsiz, bir bosishda kirish</li>
                <li>Natijalar barcha qurilmalarda sinxron</li>
                <li>Hangul, darslar, so‘zlar va mock testlar har doim bepul</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container stack" style={{ gap: 8 }}>
          <div className="row between" style={{ flexWrap: "wrap", gap: 12 }}>
            <span style={{ fontWeight: 800, color: "var(--ink)" }}>HanUstoz · 한국어 선생님</span>
            <span>Gemini 3.8 Flash · Gemini 3.5 Transcribe · Gemini TTS</span>
          </div>
          <div>
            HanUstoz — mustaqil o‘quv loyiha, rasmiy TOPIK (NIIED) sayti emas. Barcha test savollari original mashq materiallaridir. Natijalar taxminiy.
          </div>
        </div>
      </footer>
    </main>
  );
}
