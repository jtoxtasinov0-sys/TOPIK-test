"use client";

import Link from "next/link";
import { Icon } from "@/components/Icon";
import { SpeakBtn } from "@/components/ui";
import { APPS, EMERGENCY, FIRST_STEPS } from "@/data/guide";
import { LESSONS } from "@/data/lessons";
import { useLang } from "@/lib/i18n";

const SURVIVAL = ["hospital", "work", "office", "transport", "food"];

export default function GuidePage() {
  const { L, tr, lang } = useLang();
  return (
    <main className="container page">
      <div className="section-head">
        <span className="eyebrow">🇰🇷 {L("Koreyada hayot", "Жизнь в Корее")}</span>
        <h1 className="h1">
          {L("Koreyaga ", "Только приехали ")}
          <span className="gradient-text">{L("endi keldingizmi?", "в Корею?")}</span>
        </h1>
        <p className="lead">
          {L(
            "Koreys tilini hali bilmasangiz ham kerakli raqamlar, ilovalar va eng muhim iboralar shu yerda. Iborani bosing — koreyscha ovoz chiqadi, telefoningizni xodimga ko‘rsating.",
            "Даже если вы ещё не знаете корейский — здесь нужные номера, приложения и главные фразы. Нажмите на фразу — прозвучит по-корейски, покажите телефон сотруднику."
          )}
        </p>
      </div>

      <h2 className="h3" style={{ marginBottom: 12 }}>🚨 {L("Favqulodda va yordam raqamlari", "Экстренные и справочные номера")}</h2>
      <div className="grid-3">
        {EMERGENCY.map((e) => (
          <a key={e.num} href={`tel:${e.num}`} className="card hover row" style={{ padding: 16 }}>
            <span className="icon-tile night" style={{ fontSize: "1.4rem" }}>{e.emoji}</span>
            <div className="grow">
              <div className="display" style={{ fontSize: "1.4rem", fontWeight: 700 }}>{e.num}</div>
              <b className="small">{tr(e.title)}</b>
              <div className="tiny muted">{tr(e.desc)}</div>
            </div>
            <Icon name="phone" size={18} />
          </a>
        ))}
      </div>

      <h2 className="h3" style={{ margin: "30px 0 12px" }}>🧭 {L("Birinchi qadamlar", "Первые шаги")}</h2>
      <div className="grid-2">
        {FIRST_STEPS.map((s) => (
          <div key={s.emoji} className="card row" style={{ alignItems: "flex-start" }}>
            <span style={{ fontSize: "1.8rem" }}>{s.emoji}</span>
            <div>
              <b>{tr(s.title)}</b>
              <p className="small muted" style={{ margin: "4px 0 0" }}>{tr(s.text)}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="tiny muted" style={{ marginTop: 8 }}>
        ⚠️ {L("Qoidalar o‘zgarishi mumkin — hujjatlar bo‘yicha 1345 yoki hikorea.go.kr orqali aniqlang.", "Правила могут меняться — уточняйте по номеру 1345 или на hikorea.go.kr.")}
      </div>

      <h2 className="h3" style={{ margin: "30px 0 12px" }}>📱 {L("Foydali ilovalar", "Полезные приложения")}</h2>
      <div className="grid-3">
        {APPS.map((a) => (
          <div key={a.name} className="card row" style={{ padding: 16 }}>
            <span style={{ fontSize: "1.6rem" }}>{a.emoji}</span>
            <div>
              <b className="small">{a.name}</b>
              <div className="tiny muted">{tr(a.desc)}</div>
            </div>
          </div>
        ))}
      </div>

      <h2 className="h3" style={{ margin: "30px 0 12px" }}>💬 {L("Hayotiy iboralar (ovoz bilan)", "Жизненные фразы (со звуком)")}</h2>
      <div className="grid-2">
        {LESSONS.filter((l) => SURVIVAL.includes(l.id)).map((l) => (
          <div key={l.id} className="card stack" style={{ gap: 6 }}>
            <div className="row between">
              <b>
                {l.emoji} {tr(l.title)}
              </b>
              <Link href={`/learn/lessons#${l.id}`} className="small" style={{ color: "var(--p1)", fontWeight: 800 }}>
                {L("Dars →", "Урок →")}
              </Link>
            </div>
            {l.phrases.slice(0, 5).map((p) => (
              <div key={p.ko} className="row" style={{ padding: "8px 0", borderTop: "1px dashed var(--line)" }}>
                <div className="grow">
                  <div className="kr" style={{ fontWeight: 700 }}>{p.ko}</div>
                  <div className="tiny muted">{lang === "ru" ? p.ru : p.uz}</div>
                </div>
                <SpeakBtn text={p.ko} opts={{ slow: true }} />
              </div>
            ))}
          </div>
        ))}
      </div>

      <Link href="/speak" className="card hover row" style={{ marginTop: 20 }}>
        <span className="icon-tile pink">🗣️</span>
        <div className="grow">
          <b>{L("Real vaziyatlarni AI bilan mashq qiling", "Тренируйте реальные ситуации с AI")}</b>
          <div className="small muted">{L("Kasalxona, bank, migratsiya xizmati, zavod, uy ijarasi…", "Больница, банк, миграционная служба, завод, аренда…")}</div>
        </div>
        <Icon name="right" size={18} />
      </Link>
    </main>
  );
}
