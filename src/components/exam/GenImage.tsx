"use client";

import { useState } from "react";
import type { SignSpec } from "@/lib/exam";
import { imageUrl } from "@/lib/images";

/**
 * Gemini chizgan test rasmi. Rasm tayyor bo'lguncha (birinchi marta 5–15 soniya) va rasm yaratib bo'lmasa
 * (kalit yo'q, limit tugagan) emoji sahna ko'rsatiladi — test har doim ishlaydi.
 */
export function GenImage({ prompt, fallback, big }: { prompt: string; fallback?: string; big?: boolean }) {
  const [st, setSt] = useState<"load" | "ok" | "err">("load");
  return (
    <div className={`gen-img ${big ? "big" : ""} ${st}`}>
      {st !== "ok" && (
        <div className="scene">
          {fallback}
          {st === "load" && <span className="spinner gen-spin" aria-label="Rasm tayyorlanmoqda" />}
        </div>
      )}
      {st !== "err" && (
        // eslint-disable-next-line @next/next/no-img-element -- rasm API'dan keladi, o'lchami oldindan noma'lum
        <img src={imageUrl(prompt)} alt="" decoding="async" onLoad={() => setSt("ok")} onError={() => setSt("err")} />
      )}
    </div>
  );
}

const SIGN_COLOR = { prohibit: "#d32f2f", warn: "#111", order: "#1565c0", guide: "#2e7d32" };

/** Ishlab chiqarish xavfsizlik belgisi (산업안전보건표지) shaklida chizish */
export function SafetySign({ sign }: { sign: SignSpec }) {
  const c = SIGN_COLOR[sign.kind] ?? "#111";
  return (
    <div className="q-picture sign" role="img" aria-label="Xavfsizlik belgisi">
      <svg viewBox="0 0 100 100" width="150" height="150" aria-hidden>
        {sign.kind === "prohibit" && <circle cx="50" cy="50" r="42" fill="#fff" stroke={c} strokeWidth="9" />}
        {sign.kind === "warn" && <polygon points="50,7 95,89 5,89" fill="#ffd400" stroke={c} strokeWidth="6" strokeLinejoin="round" />}
        {sign.kind === "order" && <circle cx="50" cy="50" r="45" fill={c} />}
        {sign.kind === "guide" && <rect x="6" y="6" width="88" height="88" rx="8" fill={c} />}
        <text x="50" y={sign.kind === "warn" ? 74 : 63} fontSize={sign.kind === "warn" ? 34 : 40} textAnchor="middle">
          {sign.icon}
        </text>
        {sign.kind === "prohibit" && <line x1="21" y1="21" x2="79" y2="79" stroke={c} strokeWidth="9" strokeLinecap="round" />}
      </svg>
    </div>
  );
}
