"use client";

import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Avatar, GoogleButton, useAuth } from "@/lib/auth";
import { TRIAL_DAYS } from "@/lib/access";
import { fmtDate, safePath, useSearch } from "./shared";

export function AccountView() {
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
            Profilga kirish
          </h1>
          {me?.authEnabled ? (
            <>
              <p className="muted" style={{ margin: 0 }}>
                {`Gmail orqali kiring — ${TRIAL_DAYS} kunlik bepul sinov darhol boshlanadi.`}
              </p>
              <GoogleButton next="/account" />
            </>
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              Hisob tizimi hali sozlanmagan. Barcha bo‘limlar kirmasdan ishlaydi.
            </p>
          )}
        </div>
      </main>
    );
  }

  const u = me.user;
  const a = me.access;
  const trialUsed = a?.status === "trial" ? Math.min(TRIAL_DAYS, Math.max(0, TRIAL_DAYS - a.daysLeft)) : 0;

  const statusText = me.admin
    ? "Admin — cheksiz kirish"
    : a?.status === "trial"
      ? "Bepul sinov"
      : "Bepul sinov tugagan";

  return (
    <main className="container page" style={{ maxWidth: 860 }}>
      {welcome && (
        <div className="result-hero" style={{ marginBottom: 18 }}>
          <div className="stack" style={{ gap: 10 }}>
            <span style={{ fontSize: "2rem" }}>🎉</span>
            <h1 className="h2" style={{ color: "#fff" }}>
              {`Xush kelibsiz, ${u.name}!`}
            </h1>
            <p style={{ margin: 0, opacity: 0.9 }}>
              {`${TRIAL_DAYS} kunlik bepul sinov boshlandi — ${fmtDate(a?.until)} gacha barcha AI imkoniyatlar ochiq. Natijalaringiz endi bulutda saqlanadi.`}
            </p>
            <Link href={next === "/account" ? "/" : next} className="btn btn-white" style={{ alignSelf: "flex-start" }}>
              O‘qishni davom ettirish <Icon name="right" size={18} />
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
              A’zo bo‘lgan sana: {fmtDate(u.createdAt)}
            </div>
          </div>
        </div>

        <div className={`level-card ${a?.status === "expired" && !me.admin ? "" : "violet"}`} style={a?.status === "expired" && !me.admin ? { background: "var(--grad-sun)" } : undefined}>
          <div className="row between">
            <span className="small" style={{ fontWeight: 800, opacity: 0.95 }}>
              {statusText}
            </span>
            <span>{me.admin ? "🛠️" : a?.status === "trial" ? "🎁" : "⏳"}</span>
          </div>
          {me.admin ? (
            <div className="display" style={{ fontSize: "2.2rem", fontWeight: 700, margin: "8px 0" }}>∞</div>
          ) : a && a.status !== "expired" ? (
            <>
              <div className="display" style={{ fontSize: "2.4rem", fontWeight: 700, margin: "6px 0 0" }}>
                {a.daysLeft} <span style={{ fontSize: "1rem" }}>kun qoldi</span>
              </div>
              <div className="small" style={{ opacity: 0.9 }}>
                {fmtDate(a.until)} gacha
              </div>
              <div style={{ marginTop: 10, height: 6, borderRadius: 9, background: "rgba(255,255,255,.25)" }}>
                <div style={{ width: `${(trialUsed / TRIAL_DAYS) * 100}%`, height: "100%", borderRadius: 9, background: "#fff" }} />
              </div>
            </>
          ) : (
            <p style={{ margin: "10px 0 0" }}>
              AI funksiyalari yopildi. Hangul, darslar, so‘zlar va mock testlar bepul ishlashda davom etadi.
            </p>
          )}
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 18 }}>
        <div className="card row" style={{ gap: 14 }}>
          <span className="icon-tile mint">☁️</span>
          <div>
            <b>Natijalar bulutda</b>
            <div className="small muted">
              Testlar tarixi, so‘zlar va streak barcha qurilmalaringizda bir xil.
            </div>
          </div>
        </div>
        <div className="card stack" style={{ gap: 10, justifyContent: "center" }}>
          {me.admin && (
            <Link href="/admin" className="btn btn-soft btn-block">
              🛠️ Admin panel
            </Link>
          )}
          <Link href="/progress" className="btn btn-block">
            <Icon name="chart" size={18} /> Natijalarim
          </Link>
          <button className="btn btn-danger btn-block" onClick={() => void logout()}>
            Hisobdan chiqish
          </button>
        </div>
      </div>
    </main>
  );
}
