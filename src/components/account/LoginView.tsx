"use client";

import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Avatar, GoogleButton, useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";
import { formatSum, MONTHLY_PRICE, TRIAL_DAYS } from "@/lib/plans";
import { safePath, useSearch } from "./shared";

export function LoginView() {
  const { L } = useLang();
  const { me, loading } = useAuth();
  const q = useSearch();
  const next = safePath(q.get("next"));
  const error = q.get("error");

  const errors: Record<string, string> = {
    config: L("Google orqali kirish hali sozlanmagan: serverda GOOGLE_CLIENT_ID va GOOGLE_CLIENT_SECRET kerak.", "Вход через Google ещё не настроен: на сервере нужны GOOGLE_CLIENT_ID и GOOGLE_CLIENT_SECRET."),
    denied: L("Kirish bekor qilindi. Qaytadan urinib ko‘ring.", "Вход отменён. Попробуйте ещё раз."),
    state: L("Sessiya eskirib qoldi. Qaytadan kirib ko‘ring.", "Сессия устарела. Попробуйте войти ещё раз."),
    google: L("Google bilan bog‘lanishda xato bo‘ldi. Birozdan keyin urinib ko‘ring.", "Ошибка связи с Google. Попробуйте чуть позже."),
    db: L("Server ma’lumotlar bazasi sozlanmagan (README’ga qarang).", "На сервере не настроена база данных (см. README)."),
  };

  return (
    <main className="container page" style={{ maxWidth: 980 }}>
      <div className="grid-2" style={{ alignItems: "stretch" }}>
        <div className="result-hero stack" style={{ gap: 18, justifyContent: "center" }}>
          <span className="badge white" style={{ alignSelf: "flex-start" }}>
            🎁 {L(`${TRIAL_DAYS} kun bepul`, `${TRIAL_DAYS} дней бесплатно`)}
          </span>
          <h1 className="h2" style={{ color: "#fff" }}>
            {L("Bitta hisob — barcha AI imkoniyatlar", "Один аккаунт — все AI-возможности")}
          </h1>
          <ul className="check-list" style={{ color: "#fff" }}>
            <li>{L("Yozma ishni (51–54) AI baholaydi", "AI оценивает письмо (51–54)")}</li>
            <li>{L("Gemini bilan ovozli suhbat va talaffuz", "Голосовой разговор с Gemini и произношение")}</li>
            <li>{L("Har bir savolga AI tushuntirish", "AI-объяснение каждого вопроса")}</li>
            <li>{L("Cheksiz AI test variantlari va AI Ustoz", "Бесконечные AI-варианты и AI Учитель")}</li>
            <li>{L("Natijalar telefon va kompyuterda sinxron", "Результаты синхронизируются на телефоне и ПК")}</li>
          </ul>
          <div className="small" style={{ opacity: 0.85 }}>
            {L(
              `Sinovdan keyin — oyiga ${formatSum(MONTHLY_PRICE)} so‘mdan. Avtomatik yechib olish yo‘q.`,
              `После пробного периода — от ${formatSum(MONTHLY_PRICE)} сум в месяц. Без автосписаний.`
            )}
          </div>
        </div>

        <div className="card stack" style={{ gap: 18, justifyContent: "center", padding: 32 }}>
          {loading ? (
            <div className="center">
              <span className="spinner" />
            </div>
          ) : me?.user ? (
            <div className="stack center" style={{ alignItems: "center", gap: 14 }}>
              <Avatar user={me.user} size={72} />
              <h2 className="h3">{L(`Siz ${me.user.name} sifatida kirgansiz`, `Вы вошли как ${me.user.name}`)}</h2>
              <div className="row-wrap" style={{ justifyContent: "center" }}>
                <Link href={next} className="btn btn-primary">
                  {L("Davom etish", "Продолжить")} <Icon name="right" size={18} />
                </Link>
                <Link href="/account" className="btn">
                  {L("Profil", "Профиль")}
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="stack" style={{ gap: 8 }}>
                <span className="logo-mark" style={{ width: 52, height: 52, fontSize: "1.5rem", borderRadius: 16, alignSelf: "flex-start" }}>
                  한
                </span>
                <h2 className="h2" style={{ fontSize: "1.6rem" }}>
                  {L("HanQadam’ga kirish", "Вход в HanQadam")}
                </h2>
                <p className="muted" style={{ margin: 0 }}>
                  {L("Gmail hisobingiz bilan bir bosishda kiring. Parol o‘ylab topish shart emas.", "Войдите в один клик через аккаунт Gmail. Пароль придумывать не нужно.")}
                </p>
              </div>
              {error && errors[error] && <div className="callout">{errors[error]}</div>}
              <GoogleButton next={next} block />
              <p className="tiny muted" style={{ margin: 0 }}>
                {L(
                  "Kirish orqali siz faqat ismingiz, email va profil rasmingizni ulashasiz. Hangul, darslar, so‘zlar va mock testlar kirmasdan ham ishlaydi.",
                  "При входе передаются только имя, email и фото профиля. Хангыль, уроки, слова и пробные тесты работают и без входа."
                )}
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
