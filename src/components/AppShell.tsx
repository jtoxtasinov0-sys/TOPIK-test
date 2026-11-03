"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon } from "./Icon";

export function Logo() {
  return (
    <Link href="/" className="logo" aria-label="HanQadam">
      <span className="logo-mark">한</span>
      <span>
        Han<span className="gradient-text">Qadam</span>
      </span>
    </Link>
  );
}

export const NAV = [
  { href: "/", icon: "home", label: "Bosh sahifa", emoji: "🏠" },
  { href: "/test", icon: "test", label: "Testlar", emoji: "📝" },
  { href: "/writing", icon: "pen", label: "Yozish", emoji: "✍️" },
  { href: "/speak", icon: "mic", label: "Gaplashish", emoji: "🗣️" },
  { href: "/learn", icon: "book", label: "0 dan o‘rganish", emoji: "🌱" },
  { href: "/words", icon: "cards", label: "So‘zlar", emoji: "🃏" },
  { href: "/tutor", icon: "spark", label: "AI Ustoz", emoji: "🤖" },
  { href: "/guide", icon: "map", label: "Koreyada hayot", emoji: "🇰🇷" },
  { href: "/progress", icon: "chart", label: "Natijalarim", emoji: "📈" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const nav = NAV;
  const [more, setMore] = useState(false);

  const isOn = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const desktop = nav.filter((n) => !["/", "/progress"].includes(n.href));

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
          <button className="icon-btn sm hide-mobile" onClick={() => setMore(true)} aria-label="Barcha bo‘limlar">
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
