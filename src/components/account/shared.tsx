"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** URL query satri (useSearchParams Suspense talab qilmasligi uchun) */
export function useSearch() {
  const s = useSyncExternalStore(
    noop,
    () => window.location.search,
    () => ""
  );
  return new URLSearchParams(s);
}

/** Faqat sayt ichidagi yo'l (tashqi saytga yo'naltirib yubormaslik uchun) */
export function safePath(p: string | null | undefined, fallback = "/") {
  return p && p.startsWith("/") && !p.startsWith("//") && !p.startsWith("/\\") ? p : fallback;
}

const MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];

/** 6-dekabr, 2026 — brauzerning «uz» tili turlicha (masalan «2026 M12 6») chiqargani uchun o'zimiz yozamiz */
export function fmtDate(ms: number | undefined) {
  if (!ms) return "—";
  const d = new Date(ms);
  return `${d.getDate()}-${MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
}
