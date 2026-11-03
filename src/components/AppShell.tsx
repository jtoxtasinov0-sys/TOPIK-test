"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Avatar, useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";
import { Icon } from "./Icon";

export function Logo() {
  return (
    <Link href="/" className="logo" aria-label="HanUstoz">
      <span className="logo-mark">한</span>
      <span>
        Han<span className="gradient-text">Ustoz</span>
      </span>
    </Link>
  );
}

export function LangSwitch() {
  const { lang, setLang } = useLang();
  return (
    <div className="lang-switch" role="group" aria-label="Til / Язык">
      <button className={lang === "uz" ? "on" : ""} onClick={() => setLang("uz")}>
        UZ
      </button>
      <button className={lang === "ru" ? "on" : ""} onClick={() => setLang("ru")}>
        RU
      </button>
    </div>
  );
}

/** Yuqori paneldagi hisob tugmasi: kirish yoki avatar + qolgan kunlar */
function AccountButton() {
  const { L } = useLang();
  const { me, login } = useAuth();
  if (!me?.authEnabled) return null;
  if (!me.user) {
    return (
      <button className="btn btn-primary btn-sm login-btn" onClick={() => login()}>
        <Icon name="user" size={16} /> {L("Kirish", "Войти")}
      </button>
    );
  }
  const a = me.access;
  const pill =
    me.admin || !a
      ? null
      : a.status === "expired"
        ? { cls: "red", text: L("Sinov tugadi", "Пробный период истёк") }
        : { cls: a.daysLeft <= 5 ? "amber" : "", text: `🎁 ${a.daysLeft} ${L("kun", "дн.")}` };
  return (
    <>
      {pill && (
        <Link href="/account" className={`badge ${pill.cls} hide-mobile`} style={{ padding: "7px 12px" }}>
          {pill.text}
        </Link>
      )}
      <Link href="/account" aria-label={L("Profil", "Профиль")} className="avatar-link">
        <Avatar user={me.user} size={36} />
      </Link>
    </>
  );
}

export function useNav() {
  const { L } = useLang();
  return [
    { href: "/", icon: "home", label: L("Bosh sahifa", "Главная"), emoji: "🏠" },
    { href: "/test", icon: "test", label: L("Testlar", "Тесты"), emoji: "📝" },
    { href: "/writing", icon: "pen", label: L("Yozish", "Письмо"), emoji: "✍️" },
    { href: "/speak", icon: "mic", label: L("Gaplashish", "Разговор"), emoji: "🗣️" },
    { href: "/learn", icon: "book", label: L("0 dan o‘rganish", "С нуля"), emoji: "🌱" },
    { href: "/words", icon: "cards", label: L("So‘zlar", "Слова"), emoji: "🃏" },
    { href: "/tutor", icon: "spark", label: L("AI Ustoz", "AI Учитель"), emoji: "🤖" },
    { href: "/guide", icon: "map", label: L("Koreyada hayot", "Жизнь в Корее"), emoji: "🇰🇷" },
    { href: "/progress", icon: "chart", label: L("Natijalarim", "Мои результаты"), emoji: "📈" },
    { href: "/account", icon: "user", label: L("Profil", "Профиль"), emoji: "👤" },
  ];
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { L } = useLang();
  const nav = useNav();
  const [more, setMore] = useState(false);

  const isOn = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const desktop = nav.filter((n) => !["/", "/progress", "/account"].includes(n.href));

  return (
    <>
      <header className="topbar">
        <div className="container topbar-in">
          <Logo />
          <nav className="nav-links hide-mobile" aria-label="Asosiy">
            {desktop.map((n) => (
              <Link key={n.href} href={n.href} className={isOn(n.href) ? "on" : ""}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="grow" />
          <LangSwitch />
          <AccountButton />
          <button className="icon-btn sm hide-mobile" onClick={() => setMore(true)} aria-label={L("Barcha bo‘limlar", "Все разделы")}>
            <Icon name="grid" size={18} />
          </button>
        </div>
      </header>

      {children}

      <nav className="pillnav" aria-label="Mobil menyu">
        <Link href="/" className={pathname === "/" ? "on" : ""} aria-label={nav[0].label}>
          <Icon name="home" />
        </Link>
        <Link href="/test" className={isOn("/test") ? "on" : ""} aria-label={nav[1].label}>
          <Icon name="test" />
        </Link>
        <Link href="/speak" className="center" aria-label={nav[3].label}>
          <Icon name="mic" size={26} />
        </Link>
        <Link href="/learn" className={isOn("/learn") ? "on" : ""} aria-label={nav[4].label}>
          <Icon name="book" />
        </Link>
        <button className={more ? "on" : ""} onClick={() => setMore(true)} aria-label={L("Yana", "Ещё")}>
          <Icon name="grid" />
        </button>
      </nav>

      {more && (
        <>
          <div className="sheet-backdrop" onClick={() => setMore(false)} />
          <div className="sheet" role="dialog" aria-modal="true">
            <div className="sheet-handle" />
            <div className="row between" style={{ marginBottom: 14 }}>
              <h3 className="h3">{L("Barcha bo‘limlar", "Все разделы")}</h3>
              <button className="icon-btn sm" onClick={() => setMore(false)} aria-label="Yopish">
                <Icon name="x" size={18} />
              </button>
            </div>
            <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {nav.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={() => setMore(false)}
                  className="card flat center"
                  style={{ padding: "16px 8px", borderRadius: 20, background: isOn(n.href) ? "rgba(139,61,255,.08)" : undefined }}
                >
                  <div style={{ fontSize: "1.6rem" }}>{n.emoji}</div>
                  <div className="small" style={{ fontWeight: 700, marginTop: 6, lineHeight: 1.25 }}>
                    {n.label}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
