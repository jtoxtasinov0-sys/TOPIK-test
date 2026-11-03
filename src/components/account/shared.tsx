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

export function fmtDate(ms: number | undefined) {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString("uz-UZ", { day: "numeric", month: "long", year: "numeric" });
}
