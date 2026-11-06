"use client";

import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Avatar, GoogleButton, useAuth } from "@/lib/auth";
import { TRIAL_DAYS } from "@/lib/access";
import { BRAND_VERSION } from "@/lib/images";
import { safePath, useSearch } from "./shared";

export function LoginView() {
  const { me, loading } = useAuth();
  const q = useSearch();
  const next = safePath(q.get("next"));
  const error = q.get("error");

  const errors: Record<string, string> = {
    config: "Google orqali kirish hali sozlanmagan: serverda GOOGLE_CLIENT_ID va GOOGLE_CLIENT_SECRET kerak.",
    denied: "Kirish bekor qilindi. Qaytadan urinib ko‘ring.",
    state: "Sessiya eskirib qoldi. Qaytadan kirib ko‘ring.",
    google: "Google bilan bog‘lanishda xato bo‘ldi. Birozdan keyin urinib ko‘ring.",
    db: "Server ma’lumotlar bazasi sozlanmagan (README’ga qarang).",
  };

  return (
    <main className="container page" style={{ maxWidth: 980 }}>
      <div className="grid-2" style={{ alignItems: "stretch" }}>
        <div className="result-hero stack" style={{ gap: 18, justifyContent: "center" }}>
          <span className="badge white" style={{ alignSelf: "flex-start" }}>
            🎁 {`${TRIAL_DAYS} kun bepul`}
          </span>
          <h1 className="h2" style={{ color: "#fff" }}>
            Bitta hisob — barcha AI imkoniyatlar
          </h1>
          <ul className="check-list" style={{ color: "#fff" }}>
            <li>Yozma ishni (51–54) AI baholaydi</li>
            <li>Gemini bilan ovozli suhbat va talaffuz</li>
            <li>Har bir savolga AI tushuntirish</li>
            <li>Cheksiz AI test variantlari va AI Ustoz</li>
            <li>Natijalar telefon va kompyuterda sinxron</li>
          </ul>
          <div className="small" style={{ opacity: 0.85 }}>
            Karta kerak emas. Hangul, darslar, so‘zlar va mock testlar har doim bepul.
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
              <h2 className="h3">{`Siz ${me.user.name} sifatida kirgansiz`}</h2>
              <div className="row-wrap" style={{ justifyContent: "center" }}>
                <Link href={next} className="btn btn-primary">
                  Davom etish <Icon name="right" size={18} />
                </Link>
                <Link href="/account" className="btn">
                  Profil
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="stack" style={{ gap: 8 }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- vektor logo (public/brand) */}
                <img src={`/brand/logo-mark.svg?v=${BRAND_VERSION}`} alt="HanUstoz" width={52} height={52} className="login-mark" />
                <h2 className="h2" style={{ fontSize: "1.6rem" }}>
                  HanUstoz’ga kirish
                </h2>
                <p className="muted" style={{ margin: 0 }}>
                  Gmail hisobingiz bilan bir bosishda kiring. Parol o‘ylab topish shart emas.
                </p>
              </div>
              {error && errors[error] && <div className="callout">{errors[error]}</div>}
              <GoogleButton next={next} block />
              <p className="tiny muted" style={{ margin: 0 }}>
                Kirish orqali siz faqat ismingiz, email va profil rasmingizni ulashasiz. Hangul, darslar, so‘zlar va mock testlar kirmasdan ham ishlaydi.
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
