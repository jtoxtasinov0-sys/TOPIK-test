"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar, useAuth } from "@/lib/auth";
import { Icon } from "./Icon";
import { PwaRegister } from "./Pwa";
import { BRAND_VERSION } from "@/lib/images";
import type { VisualId } from "@/data/visuals";
import { allVisualSrcs, fastConnection, preloadImages, Visual, visualSrc } from "./Visual";

export function Logo() {
  return (
    <Link href="/" className="logo" aria-label="HanUstoz — bosh sahifa">
      {/* eslint-disable-next-line @next/next/no-img-element -- vektor logo (public/brand), o'lchami CSS'da */}
      <img src={`/brand/logo-horizontal.svg?v=${BRAND_VERSION}`} alt="HanUstoz" width={147} height={34} />
    </Link>
  );
}

/** Yuqori paneldagi hisob tugmasi: kirish yoki avatar + qolgan kunlar */
function AccountButton() {
  const { me, login } = useAuth();
  if (!me?.authEnabled) return null;
  if (!me.user) {
    return (
      <button className="btn btn-primary btn-sm login-btn" onClick={() => login()}>
        <Icon name="user" size={16} /> Kirish
      </button>
    );
  }
  const a = me.access;
  const pill =
    me.admin || !a
      ? null
      : a.status === "expired"
        ? { cls: "red", text: "Sinov tugadi" }
        : { cls: a.daysLeft <= 5 ? "amber" : "", text: `🎁 ${a.daysLeft} kun` };
  return (
    <>
      {pill && (
        <Link href="/account" className={`badge ${pill.cls} hide-mobile`} style={{ padding: "7px 12px" }}>
          {pill.text}
        </Link>
      )}
      <Link href="/account" aria-label="Profil" className="avatar-link">
        <Avatar user={me.user} size={36} />
      </Link>
    </>
  );
}

export const NAV: { href: string; icon: string; label: string; v: VisualId }[] = [
  { href: "/", icon: "home", label: "Bosh sahifa", v: "nav:home" },
  { href: "/test", icon: "test", label: "Testlar", v: "home:test" },
  { href: "/writing", icon: "pen", label: "Yozish", v: "home:writing" },
  { href: "/speak", icon: "mic", label: "Gaplashish", v: "home:speak" },
  { href: "/learn", icon: "book", label: "0 dan o‘rganish", v: "who:beginner" },
  { href: "/words", icon: "cards", label: "So‘zlar", v: "home:words" },
  { href: "/tutor", icon: "spark", label: "AI Ustoz", v: "home:tutor" },
  { href: "/guide", icon: "map", label: "Koreyada hayot", v: "home:guide" },
  { href: "/progress", icon: "chart", label: "Natijalarim", v: "nav:progress" },
  { href: "/account", icon: "user", label: "Profil", v: "nav:profile" },
];

const SHEET_ICON = 44;

/**
 * Sahifa yuklanib bo'lgach, bo'sh vaqtda: menyu ikonkalari va (tez internetda) boshqa bo'limlar ikonkalari
 * oldindan yuklanadi — «Barcha bo'limlar» va boshqa sahifalar ochilganda rasmlar darhol chiqadi.
 */
function useWarmIcons() {
  useEffect(() => {
    let idleId = 0;
    let timer = 0;
    // Safari'da requestIdleCallback yo'q — oddiy kechiktirish
    const idle = typeof window.requestIdleCallback === "function";
    const run = () => {
      preloadImages(NAV.map((n) => visualSrc(n.v, SHEET_ICON)));
      if (fastConnection()) preloadImages(allVisualSrcs(), 2);
    };
    const start = () => {
      if (idle) idleId = window.requestIdleCallback(run, { timeout: 4000 });
      else timer = window.setTimeout(run, 1200);
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => {
      window.removeEventListener("load", start);
      if (idleId) window.cancelIdleCallback(idleId);
      if (timer) window.clearTimeout(timer);
    };
  }, []);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const nav = NAV;
  const [more, setMore] = useState(false);
  useWarmIcons();

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
          <AccountButton />
          <button className="icon-btn sm hide-mobile" onClick={() => setMore(true)} aria-label="Barcha bo‘limlar">
            <Icon name="grid" size={18} />
          </button>
        </div>
      </header>

      <PwaRegister />
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
        <button className={more ? "on" : ""} onClick={() => setMore(true)} aria-label="Yana">
          <Icon name="grid" />
        </button>
      </nav>

      {more && (
        <>
          <div className="sheet-backdrop" onClick={() => setMore(false)} />
          <div className="sheet" role="dialog" aria-modal="true">
            <div className="sheet-handle" />
            <div className="row between" style={{ marginBottom: 14 }}>
              <h3 className="h3">Barcha bo‘limlar</h3>
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
                  <Visual id={n.v} size={SHEET_ICON} shape="tile" eager />
                  <div className="small" style={{ fontWeight: 700, marginTop: 8, lineHeight: 1.25 }}>
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
