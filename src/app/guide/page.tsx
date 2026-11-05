"use client";

import Link from "next/link";
import { Icon } from "@/components/Icon";
import { SpeakBtn } from "@/components/ui";
import { VisualOr } from "@/components/Visual";
import { APPS, EMERGENCY, FIRST_STEPS } from "@/data/guide";
import { LESSONS } from "@/data/lessons";

const SURVIVAL = ["hospital", "work", "office", "transport", "food"];

export default function GuidePage() {
  return (
    <main className="container page">
      <div className="section-head">
        <span className="eyebrow">🇰🇷 Koreyada hayot</span>
        <h1 className="h1">
          Koreyaga{" "}
          <span className="gradient-text">endi keldingizmi?</span>
        </h1>
        <p className="lead">
          Koreys tilini hali bilmasangiz ham kerakli raqamlar, ilovalar va eng muhim iboralar shu yerda. Iborani bosing — koreyscha ovoz chiqadi, telefoningizni xodimga ko‘rsating.
        </p>
      </div>

      <h2 className="h3" style={{ marginBottom: 12 }}>🚨 Favqulodda va yordam raqamlari</h2>
      <div className="grid-3">
        {EMERGENCY.map((e) => (
          <a key={e.num} href={`tel:${e.num}`} className="card hover row" style={{ padding: 16 }}>
            <VisualOr id={`guide:${e.num}`} emoji={e.emoji} size={56} />
            <div className="grow">
              <div className="display" style={{ fontSize: "1.4rem", fontWeight: 700 }}>{e.num}</div>
              <b className="small">{e.title}</b>
              <div className="tiny muted">{e.desc}</div>
            </div>
            <Icon name="phone" size={18} />
          </a>
        ))}
      </div>

      <h2 className="h3" style={{ margin: "30px 0 12px" }}>🧭 Birinchi qadamlar</h2>
      <div className="grid-2">
        {FIRST_STEPS.map((s) => (
          <div key={s.id} className="card row" style={{ alignItems: "flex-start" }}>
            <VisualOr id={`step:${s.id}`} emoji={s.emoji} size={56} />
            <div>
              <b>{s.title}</b>
              <p className="small muted" style={{ margin: "4px 0 0" }}>{s.text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="tiny muted" style={{ marginTop: 8 }}>
        ⚠️ Qoidalar o‘zgarishi mumkin — hujjatlar bo‘yicha 1345 yoki hikorea.go.kr orqali aniqlang.
      </div>

      <h2 className="h3" style={{ margin: "30px 0 12px" }}>📱 Foydali ilovalar</h2>
      <div className="grid-3">
        {APPS.map((a) => (
          <div key={a.name} className="card row" style={{ padding: 16 }}>
            <span style={{ fontSize: "1.6rem" }}>{a.emoji}</span>
            <div>
              <b className="small">{a.name}</b>
              <div className="tiny muted">{a.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <h2 className="h3" style={{ margin: "30px 0 12px" }}>💬 Hayotiy iboralar (ovoz bilan)</h2>
      <div className="grid-2">
        {LESSONS.filter((l) => SURVIVAL.includes(l.id)).map((l) => (
          <div key={l.id} className="card stack" style={{ gap: 6 }}>
            <div className="row between">
              <b>
                {l.emoji} {l.title}
              </b>
              <Link href={`/learn/lessons#${l.id}`} className="small" style={{ color: "var(--p1)", fontWeight: 800 }}>
                Dars →
              </Link>
            </div>
            {l.phrases.slice(0, 5).map((p) => (
              <div key={p.ko} className="row" style={{ padding: "8px 0", borderTop: "1px dashed var(--line)" }}>
                <div className="grow">
                  <div className="kr" style={{ fontWeight: 700 }}>{p.ko}</div>
                  <div className="tiny muted">{p.uz}</div>
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
          <b>Real vaziyatlarni AI bilan mashq qiling</b>
          <div className="small muted">Kasalxona, bank, migratsiya xizmati, zavod, uy ijarasi…</div>
        </div>
        <Icon name="right" size={18} />
      </Link>
    </main>
  );
}
