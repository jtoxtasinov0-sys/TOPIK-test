// Ustoz bilim bazasidan savolga mos bo'laklarni topish (oddiy kalit so'z qidiruvi, tashqi kutubxonasiz).
// Server AI yo'llari (tutor, voice, explain, writing) shu yerdan qisqa "eslatma" matnini olib, promptga qo'shadi.

import { GRAMMAR, type GrammarPoint } from "@/data/knowledge/grammar";
import { MISTAKES, type Mistake } from "@/data/knowledge/mistakes";
import { STAGES, type Stage } from "@/data/knowledge/curriculum";
import { WORK_NOTES, type WorkNote } from "@/data/knowledge/work";
import { writingNotesText } from "@/data/knowledge/writing";
import { PAST_ROUNDS, QTYPES } from "@/data/pastExams";
import { findWordsIn, POS_NAME } from "@/data/vocab";

/** Qidiruv uchun normallashtirish: kichik harf, apostrof turlari, bo'sh joy va tinish belgilarisiz */
export function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’ʻʼ`'"]/g, "")
    .replace(/[\s\-~()（）.,!?·…«»:;/[\]{}<>]/g, "");
}

type Scored<T> = { item: T; score: number };

function scoreOf(q: string, keys: string[], tags: string[]): number {
  let s = 0;
  for (const k of keys) {
    const n = norm(k);
    if (!n || !q.includes(n)) continue;
    if (n.length >= 2) s += Math.min(n.length, 5) * 2;
    // Alohida jamo (ㅓ, ㄹ, ㄲ …) oddiy matnda uchramaydi — savolda bo'lsa, aniq belgi
    else if (/[\u3131-\u318e]/.test(n)) s += 3;
  }
  for (const t of tags) {
    const n = norm(t);
    if (n.length >= 5 && q.includes(n)) s += 2;
    else if (n.length >= 3 && q.includes(n)) s += 1;
  }
  return s;
}

function top<T>(list: T[], q: string, get: (x: T) => { keys: string[]; tags: string[] }, limit: number, tie?: (a: T, b: T) => number): T[] {
  if (!q) return [];
  const scored: Scored<T>[] = [];
  for (const item of list) {
    const { keys, tags } = get(item);
    const score = scoreOf(q, keys, tags);
    // Faqat bitta umumiy teg mos kelsa — tasodif, hisobga olinmaydi
    if (score >= 2) scored.push({ item, score });
  }
  scored.sort((a, b) => b.score - a.score || (tie ? tie(a.item, b.item) : 0));
  return scored.slice(0, limit).map((x) => x.item);
}

/** Deyarli har bir gapda uchraydigan shakllar — matn tahlilida (explain) foydasiz, chiqarib tashlanadi */
export const BASIC_GRAMMAR = ["ayo", "seumnida", "past", "ieyo", "itda", "eun-neun", "i-ga", "eul-reul"];

export type GrammarFilter = { minLevel?: number; exclude?: string[] };

export function findGrammar(text: string, limit = 4, filter: GrammarFilter = {}): GrammarPoint[] {
  const list = GRAMMAR.filter((g) => g.level >= (filter.minLevel ?? 1) && !filter.exclude?.includes(g.id));
  return top(list, norm(text), (g) => ({ keys: [...g.keys, g.form], tags: g.tags }), limit, (a, b) => a.level - b.level);
}

export function findMistakes(text: string, limit = 3): Mistake[] {
  return top(MISTAKES, norm(text), (m) => ({ keys: m.keys, tags: m.tags }), limit);
}

export function findWork(text: string, limit = 3): WorkNote[] {
  return top(WORK_NOTES, norm(text), (w) => ({ keys: w.keys, tags: w.tags }), limit);
}

export function stageFor(id: string | undefined | null): Stage | undefined {
  if (!id) return undefined;
  return STAGES.find((s) => s.id === id);
}

export function grammarCard(g: GrammarPoint): string {
  const lines = [`[${g.level}급] ${g.form} — ${g.uz}`];
  if (g.rule) lines.push(`Yasalishi: ${g.rule}`);
  lines.push(`Misollar: ${g.examples.map(([ko, uz]) => `${ko} (${uz})`).join(" / ")}`);
  if (g.note) lines.push(`Eslatma: ${g.note}`);
  return lines.join("\n");
}

export function mistakeCard(m: Mistake): string {
  const parts = [`${m.title}: ${m.why}`];
  if (m.wrong && m.right) parts.push(`(✗ ${m.wrong} → ✓ ${m.right})`);
  return parts.join(" ");
}

export function workCard(w: WorkNote): string {
  return `${w.title}\n${w.points.map((p) => `- ${p}`).join("\n")}`;
}

/**
 * AI ustoz uchun bilim bazasidan eslatma: savolga mos grammatika, o'zbeklarga xos xatolar va ish joyi ma'lumotlari.
 * Hech narsa topilmasa bo'sh satr qaytadi.
 */
export function teacherNotes(
  text: string,
  opts: { grammar?: number; mistakes?: number; work?: number; maxChars?: number; filter?: GrammarFilter } = {}
): string {
  const { grammar = 4, mistakes = 3, work = 2, maxChars = 4500, filter } = opts;
  const parts: string[] = [];
  const g = grammar ? findGrammar(text, grammar, filter) : [];
  if (g.length) parts.push(`Grammatika kartochkalari:\n${g.map(grammarCard).join("\n\n")}`);
  const m = mistakes ? findMistakes(text, mistakes) : [];
  if (m.length) parts.push(`O‘zbek o‘quvchilariga xos xatolar:\n${m.map((x) => `- ${mistakeCard(x)}`).join("\n")}`);
  const w = work ? findWork(text, work) : [];
  if (w.length) parts.push(`Ish joyi / EPS ma’lumotlari:\n${w.map(workCard).join("\n\n")}`);
  const out = parts.join("\n\n");
  return out.length > maxChars ? `${out.slice(0, maxChars)}…` : out;
}

export { writingNotesText };

/** Ustozning o'qitish uslubi (barcha AI ustoz yo'llari uchun umumiy) */
export const TEACHING_METHOD = `Teaching method (follow it like a professional, certified teacher of Korean as a foreign language):
- Find the student's level from their profile, test results and messages; teach one step above it. Never overload: one main point per answer.
- A lesson step: goal → short explanation with an Uzbek comparison (Korean particles vs Uzbek suffixes -ni, -ga, -da, -dan; SOV word order is the same) → 2-3 Korean examples with translation → a mini exercise (2-3 items) → check the answer and correct it → one-line summary and a small homework.
- Correct mistakes gently: show the corrected sentence, explain only the most important rule, praise what was right.
- Know the typical problems of Uzbek speakers (ㅓ/ㅗ, ㅡ, ㄱ/ㅋ/ㄲ, ㄹ, 받침, 에 vs 에서, 은/는 vs 이/가, using 당신 for "siz", 반말 at work) and point them out when they appear.
- For TOPIK and EPS-TOPIK give concrete strategies for the question type, not general advice.
- The "Knowledge base notes" below were written and checked for HanUstoz: prefer them, never contradict them. Laws, wages and exam rules can change — for those, say the numbers are for guidance and suggest checking the official source or calling 1350 / 1345.`;

// ───────────── TOPIK rasmiy faktlari va 국립국어원 lug‘ati (AI Ustoz uchun) ─────────────
// Faktlar topik.go.kr va korean.go.kr dan 2026-yil noyabrda tekshirilgan.

const SCHEDULE_2026 = [
  ["104", "2026-01-11", "2026-02-12"],
  ["105", "2026-04-12", "2026-05-29"],
  ["106", "2026-05-17", "2026-06-25"],
  ["107", "2026-07-05", "2026-08-13"],
  ["108", "2026-10-18", "2026-12-10"],
  ["109", "2026-11-15", "2026-12-22"],
];

const qtypeText = () =>
  Object.values(QTYPES)
    .map((s) => `${s.title}:\n` + s.items.map((i) => `  ${i.range}: ${i.ko} — ${i.uz}. Maslahat: ${i.tip}`).join("\n"))
    .join("\n");

export const TOPIK_FACTS = `TOPIK official facts (topik.go.kr, checked November 2026) — rely on these for exam questions; if something is not covered, tell the student to check topik.go.kr instead of guessing dates. Never reproduce official past-paper questions verbatim: explain their format and write your own similar items.
- Tashkilotchi: 국립국제교육원 (NIIED), Ta’lim vazirligi. Natija e’lon qilingan kundan 2 yil amal qiladi.
- Qo‘llanilishi: Koreya oliygohlariga kirish/bitirish, ishga kirish, viza va doimiy yashash (영주권), GKS stipendiyasi.
- Tarix: 1997-yildan; 2014-07-20 (35-sessiya) dan hozirgi tuzilma; 2022 — TOPIK Speaking (말하기 평가), 2023 — TOPIK IBT (kompyuterda); 2025-yildan yiliga 15 ta imtihon (PBT 6, IBT 6, Speaking 3).
- TOPIK I: 듣기 30 savol/40 daqiqa + 읽기 40 savol/60 daqiqa = 200 ball. 80+ → 1급, 140+ → 2급.
- TOPIK II: 1교시 듣기 50 savol/60 daqiqa + 쓰기 4 topshiriq/50 daqiqa; 2교시 읽기 50 savol/70 daqiqa = 300 ball. 120+ → 3급, 150+ → 4급, 190+ → 5급, 230+ → 6급.
- 2026-yil PBT jadvali (Koreya ichida; sessiya: imtihon → natija): ${SCHEDULE_2026.map(([n, d, r]) => `${n}-sessiya ${d} → ${r}`).join("; ")}. Chet elda (jumladan O‘zbekistonda) sanalar mamlakatga qarab farq qiladi — topik.go.kr → 시험일정. 110-sessiya bo‘yicha e’lonlar 2026-yil noyabrda chiqa boshlagan.
- Ochiq o‘tgan testlar (기출문제, rasmiy saytda audio bilan bepul): ${PAST_ROUNDS.map((r) => `${r.no}(${r.year})`).join(", ")} — ilovada «Testlar → Rasmiy o‘tgan testlar» (/test/past).
- Lug‘at: 국립국어원 «한국어 학습용 어휘 목록» (5 965 so‘z: A 982, B 2 111, C 2 872). Ilovadagi «So‘zlar» bo‘limida A va B darajadagi so‘zlar o‘zbekcha tarjima bilan bor.
Savol turlari xaritasi (har bir raqamda doim shu turdagi topshiriq):
${qtypeText()}`;

/** Savoldagi koreyscha so‘zlarni ilova lug‘atidan topib, tarjimasini eslatma sifatida beradi */
export function vocabNotes(text: string, limit = 15): string {
  const ws = findWordsIn(text, limit);
  if (!ws.length) return "";
  return `Lug‘at (ilova tarjimasi, shunga mos tarjima qil):\n${ws
    .map((w) => `- ${w.ko} [${w.rom}] (${POS_NAME[w.pos] ?? w.pos}, ${w.lv === "A" ? "TOPIK I" : "TOPIK II"}): ${w.uz}`)
    .join("\n")}`;
}
