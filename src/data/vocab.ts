// 국립국어원 darajali lug‘ati asosidagi TOPIK I / TOPIK II so‘z bazasi va kartochka to‘plamlari.
import { romanize } from "@/lib/romanize";
import type { Deck, Word } from "./words";
import { RAW_A } from "./vocabA";
import { RAW_B } from "./vocabB";

export type Level = "A" | "B";
export type PosGroup = "n" | "v" | "a" | "o";
export type VWord = Word & { pos: string; lv: Level };

export const VOCAB_SOURCE = {
  name: "국립국어원 «한국어 학습용 어휘 목록» (2003)",
  url: "https://www.korean.go.kr/front/etcData/etcDataView.do?mn_id=46&etc_seq=71",
  license: "KOGL 1-tur (공공누리 제1유형)",
};

const GROUP_OF: Record<string, PosGroup> = { 명: "n", 대: "n", 의: "n", 고: "n", 동: "v", 형: "a", 부: "o", 관: "o", 수: "o", 감: "o", 불: "o" };

export const POS_NAME: Record<string, string> = {
  명: "ot",
  대: "olmosh",
  의: "bog‘liq ot",
  고: "atoqli ot",
  동: "fe’l",
  형: "sifat",
  부: "ravish",
  관: "aniqlovchi",
  수: "son",
  감: "undov",
  불: "qisqargan shakl",
};

export const GROUPS: { id: PosGroup; label: string; emoji: string }[] = [
  { id: "n", label: "Otlar", emoji: "📦" },
  { id: "v", label: "Fe’llar", emoji: "🏃" },
  { id: "a", label: "Sifatlar", emoji: "🎨" },
  { id: "o", label: "Ravish, son va boshqalar", emoji: "🔢" },
];

export const groupOf = (pos: string): PosGroup => GROUP_OF[pos] ?? "o";

function parse(raw: string, lv: Level): VWord[] {
  const seen = new Map<string, number>();
  const out: VWord[] = [];
  for (const line of raw.trim().split("\n")) {
    const [ko, pos, uz] = line.split("|").map((s) => s.trim());
    if (!ko || !uz) continue;
    const base = `${lv}:${ko}:${pos}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    out.push({ id: n > 1 ? `${base}:${n}` : base, ko, rom: romanize(ko), uz, pos, lv });
  }
  return out;
}

export const VOCAB_A = parse(RAW_A, "A");
export const VOCAB_B = parse(RAW_B, "B");
export const VOCAB_ALL = [...VOCAB_A, ...VOCAB_B];

export type LevelDeck = Deck & { group: PosGroup; lv: Level; from: number; to: number };

const CHUNK = 50;

function makeDecks(list: VWord[], lv: Level): LevelDeck[] {
  const out: LevelDeck[] = [];
  for (const g of GROUPS) {
    const ws = list.filter((w) => groupOf(w.pos) === g.id);
    for (let i = 0; i < ws.length; i += CHUNK) {
      const k = i / CHUNK + 1;
      const slice = ws.slice(i, i + CHUNK);
      out.push({
        id: `${lv}-${g.id}-${k}`,
        emoji: g.emoji,
        title: `${g.label} · ${k}`,
        level: lv === "A" ? "TOPIK I" : "TOPIK II",
        words: slice,
        group: g.id,
        lv,
        from: i + 1,
        to: i + slice.length,
      });
    }
  }
  return out;
}

export const LEVEL_DECKS: Record<Level, LevelDeck[]> = { A: makeDecks(VOCAB_A, "A"), B: makeDecks(VOCAB_B, "B") };

// Otdan keyin keladigan qo‘shimchalar (계약서를 → 계약서 + 를)
const PARTICLES = ["", "은", "는", "이", "가", "을", "를", "에", "에서", "에게", "한테", "께", "께서", "도", "만", "의", "와", "과", "하고", "랑", "이랑", "로", "으로", "까지", "부터", "보다", "처럼", "이에요", "예요", "입니다", "이다", "들", "들이", "들을", "들은"];
// Bir bo‘g‘inli fe’l o‘zagidan keyin keladigan qo‘shimcha boshlari (읽+느라고, 늦+었어요)
const ENDING_START = new Set("아어았었고지는니면세시러려기게자다요을은겠네던도서으느나냐라래대습ㅂ".split(""));

// Hangul so‘zni lug‘atdan topish (AI Ustoz uchun): matnni so‘zlarga bo‘lib, ot + qo‘shimcha yoki fe’l o‘zagi + qo‘shimcha bo‘yicha
export function findWordsIn(text: string, limit = 25): VWord[] {
  const tokens = text.match(/[가-힣]+/g) ?? [];
  if (!tokens.length) return [];
  const hits: VWord[] = [];
  const seen = new Set<string>();
  for (const w of VOCAB_ALL) {
    if (seen.has(w.ko + w.uz)) continue;
    const isPred = ["동", "형"].includes(w.pos) && w.ko.endsWith("다") && w.ko.length > 1;
    const stem = isPred ? w.ko.slice(0, -1) : w.ko;
    const ok = tokens.some((t) => {
      if (isPred) {
        if (!t.startsWith(stem) || t.length === stem.length) return false;
        return stem.length >= 2 || ENDING_START.has(t[stem.length]);
      }
      return t.startsWith(w.ko) && PARTICLES.includes(t.slice(w.ko.length));
    });
    if (ok) {
      hits.push(w);
      seen.add(w.ko + w.uz);
    }
  }
  // uzun so‘zlar aniqroq — oldinga
  return hits.sort((a, b) => b.ko.length - a.ko.length).slice(0, limit);
}
