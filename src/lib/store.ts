"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import type { HistoryItem, Test } from "./exam";

// localStorage bilan xavfsiz ishlash (private rejimda xato bermasligi uchun)
export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function save<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("hq:store", { detail: key }));
  } catch {}
}

export function remove(key: string) {
  try {
    localStorage.removeItem(key);
    window.dispatchEvent(new CustomEvent("hq:store", { detail: key }));
  } catch {}
}

// useSyncExternalStore uchun: bir xil satr — bir xil obyekt (keraksiz qayta render bo'lmasin)
const snapCache = new Map<string, { raw: string | null; val: unknown }>();

function snapshot<T>(key: string, fallback: T): T {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
  } catch {}
  const hit = snapCache.get(key);
  if (hit && hit.raw === raw) return hit.val as T;
  let val: unknown = fallback;
  try {
    if (raw) val = JSON.parse(raw);
  } catch {}
  snapCache.set(key, { raw, val });
  return val as T;
}

function subscribeStore(fn: () => void) {
  window.addEventListener("hq:store", fn);
  window.addEventListener("storage", fn);
  return () => {
    window.removeEventListener("hq:store", fn);
    window.removeEventListener("storage", fn);
  };
}

const noopSubscribe = () => () => {};

/** Komponent brauzerda gidratsiya bo'lganmi */
export function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
}

/** localStorage'dagi qiymatga obuna bo'lgan state */
export function useStored<T>(key: string, fallback: T): [T, (v: T | ((p: T) => T)) => void, boolean] {
  const [fb] = useState(fallback);
  const value = useSyncExternalStore(
    subscribeStore,
    () => snapshot(key, fb),
    () => fb
  );
  const ready = useHydrated();

  const set = useCallback(
    (v: T | ((p: T) => T)) => {
      const prev = snapshot(key, fb);
      save(key, typeof v === "function" ? (v as (p: T) => T)(prev) : v);
    },
    [key, fb]
  );

  return [value, set, ready];
}

export type Profile = {
  name: string;
  examDate: string; // YYYY-MM-DD
  target: string; // masalan "3급"
};

export const KEYS = {
  profile: "hq:profile",
  history: "hq:history",
  aiTests: "hq:aitests",
  words: "hq:words",
  streak: "hq:streak",
  attempt: (testId: string) => `hq:attempt:${testId}`,
};

export const DEFAULT_PROFILE: Profile = { name: "", examDate: "", target: "" };

export function addHistory(item: HistoryItem) {
  const list = load<HistoryItem[]>(KEYS.history, []);
  save(KEYS.history, [item, ...list].slice(0, 60));
  touchStreak();
}

export function updateHistory(id: string, patch: Partial<HistoryItem>) {
  const list = load<HistoryItem[]>(KEYS.history, []);
  save(
    KEYS.history,
    list.map((h) => (h.id === id ? { ...h, ...patch } : h))
  );
}

export function saveAiTest(test: Test) {
  const list = load<Test[]>(KEYS.aiTests, []);
  save(KEYS.aiTests, [test, ...list.filter((t) => t.id !== test.id)].slice(0, 8));
}

/** Kunlik faollik seriyasi (streak) */
export function touchStreak() {
  const today = new Date().toISOString().slice(0, 10);
  const s = load<{ last: string; count: number }>(KEYS.streak, { last: "", count: 0 });
  if (s.last === today) return;
  const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  save(KEYS.streak, { last: today, count: s.last === y ? s.count + 1 : 1 });
}

export function daysUntil(date: string): number | null {
  if (!date) return null;
  const d = new Date(date + "T09:00:00");
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
