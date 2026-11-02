"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import type { NoticeSpec } from "@/lib/exam";
import { playKorean, stopAudio, type TtsOpts } from "@/lib/audio";
import { useLang } from "@/lib/i18n";
import { Icon } from "./Icon";

// ---------- AI so'rovlari uchun yordamchi ----------
export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}

export async function postJson<T>(url: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new ApiError("network", 0);
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(json?.error || `HTTP ${res.status}`, res.status, json?.code);
  return json as T;
}

export function useAiErrorText() {
  const { L } = useLang();
  return (e: unknown) => {
    if (e instanceof ApiError) {
      if (e.code === "NO_KEY" || e.status === 503)
        return L(
          "AI hali ulanmagan: serverda GEMINI_API_KEY sozlanishi kerak (README’ga qarang).",
          "AI ещё не подключён: на сервере нужно задать GEMINI_API_KEY (см. README)."
        );
      if (e.status === 429) return L("Juda ko‘p so‘rov. 1-2 daqiqadan keyin urinib ko‘ring.", "Слишком много запросов. Попробуйте через 1–2 минуты.");
      if (e.status === 0) return L("Internet aloqasini tekshiring.", "Проверьте подключение к интернету.");
      return L("AI xatosi: ", "Ошибка AI: ") + e.message;
    }
    return L("Kutilmagan xato yuz berdi.", "Произошла непредвиденная ошибка.");
  };
}

// ---------- E'lon / reklama kartasi ----------
export function Notice({ notice }: { notice: NoticeSpec }) {
  return (
    <div className={`notice ${notice.style === "msg" ? "msg" : notice.style === "ad" ? "ad" : ""}`}>
      {notice.title && <h4>{notice.title}</h4>}
      {notice.lines.map((l, i) => (l ? <p key={i}>{l}</p> : <br key={i} />))}
    </div>
  );
}

// ---------- <u> teglarini xavfsiz ko'rsatish ----------
export function RichKo({ text }: { text: string }) {
  const parts = text.split(/(<u>.*?<\/u>)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("<u>") ? <u key={i}>{p.slice(3, -4)}</u> : <Fragment key={i}>{p}</Fragment>
      )}
    </>
  );
}

// ---------- Ball halqasi ----------
export function ScoreRing({ value, max, size = 180, label, sub, color = "url(#ringGrad)", track = "rgba(255,255,255,.18)", text = "#fff" }: {
  value: number;
  max: number;
  size?: number;
  label?: React.ReactNode;
  sub?: React.ReactNode;
  color?: string;
  track?: string;
  text?: string;
}) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setShown(value), 120);
    return () => clearTimeout(t);
  }, [value]);
  const stroke = size * 0.085;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max ? Math.min(1, shown / max) : 0;
  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffe066" />
            <stop offset="50%" stopColor="#ff8bd1" />
            <stop offset="100%" stopColor="#7cf3ff" />
          </linearGradient>
          <linearGradient id="ringGradDark" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8b3dff" />
            <stop offset="100%" stopColor="#3a86ff" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          className="ring-anim"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <div className="ring-label" style={{ color: text }}>
        {label}
        {sub}
      </div>
    </div>
  );
}

// ---------- Kichik "tinglash" tugmasi ----------
export function SpeakBtn({ text, opts, size = "sm", light }: { text: string; opts?: TtsOpts; size?: "sm" | "md"; light?: boolean }) {
  const [state, setState] = useState<"idle" | "load" | "play">("idle");
  const busy = useRef(false);
  useEffect(() => {
    busy.current = state !== "idle";
  }, [state]);
  useEffect(
    () => () => {
      if (busy.current) stopAudio();
    },
    []
  );
  return (
    <button
      type="button"
      className={`icon-btn ${size === "sm" ? "sm" : ""}`}
      style={light ? { background: "rgba(255,255,255,.18)", borderColor: "rgba(255,255,255,.3)", color: "#fff" } : undefined}
      aria-label="Tinglash"
      onClick={async (e) => {
        e.stopPropagation();
        if (state !== "idle") {
          stopAudio();
          setState("idle");
          return;
        }
        await playKorean(text, {
          ...opts,
          onLoading: (b) => setState(b ? "load" : "play"),
          onStart: () => setState("play"),
        });
        setState("idle");
      }}
    >
      {state === "load" ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <Icon name={state === "play" ? "stop" : "volume"} size={17} />}
    </button>
  );
}

// ---------- Oddiy markdown (AI javoblari uchun) ----------
function inline(s: string) {
  const out: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("**")) out.push(<strong key={i++}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith("`")) out.push(<code key={i++}>{t.slice(1, -1)}</code>);
    else out.push(<em key={i++}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

export function Md({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  const lines = text.replace(/\r/g, "").split("\n");
  let list: { ordered: boolean; items: string[] } | null = null;
  let para: string[] = [];
  const flushPara = () => {
    if (para.length) blocks.push(<p key={blocks.length}>{inline(para.join(" "))}</p>);
    para = [];
  };
  const flushList = () => {
    if (list) {
      const items = list.items.map((it, i) => <li key={i}>{inline(it)}</li>);
      blocks.push(list.ordered ? <ol key={blocks.length}>{items}</ol> : <ul key={blocks.length}>{items}</ul>);
    }
    list = null;
  };
  for (const raw of lines) {
    const l = raw.trim();
    const ul = l.match(/^[-*•]\s+(.*)$/);
    const ol = l.match(/^\d+[.)]\s+(.*)$/);
    const h = l.match(/^#{1,4}\s+(.*)$/);
    if (!l) {
      flushPara();
      flushList();
    } else if (h) {
      flushPara();
      flushList();
      blocks.push(<h4 key={blocks.length}>{inline(h[1])}</h4>);
    } else if (ul || ol) {
      flushPara();
      const ordered = !!ol;
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push((ul ?? ol)![1]);
    } else {
      flushList();
      para.push(l);
    }
  }
  flushPara();
  flushList();
  return <div className="md">{blocks}</div>;
}

// ---------- Konfetti ----------
export function Confetti({ count = 60 }: { count?: number }) {
  const [pieces] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 1.2,
      color: ["#ffe066", "#ff8bd1", "#7cf3ff", "#fff", "#b8a1ff"][i % 5],
      rot: Math.random() * 360,
    }))
  );
  return (
    <div className="confetti" aria-hidden>
      {pieces.map((p, i) => (
        <i key={i} style={{ left: `${p.left}%`, background: p.color, animationDelay: `${p.delay}s`, transform: `rotate(${p.rot}deg)` }} />
      ))}
    </div>
  );
}

// ---------- Rasmni siqish (yuklashdan oldin) ----------
export async function compressImage(file: File, maxSide = 1600, quality = 0.85): Promise<{ data: string; mime: string; preview: string }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    return { data: dataUrl.split(",")[1], mime: "image/jpeg", preview: dataUrl };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}
