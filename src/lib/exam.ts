// TOPIK test tuzilmasi, ballash va daraja hisoblash

export type ExamId = "topik1" | "topik2" | "eps";
export type SectionId = "listening" | "reading" | "writing";

export type ChartSpec = {
  kind: "bar" | "pie" | "line";
  title?: string;
  unit?: string;
  labels: string[];
  series: { name?: string; values: number[] }[];
};

export type NoticeSpec = {
  style?: "poster" | "msg" | "ad";
  title?: string;
  lines: string[];
};

/** Xavfsizlik belgisi (EPS-TOPIK): 금지 — qizil doira, 경고 — sariq uchburchak, 지시 — ko'k doira, 안내 — yashil */
export type SignSpec = { kind: "prohibit" | "warn" | "order" | "guide"; icon: string };

export type Question = {
  n: number;
  pts: number;
  prompt?: string; // savolning o'z matni (masalan: "남자가 왜 ...?")
  given?: string; // joylashtiriladigan gap (39~41)
  script?: string; // tinglash matni (남자: ... / 여자: ...)
  passage?: string; // o'qish matni
  picture?: string; // savoldagi rasm (emoji sahna) — rasm yuklanguncha yoki AI'siz ko'rsatiladi
  pictureImage?: string; // savoldagi rasmning inglizcha tavsifi — Gemini shu bo'yicha rasm chizadi (/api/image)
  sign?: SignSpec; // savoldagi xavfsizlik belgisi
  notice?: NoticeSpec;
  chart?: ChartSpec;
  options: string[];
  optionStyle?: "text" | "picture" | "chart";
  optionImages?: string[]; // rasmli variantlar uchun 4 ta inglizcha sahna tavsifi (Gemini rasm chizadi)
  optionCharts?: ChartSpec[];
  answer: number; // 1..4
};

export type Group = {
  from: number;
  to: number;
  instruction: string;
  example?: string; // <보기>
  script?: string; // umumiy tinglash matni
  passage?: string; // umumiy o'qish matni
  given?: string; // joylashtiriladigan gap (39~41)
  notice?: NoticeSpec;
  chart?: ChartSpec;
  questions: Question[];
};

export type WritingTask = {
  n: 51 | 52 | 53 | 54;
  pts: number;
  kind: "blank" | "graph" | "essay";
  instruction: string;
  passage?: string;
  chart?: ChartSpec;
  notes?: string[];
  topic?: string;
  minChars?: number;
  maxChars?: number;
  suggestedMinutes: number;
};

export type Section = {
  id: SectionId;
  title: string; // 듣기 / 읽기 / 쓰기
  period: 1 | 2; // 1교시 / 2교시
  minutes: number;
  groups?: Group[];
  writing?: WritingTask[];
};

export type Test = {
  id: string;
  exam: ExamId;
  title: string;
  ai?: boolean;
  createdAt?: number;
  sections: Section[];
};

export type ExamInfo = {
  name: string;
  max: number;
  levels: { min: number; level: string }[];
  /** Daraja o'rniga minimal ball tizimi (EPS-TOPIK): har bir chegara nimani anglatadi */
  levelText?: Record<string, string>;
};

export const EXAM_INFO: Record<ExamId, ExamInfo> = {
  topik1: {
    name: "TOPIK I",
    max: 200,
    levels: [
      { min: 140, level: "2급" },
      { min: 80, level: "1급" },
    ],
  },
  topik2: {
    name: "TOPIK II",
    max: 300,
    levels: [
      { min: 230, level: "6급" },
      { min: 190, level: "5급" },
      { min: 150, level: "4급" },
      { min: 120, level: "3급" },
    ],
  },
  // EPS-TOPIK (고용허가제 한국어능력시험): 100 ball, daraja berilmaydi.
  // Sohalar bo'yicha minimal ball: ishlab chiqarish (제조업) 60, boshqa sohalar 45; keyin reyting bo'yicha tanlanadi.
  eps: {
    name: "EPS-TOPIK",
    max: 100,
    levels: [
      { min: 60, level: "60+" },
      { min: 45, level: "45+" },
    ],
    levelText: {
      "60+": "ishlab chiqarish (제조업) sohasi uchun minimal ball yig‘ildi",
      "45+": "boshqa sohalar uchun minimal ball yig‘ildi, ishlab chiqarish uchun 60 ball kerak",
    },
  },
};

export function levelFor(exam: ExamId, score: number): string | null {
  for (const l of EXAM_INFO[exam].levels) if (score >= l.min) return l.level;
  return null;
}

/** Keyingi darajaga qancha ball yetishmayapti */
export function nextLevelGap(exam: ExamId, score: number): { level: string; need: number } | null {
  const lv = [...EXAM_INFO[exam].levels].reverse();
  for (const l of lv) if (score < l.min) return { level: l.level, need: l.min - score };
  return null;
}

export const qKey = (s: SectionId, n: number) => `${s}-${n}`;

export function allQuestions(section: Section): { q: Question; g: Group }[] {
  const out: { q: Question; g: Group }[] = [];
  for (const g of section.groups ?? []) for (const q of g.questions) out.push({ q, g });
  return out;
}

/** Tinglash soni: TOPIK I va EPS-TOPIK — 2 marta; TOPIK II — 1~20 bir marta, 21~50 ikki marta */
export function maxPlays(exam: ExamId, n: number) {
  if (exam !== "topik2") return 2;
  return n <= 20 ? 1 : 2;
}

/** Imtihon rejimida audio tugagach har bir savolga javob belgilash uchun beriladigan vaqt (soniya) */
export const ANSWER_SECONDS = 10;

