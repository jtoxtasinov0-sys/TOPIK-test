"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { postJson, useAiErrorText } from "@/components/ui";
import { GoogleButton, useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";
import { discountPct, formatSum, MONTHLY_PRICE, perMonth, PLANS, TRIAL_DAYS, type PlanId } from "@/lib/plans";
import { fmtDate, PROVIDER_NAME, SUPPORT_URL } from "./shared";

type Provider = "payme" | "click";

export function PricingView() {
  const { L, lang } = useLang();
  const errText = useAiErrorText();
  const { me, loading } = useAuth();
  const [plan, setPlan] = useState<PlanId>("m3");
  const [choice, setChoice] = useState<Provider | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const providers = me?.providers ?? { payme: false, click: false };
  const anyProvider = providers.payme || providers.click;
  // Tanlanmagan bo'lsa — birinchi ulangan usul
  const provider: Provider | null = choice ?? (providers.payme ? "payme" : providers.click ? "click" : null);
  const selected = PLANS.find((p) => p.id === plan)!;
  const a = me?.access;

  const pay = async () => {
    if (!provider) return;
    setErr("");
    setBusy(true);
    try {
      const r = await postJson<{ url: string }>("/api/billing/checkout", { plan, provider, lang });
      window.location.href = r.url;
    } catch (e) {
      setErr(errText(e));
      setBusy(false);
    }
  };

  const rows: [string, boolean][] = [
    [L("Hangul, 12 ta dars va so‘z kartochkalari", "Хангыль, 12 уроков и карточки слов"), true],
    [L("TOPIK I va II mock testlar (brauzer ovozi bilan)", "Пробные TOPIK I и II (голос браузера)"), true],
    [L("Koreyada hayot qo‘llanmasi", "Гид по жизни в Корее"), true],
    [L("Tabiiy AI ovoz (Gemini TTS) tinglashda", "Естественный AI-голос (Gemini TTS)"), false],
    [L("Har bir savolga AI tushuntirish", "AI-объяснение каждого вопроса"), false],
    [L("Yozma ishni (51–54) AI baholashi", "AI-оценка письма (51–54)"), false],
    [L("Gemini bilan ovozli suhbat", "Голосовой разговор с Gemini"), false],
    [L("AI Ustoz chat", "Чат с AI Учителем"), false],
    [L("Cheksiz AI test variantlari", "Бесконечные AI-варианты тестов"), false],
  ];

  const faq: [string, string][] = [
    [
      L(`${TRIAL_DAYS} kunlik sinov qanday ishlaydi?`, `Как работает пробный период ${TRIAL_DAYS} дней?`),
      L(
        "Gmail orqali birinchi marta kirganingizda avtomatik boshlanadi. Karta talab qilinmaydi, barcha Premium imkoniyatlar ochiq bo‘ladi.",
        "Начинается автоматически при первом входе через Gmail. Карта не нужна, все Premium-функции открыты."
      ),
    ],
    [
      L("Pul avtomatik yechiladimi?", "Деньги списываются автоматически?"),
      L(
        "Yo‘q. Obuna oldindan to‘lanadi — muddat tugaganda o‘zingiz xohlasangiz uzaytirasiz. Kutilmagan to‘lovlar bo‘lmaydi.",
        "Нет. Подписка оплачивается заранее — когда срок закончится, вы сами решаете, продлевать ли её. Никаких неожиданных списаний."
      ),
    ],
    [
      L("Sinov paytida to‘lasam, bepul kunlarim kuyadimi?", "Если оплатить во время пробного периода, бесплатные дни сгорят?"),
      L(
        "Yo‘q. To‘langan muddat sinov (yoki oldingi obuna) tugaganidan keyin qo‘shiladi.",
        "Нет. Оплаченный срок добавляется после окончания пробного периода (или текущей подписки)."
      ),
    ],
    [
      L("Qaysi kartalar bilan to‘lash mumkin?", "Какими картами можно оплатить?"),
      L("Uzcard va Humo kartalari — Payme yoki Click ilovasi orqali.", "Картами Uzcard и Humo — через Payme или Click."),
    ],
    [
      L("Cheklovlar bormi?", "Есть ли ограничения?"),
      L(
        "Adolatli foydalanish uchun kunlik limit bor: masalan, kuniga 25 ta yozma ish tekshiruvi va 200 ta suhbat xabari. Oddiy o‘quvchiga bu bemalol yetadi.",
        "Для честного использования есть дневной лимит: например, 25 проверок письма и 200 реплик в разговоре в день. Обычному ученику этого с запасом хватает."
      ),
    ],
  ];

  return (
    <main className="container page">
      <div className="section-head center" style={{ alignItems: "center" }}>
        <span className="eyebrow">💎 Premium</span>
        <h1 className="h1">
          {L("Imtihonga ", "Готовьтесь к экзамену ")}
          <span className="gradient-text">{L("AI bilan tayyorlaning", "вместе с AI")}</span>
        </h1>
        <p className="lead" style={{ maxWidth: 640 }}>
          {L(
            `Birinchi ${TRIAL_DAYS} kun — bepul. Keyin oyiga ${formatSum(MONTHLY_PRICE)} so‘m: bitta repetitor darsidan ham arzon. Avtomatik yechib olish yo‘q.`,
            `Первые ${TRIAL_DAYS} дней — бесплатно. Затем ${formatSum(MONTHLY_PRICE)} сум в месяц — дешевле одного занятия с репетитором. Без автосписаний.`
          )}
        </p>
      </div>

      {a && me?.user && (
        <div className={`callout ${a.status === "expired" ? "" : "info"}`} style={{ marginBottom: 20 }}>
          <span>{a.status === "expired" ? "⏳" : a.status === "trial" ? "🎁" : "💎"}</span>
          <span>
            {a.status === "trial" &&
              L(`Bepul sinov: yana ${a.daysLeft} kun (${fmtDate(a.until, lang)} gacha).`, `Пробный период: ещё ${a.daysLeft} дн. (до ${fmtDate(a.until, lang)}).`)}
            {a.status === "active" &&
              L(`Premium faol: ${fmtDate(a.until, lang)} gacha. To‘lov muddatga qo‘shiladi.`, `Premium активен до ${fmtDate(a.until, lang)}. Оплата добавится к сроку.`)}
            {a.status === "expired" && L("Bepul sinov tugagan. Premium’ni faollashtiring.", "Пробный период закончился. Подключите Premium.")}
          </span>
        </div>
      )}

      <div className="plans" role="radiogroup" aria-label={L("Tarif", "Тариф")}>
        {PLANS.map((p) => {
          const off = discountPct(p);
          return (
            <button key={p.id} type="button" role="radio" aria-checked={plan === p.id} className={`plan ${plan === p.id ? "on" : ""}`} onClick={() => setPlan(p.id)}>
              {p.badge && (
                <span className={`badge ribbon ${p.badge === "best" ? "sun" : ""}`}>
                  {p.badge === "popular" ? L("Ommabop", "Популярный") : L("Eng foydali", "Самый выгодный")}
                </span>
              )}
              <div className="row between">
                <b className="h3">
                  {p.months} {L("oy", p.months === 1 ? "месяц" : p.months < 5 ? "месяца" : "месяцев")}
                </b>
                <span className="radio" />
              </div>
              <div className="price">
                {formatSum(p.price)} <small>{L("so‘m", "сум")}</small>
              </div>
              <div className="small muted">
                {p.months > 1
                  ? L(`Oyiga ${formatSum(perMonth(p))} so‘m · ${off}% tejaysiz`, `${formatSum(perMonth(p))} сум/мес · экономия ${off}%`)
                  : L("Har oy alohida to‘lanadi", "Оплата за каждый месяц")}
              </div>
            </button>
          );
        })}
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        {loading ? (
          <div className="center">
            <span className="spinner" />
          </div>
        ) : !me?.authEnabled ? (
          <div className="callout">{L("To‘lov tizimi hali sozlanmagan.", "Платёжная система ещё не настроена.")}</div>
        ) : !me.user ? (
          <div className="stack" style={{ gap: 14, alignItems: "center", textAlign: "center" }}>
            <b className="h3">{L(`Avval ${TRIAL_DAYS} kun bepul sinab ko‘ring`, `Сначала попробуйте ${TRIAL_DAYS} дней бесплатно`)}</b>
            <p className="muted" style={{ margin: 0 }}>
              {L("Gmail orqali kiring — sinov darhol boshlanadi, karta kerak emas.", "Войдите через Gmail — пробный период начнётся сразу, карта не нужна.")}
            </p>
            <GoogleButton next="/pricing" label={L("Kirish va bepul boshlash", "Войти и начать бесплатно")} />
          </div>
        ) : anyProvider ? (
          <div className="stack" style={{ gap: 16 }}>
            <b>{L("To‘lov usuli", "Способ оплаты")}</b>
            <div className="pay-opts">
              {(["payme", "click"] as const).map((pv) => (
                <button key={pv} type="button" className={`pay-opt ${provider === pv ? "on" : ""}`} disabled={!providers[pv]} onClick={() => setChoice(pv)}>
                  <span className="dot" style={{ background: pv === "payme" ? "#33cccc" : "#0068ff" }} />
                  {PROVIDER_NAME[pv]}
                </button>
              ))}
            </div>
            {err && <div className="callout">{err}</div>}
            <button className="btn btn-primary btn-lg btn-block" disabled={busy || !provider} onClick={pay}>
              {busy ? <span className="spinner white" /> : <Icon name="check" size={20} />}
              {L(`${formatSum(selected.price)} so‘m to‘lash`, `Оплатить ${formatSum(selected.price)} сум`)}
            </button>
            <p className="tiny muted center" style={{ margin: 0 }}>
              {L(
                `To‘lovdan so‘ng Premium avtomatik ${selected.days} kunga uzayadi. Hisobingiz: ${me.user.email}`,
                `После оплаты Premium автоматически продлится на ${selected.days} дн. Аккаунт: ${me.user.email}`
              )}
            </p>
          </div>
        ) : (
          <div className="stack" style={{ gap: 12, alignItems: "flex-start" }}>
            <div className="callout info">
              {L(
                "Onlayn to‘lov (Payme/Click) tez orada ulanadi. Hozircha obunani faollashtirish uchun administratorga yozing va emailingizni yuboring.",
                "Онлайн-оплата (Payme/Click) скоро будет подключена. Пока что для активации подписки напишите администратору и отправьте ваш email."
              )}
            </div>
            {SUPPORT_URL && (
              <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                <Icon name="send" size={18} /> {L("Administratorga yozish", "Написать администратору")}
              </a>
            )}
          </div>
        )}
      </div>

      <div className="grid-2" style={{ marginTop: 28, alignItems: "start" }}>
        <div className="card">
          <h2 className="h3" style={{ marginBottom: 10 }}>
            {L("Bepul va Premium", "Бесплатно и Premium")}
          </h2>
          <div className="table-wrap">
            <table className="compare">
              <thead>
                <tr>
                  <th />
                  <th>{L("Bepul", "Бесплатно")}</th>
                  <th className="gradient-text">Premium</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([t, free]) => (
                  <tr key={t}>
                    <td>{t}</td>
                    <td className={free ? "yes" : "no"}>{free ? "✓" : "—"}</td>
                    <td className="yes">✓</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card faq">
          <h2 className="h3" style={{ marginBottom: 4 }}>
            {L("Ko‘p so‘raladigan savollar", "Частые вопросы")}
          </h2>
          {faq.map(([q, ans]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{ans}</p>
            </details>
          ))}
          <p className="small muted" style={{ marginTop: 14 }}>
            <Link href="/account" style={{ color: "var(--p1)", fontWeight: 700 }}>
              {L("Profil va to‘lovlar tarixi →", "Профиль и история оплат →")}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
