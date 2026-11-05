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

export type Question = {
  n: number;
  pts: number;
  prompt?: string; // savolning o'z matni (masalan: "남자가 왜 ...?")
  given?: string; // joylashtiriladigan gap (39~41)
  script?: string; // tinglash matni (남자: ... / 여자: ...)
  passage?: string; // o'qish matni
  picture?: string; // savoldagi rasm (emoji sahna yoki xavfsizlik belgisi) — EPS-TOPIK uchun
  notice?: NoticeSpec;
  chart?: ChartSpec;
  options: string[];
  optionStyle?: "text" | "picture" | "chart";
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