export type ListenItem = {
  key: string; // plays (tinglash soni) kaliti
  text: string;
  max: number; // necha marta eshittiriladi
  questions: number[]; // shu audio qaysi savollarga tegishli
  /** Ko'rsatma (※ [17~21] 다음을 듣고 …) — sahifa boshida bir marta o'qiladi, javob vaqti yo'q */
  intro?: boolean;
};

const EXAMPLE_OPTION = /^[①②③④❶❷❸❹]/;

/**
 * Ko'rsatmaning ovozli matni — haqiqiy TOPIK audiosidagidek: «17번부터 21번까지. 다음을 듣고 보기와 같이 …»,
 * <보기> bo'lsa — uning suhbati ham (variantlar va bo'sh qator o'qilmaydi). Ko'rsatma bo'lmasa — "".
 */
export function instructionSpeech(group: Pick<Group, "from" | "to" | "instruction" | "example">): string {
  const body = (group.instruction ?? "")
    .replace(/^\s*※\s*/, "")
    .replace(/\[[^\]]*\]/g, " ") // [17~21]
    .replace(/\((?:각\s*)?\d+\s*점\)/g, " ") // (각 2점)
    .replace(/<\s*보\s*기\s*>/g, "보기")
    .replace(/\(\s*\)/g, "빈칸")
    .replace(/\s+/g, " ")
    .trim();
  if (!body) return "";
  const nums = group.from === group.to ? `${group.from}번.` : `${group.from}번부터 ${group.to}번까지.`;
  const lines = [`${nums} ${body}`];
  const example = (group.example ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !EXAMPLE_OPTION.test(l) && !/_{3,}/.test(l))
    // 가/나 — ikki xil ovoz bilan o'qilishi uchun
    .map((l) => l.replace(/^가\s*[:：]\s*/, "여자: ").replace(/^나\s*[:：]\s*/, "남자: "));
  if (example.length) lines.push("보기.", ...example);
  return lines.join("\n");
}

/**
 * Bir sahifadagi tinglash audiolari — haqiqiy imtihondagi tartibda: avval ko'rsatma (bir marta), keyin umumiy matn,
 * keyin har bir savolniki. Imtihon rejimida shu ro'yxat ketma-ket, o'zi o'ynaydi.
 */
export function listenItems(exam: ExamId, section: SectionId, group: Group): ListenItem[] {
  const out: ListenItem[] = [];
  const intro = instructionSpeech(group);
  if (intro) out.push({ key: `${section}-i${group.from}`, text: intro, max: 1, questions: [], intro: true });
  if (group.script?.trim())
    out.push({
      key: `${section}-g${group.from}`,
      text: group.script,
      max: maxPlays(exam, group.from),
      questions: group.questions.filter((q) => !q.script?.trim()).map((q) => q.n),
    });
  for (const q of group.questions)
    if (q.script?.trim()) out.push({ key: qKey(section, q.n), text: q.script, max: maxPlays(exam, q.n), questions: [q.n] });
  return out;
}

/** Audio tugagach javob uchun vaqt: har bir savolga ANSWER_SECONDS (ko'rsatmadan keyin — yo'q) */
export const answerSeconds = (item: ListenItem) => (item.intro ? 0 : ANSWER_SECONDS * Math.max(1, item.questions.length));

/**
 * Test oxirigacha ishlanmay «Tugatish» bosilganda natija nechta bo'lim bo'yicha chiqariladi.
 * Hozirgi bo'lim — u tugatilgan yoki unda kamida bitta javob bo'lsa kiradi; boshlanmagan bo'limlar kirmaydi.
 * Kamida bitta bo'lim doim bo'ladi.
 */
export function reachedSections(current: number, currentStarted: boolean) {
  return Math.max(1, currentStarted ? current + 1 : current);
}

export function sectionMax(section: Section): number {
  if (section.writing) return section.writing.reduce((a, w) => a + w.pts, 0);
  return allQuestions(section).reduce((a, x) => a + x.q.pts, 0);
}

export function scoreSection(section: Section, answers: Record<string, number>) {
  let score = 0;
  let correct = 0;
  const list = allQuestions(section);
  for (const { q } of list) {
    if (answers[qKey(section.id, q.n)] === q.answer) {
      score += q.pts;
      correct++;
    }
  }
  return { score, correct, total: list.length, max: sectionMax(section) };
}

export type HistoryItem = {
  id: string;
  testId: string;
  exam: ExamId;
  title: string;
  date: number;
  mode: "exam" | "practice";
  sections: Partial<Record<SectionId, { score: number; max: number }>>;
  total: number;
  max: number;
  level: string | null;
  estimated?: boolean;
};

export const SECTION_LABEL: Record<SectionId, { ko: string; uz: string; icon: string }> = {
  listening: { ko: "듣기", uz: "Tinglab tushunish", icon: "🎧" },
  reading: { ko: "읽기", uz: "O‘qib tushunish", icon: "📖" },
  writing: { ko: "쓰기", uz: "Yozish", icon: "✍️" },
};

/** Tinglash matnini TTS uchun gaplarga ajratish */
export function parseScript(script: string): { speaker: string | null; text: string }[] {
  return script
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !/_{3,}/.test(l))
    .map((l) => {
      const m = l.match(/^(남자|여자|남|여)\s*[:：]\s*(.*)$/);
      if (m) return { speaker: m[1].startsWith("남") ? "남자" : "여자", text: m[2] };
      return { speaker: null, text: l };
    })
    .filter((x) => x.text);
}

export function formatTime(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(r).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export const CIRCLED = ["①", "②", "③", "④"];
