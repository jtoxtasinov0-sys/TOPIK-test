"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import type { Access } from "./access";
import { startSync, stopSync } from "./sync";

export type MeUser = { id: string; email: string; name: string; picture?: string; createdAt: number };
export type Me = {
  authEnabled: boolean;
  trialDays: number;
  user: MeUser | null;
  access?: Access;
  admin?: boolean;
};

type Reason = "AUTH" | "PAYWALL";

type Ctx = {
  me: Me | null;
  loading: boolean;
  /** AI funksiyalari ochiqmi (sinov davom etmoqda, admin yoki auth o'chirilgan) */
  aiOpen: boolean;
  refresh: () => Promise<void>;
  login: (next?: string) => void;
  logout: () => Promise<void>;
  openPaywall: (r: Reason) => void;
};

const AuthContext = createContext<Ctx | null>(null);

async function fetchMe(): Promise<Me | null> {
  try {
    const r = await fetch("/api/me", { cache: "no-store" });
    return r.ok ? ((await r.json()) as Me) : null;
  } catch {
    return null;
  }
}

export function loginHref(next?: string) {
  const n = next ?? (typeof window !== "undefined" ? window.location.pathname + window.location.search : "/");
  return `/api/auth/google?next=${encodeURIComponent(n)}`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState<Reason | null>(null);
  const lastFetch = useRef(0);

  const refresh = useCallback(async () => {
    lastFetch.current = Date.now();
    const m = await fetchMe();
    if (m) setMe(m);
    setLoading(false);
  }, []);

  useEffect(() => {
    let alive = true;
    lastFetch.current = Date.now();
    fetchMe().then((m) => {
      if (!alive) return;
      if (m) setMe(m);
      setLoading(false);
    });
    // Boshqa oynadan qaytganda holatni yangilash
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - lastFetch.current > 15_000) void refresh();
    };
    const onPaywall = (e: Event) => setSheet((e as CustomEvent<Reason>).detail);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("hq:paywall", onPaywall);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("hq:paywall", onPaywall);
    };
  }, [refresh]);

  const uid = me?.user?.id;
  useEffect(() => {
    if (uid) startSync(uid);
  }, [uid]);

  const login = useCallback((next?: string) => {
    window.location.href = loginHref(next);
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    stopSync(true);
    window.location.href = "/";
  }, []);

  const value = useMemo<Ctx>(() => {
    const aiOpen = !!me && (!me.authEnabled || (!!me.user && (!!me.admin || me.access?.status !== "expired")));
    return { me, loading, aiOpen, refresh, login, logout, openPaywall: setSheet };
  }, [me, loading, refresh, login, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
      {sheet && <PaywallSheet reason={me?.user ? sheet : "AUTH"} onClose={() => setSheet(null)} />}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

// ---------- "Google bilan kirish" tugmasi ----------
export function GoogleMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export function GoogleButton({ next, block, label }: { next?: string; block?: boolean; label?: string }) {
  const { login } = useAuth();
  return (
    <button type="button" className={`btn google-btn btn-lg ${block ? "btn-block" : ""}`} onClick={() => login(next)}>
      <GoogleMark size={22} />
      {label ?? "Google bilan kirish"}
    </button>
  );
}

// ---------- Kirish / sinov tugadi oynasi ----------
function PaywallSheet({ reason, onClose }: { reason: Reason; onClose: () => void }) {
  const { me } = useAuth();
  const trialDays = me?.trialDays ?? 30;
  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="paywall-title">
        <div className="sheet-handle" />
        <div className="row between" style={{ marginBottom: 6 }}>
          <span className="badge">{reason === "AUTH" ? `🎁 ${trialDays} kun bepul` : "⏳ Sinov tugadi"}</span>
          <button className="icon-btn sm" onClick={onClose} aria-label="Yopish">
            <Icon name="x" size={18} />
          </button>
        </div>
        {reason === "AUTH" ? (
          <div className="stack" style={{ gap: 14 }}>
            <h3 className="h2" id="paywall-title" style={{ fontSize: "1.5rem" }}>
              Hisobingizga kiring
            </h3>
            <p className="muted" style={{ margin: 0 }}>
              {`AI tekshiruv, Gemini bilan suhbat, AI Ustoz va cheksiz AI variantlar uchun Gmail orqali kiring. Birinchi ${trialDays} kun — to‘liq bepul, karta talab qilinmaydi.`}
            </p>
            <ul className="check-list">
              <li>Natijalaringiz barcha qurilmalarda saqlanadi</li>
              <li>Parol o‘ylab topish shart emas</li>
            </ul>
            <GoogleButton block />
          </div>
        ) : (
          <div className="stack" style={{ gap: 14 }}>
            <h3 className="h2" id="paywall-title" style={{ fontSize: "1.5rem" }}>
              Bepul sinov tugadi
            </h3>
            <p className="muted" style={{ margin: 0 }}>
              {`${trialDays} kunlik bepul sinov muddati tugadi, AI funksiyalari yopildi. Hangul, darslar, so‘zlar va mock testlar bepul ishlashda davom etadi.`}
            </p>
            <Link href="/account" className="btn btn-primary btn-lg btn-block" onClick={onClose}>
              Profilni ko‘rish <Icon name="right" size={18} />
            </Link>
          </div>
        )}
      </div>
    </>
  );
}

/** Kichik avatar: rasm yoki ismning bosh harfi */
export function Avatar({ user, size = 36 }: { user: Pick<MeUser, "name" | "picture" | "email">; size?: number }) {
  const letter = (user.name || user.email).trim().charAt(0).toUpperCase();
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {user.picture ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.picture} alt="" referrerPolicy="no-referrer" />
      ) : (
        letter
      )}
    </span>
  );
}
