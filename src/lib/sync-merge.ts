import type { HistoryItem } from "./exam";

// Ikki qurilma (yoki qurilma va bulut) natijalarini yo'qotmasdan birlashtirish. Sof funksiya — testlanadi.

type Data = Record<string, unknown>;

const arr = <T,>(v: unknown) => (Array.isArray(v) ? (v as T[]) : []);
const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

/** Ikki qurilma ma'lumotini yo'qotmasdan birlashtirish */
export function mergeData(local: Data, server: Data): Data {
  const out: Data = { ...server, ...local };

  const hist = new Map<string, HistoryItem>();
  for (const h of [...arr<HistoryItem>(server["hq:history"]), ...arr<HistoryItem>(local["hq:history"])]) if (h?.id) hist.set(h.id, h);
  if (hist.size) out["hq:history"] = [...hist.values()].sort((a, b) => b.date - a.date).slice(0, 60);

  const words: Record<string, number> = {};
  for (const [k, v] of [...Object.entries(obj(server["hq:words"])), ...Object.entries(obj(local["hq:words"]))]) {
    words[k] = Math.max(words[k] ?? 0, Number(v) || 0);
  }
  if (Object.keys(words).length) out["hq:words"] = words;

  const sa = obj(server["hq:streak"]) as { last?: string; count?: number };
  const sb = obj(local["hq:streak"]) as { last?: string; count?: number };
  if (sa.last || sb.last) {
    const la = sa.last ?? "";
    const lb = sb.last ?? "";
    out["hq:streak"] = la === lb ? { last: la, count: Math.max(sa.count ?? 0, sb.count ?? 0) } : la > lb ? sa : sb;
  }

  const pa = obj(server["hq:profile"]);
  const pb = obj(local["hq:profile"]);
  if (Object.keys(pa).length || Object.keys(pb).length) {
    const p: Record<string, unknown> = { ...pa };
    for (const [k, v] of Object.entries(pb)) if (v !== "" && v != null) p[k] = v;
    out["hq:profile"] = p;
  }
  return out;
}
