"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";

export type Lang = "uz" | "ru";
export type Bi = { uz: string; ru: string };

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Ikki tilli matn: L("o'zbekcha", "русский") */
  L: (uz: string, ru: string) => string;
  /** {uz, ru} obyektidan joriy tilni oladi */
  tr: (b: Bi | undefined) => string;
};

const LangContext = createContext<Ctx | null>(null);
const KEY = "hq:lang";
const listeners = new Set<() => void>();

function readLang(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "uz" || saved === "ru") return saved;
    if (navigator.language?.toLowerCase().startsWith("ru")) return "ru";
  } catch {}
  return "uz";
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  window.addEventListener("storage", fn);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", fn);
  };
}

export function LangProvider({ children }: { children: React.ReactNode }) {
  const lang = useSyncExternalStore(subscribe, readLang, () => "uz" as Lang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    try {
      localStorage.setItem(KEY, l);
    } catch {}
    listeners.forEach((f) => f());
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      lang,
      setLang,
      L: (uz, ru) => (lang === "ru" ? ru : uz),
      tr: (b) => (b ? (lang === "ru" ? b.ru : b.uz) : ""),
    }),
    [lang, setLang]
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside LangProvider");
  return ctx;
}
