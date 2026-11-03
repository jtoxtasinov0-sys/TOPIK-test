"use client";

import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Avatar, GoogleButton, useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";
import { formatSum, TRIAL_DAYS } from "@/lib/plans";
import { fmtDate, PROVIDER_NAME, safePath, useSearch } from "./shared";

export function AccountView() {
  const { L, lang } = useLang();
  const { me, loading, logout } = useAuth();
  const q = useSearch();
  const welcome = q.get("welcome") === "1";
  const next = safePath(q.get("next"));

  if (loading) {
    return (
      <main className="container page" style={{ maxWidth: 860 }}>
        <div className="skeleton" style={{ height: 180 }} />
        <div className="skeleton" style={{ height: 140, marginTop: 16 }} />
      </main>
    );
  }

  if (!me?.authEnabled || !me.user) {
    return (
      <main className="container page" style={{ maxWidth: 560 }}>
        <div className="card stack center" style={{ alignItems: "center", gap: 16, padding: 32 }}>
          <span className="icon-tile">👤</span>
          <h1 className="h2" style={{ fontSize: "1.6rem" }}>
            {L("Profilga kirish", "Вход в профиль")}
          </h1>
          {me?.authEnabled ? (
            <>
              <p className="muted" style={{ margin: 0 }}>
                {L(`Gmail orqali kiring — ${TRIAL_DAYS} kunlik bepul sinov darhol boshlanadi.`, `Войдите через Gmail — пробный период на ${TRIAL_DAYS} дней начнётся сразу.`)}
              </p>
              <GoogleButton next="/account" />
            </>
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              {L("Hisob tizimi hali sozlanmagan. Barcha bo‘limlar kirmasdan ishlaydi.", "Система аккаунтов ещё не настроена. Все разделы работают без входа.")}
            </p>
          )}
        </div>
      </main>
    );
  }

  const u = me.user;
  const a = me.access;
  const orders = me.orders ?? [];
  // Sinov holatida daysLeft = sinovdan qolgan kunlar
  const trialUsed = a?.status === "trial" ? Math.min(TRIAL_DAYS, Math.max(0, TRIAL_DAYS - a.daysLeft)) : 0;

  const statusText = me.admin
    ? L("Admin — cheksiz kirish", "Админ — безлимитный доступ")
    : a?.status === "trial"
      ? L("Bepul sinov", "Пробный период")
      : a?.status === "active"
        ? "Premium"
        : L("Muddat tugagan", "Срок истёк");

  return (
    <main className="container page" style={{ maxWidth: 860 }}>
      {welcome && (
        <div className="result-hero" style={{ marginBottom: 18 }}>
          <div className="stack" style={{ gap: 10 }}>
            <span style={{ fontSize: "2rem" }}>🎉</span>
            <h1 className="h2" style={{ color: "#fff" }}>
              {L(`Xush kelibsiz, ${u.name}!`, `Добро пожаловать, ${u.name}!`)}
            </h1>
            <p style={{ margin: 0, opacity: 0.9 }}>
              {L(
                `${TRIAL_DAYS} kunlik bepul sinov boshlandi — ${fmtDate(a?.trialEndsAt, lang)} gacha barcha AI imkoniyatlar ochiq. Natijalaringiz endi bulutda saqlanadi.`,
                `Пробный период на ${TRIAL_DAYS} дней начался — до ${fmtDate(a?.trialEndsAt, lang)} открыты все AI-функции. Результаты теперь сохраняются в облаке.`
              )}
            </p>
            <Link href={next === "/account" ? "/" : next} className="btn btn-white" style={{ alignSelf: "flex-start" }}>
              {L("O‘qishni davom ettirish", "Продолжить обучение")} <Icon name="right" size={18} />
            </Link>
          </div>
        </div>
      )}

      <div className="grid-2" style={{ alignItems: "stretch" }}>
        <div className="card row" style={{ gap: 16 }}>
          <Avatar user={u} size={72} />
          <div className="grow">
            <h2 className="h3" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{u.name}</h2>
            <div className="small muted" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{u.email}</div>
            <div className="tiny muted" style={{ marginTop: 6 }}>
              {L("A’zo bo‘lgan sana:", "С нами с")} {fmtDate(u.createdAt, lang)}
            </div>
          </div>
        </div>

        <div className={`level-card ${a?.status === "expired" && !me.admin ? "" : "violet"}`} style={a?.status === "expired" && !me.admin ? { background: "var(--grad-sun)" } : undefined}>
          <div className="row between">
            <span className="small" style={{ fontWeight: 800, opacity: 0.95 }}>
              {statusText}
            </span>
            <span>{a?.status === "trial" ? "🎁" : a?.status === "active" || me.admin ? "💎" : "⏳"}</span>
          </div>
          {me.admin ? (
            <div className="display" style={{ fontSize: "2.2rem", fontWeight: 700, margin: "8px 0" }}>∞</div>
          ) : a && a.status !== "expired" ? (
            <>
              <div className="display" style={{ fontSize: "2.4rem", fontWeight: 700, margin: "6px 0 0" }}>
                {a.daysLeft} <span style={{ fontSize: "1rem" }}>{L("kun qoldi", "дн. осталось")}</span>
              </div>
              <div className="small" style={{ opacity: 0.9 }}>
                {fmtDate(a.until, lang)} {L("gacha", "— до этой даты")}
              </div>
              {a.status === "trial" && (
                <div style={{ marginTop: 10, height: 6, borderRadius: 9, background: "rgba(255,255,255,.25)" }}>
                  <div style={{ width: `${(trialUsed / TRIAL_DAYS) * 100}%`, height: "100%", borderRadius: 9, background: "#fff" }} />
                </div>
              )}
            </>
          ) : (
            <p style={{ margin: "10px 0" }}>
              {L("AI funksiyalari yopildi. Bepul bo‘limlar ishlashda davom etadi.", "AI-функции закрыты. Бесплатные разделы продолжают работать.")}
            </p>
          )}
          {!me.admin && (
            <Link href="/pricing" className="btn btn-white btn-sm" style={{ marginTop: 12 }}>
              {a?.status === "expired" ? L("Obunani faollashtirish", "Подключить подписку") : L("Muddatni uzaytirish", "Продлить")}
            </Link>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="row between" style={{ marginBottom: 8 }}>
          <h2 className="h3">{L("To‘lovlar tarixi", "История оплат")}</h2>
          <Icon name="calendar" size={18} />
        </div>
        {orders.length === 0 ? (
          <p className="small muted" style={{ margin: 0 }}>
            {L("Hali to‘lovlar yo‘q. To‘lov bo‘lgach, bu yerda ko‘rinadi (sahifani yangilang).", "Оплат пока нет. После оплаты она появится здесь (обновите страницу).")}
          </p>
        ) : (
          orders.map((o) => (
            <div key={o.id} className="row between" style={{ padding: "12px 0", borderTop: "1px dashed var(--line)" }}>
              <div>
                <b>
                  +{o.days} {L("kun", "дн.")}
                </b>
                <div className="tiny muted">
                  {fmtDate(o.paidAt, lang)} · {PROVIDER_NAME[o.provider]} · №{o.id}
                </div>
              </div>
              <b className="display">
                {formatSum(o.amount)} <span className="small muted">{L("so‘m", "сум")}</span>
              </b>
            </div>
          ))
        )}
      </div>

      <div className="grid-2" style={{ marginTop: 18 }}>
        <div className="card row" style={{ gap: 14 }}>
          <span className="icon-tile mint">☁️</span>
          <div>
            <b>{L("Natijalar bulutda", "Результаты в облаке")}</b>
            <div className="small muted">
              {L("Testlar tarixi, so‘zlar va streak barcha qurilmalaringizda bir xil.", "История тестов, слова и серия одинаковы на всех ваших устройствах.")}
            </div>
          </div>
        </div>
        <div className="card stack" style={{ gap: 10, justifyContent: "center" }}>
          {me.admin && (
            <Link href="/admin" className="btn btn-soft btn-block">
              🛠️ {L("Admin panel", "Админ-панель")}
            </Link>
          )}
          <Link href="/progress" className="btn btn-block">
            <Icon name="chart" size={18} /> {L("Natijalarim", "Мои результаты")}
          </Link>
          <button className="btn btn-danger btn-block" onClick={() => void logout()}>
            {L("Hisobdan chiqish", "Выйти из аккаунта")}
          </button>
        </div>
      </div>
    </main>
  );
}
