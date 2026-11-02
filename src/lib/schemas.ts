import "server-only";

// Gemini structured output uchun JSON sxemalar

const str = { type: "string" };
const strArr = { type: "array", items: str };

export const chartSchema = {
  type: "object",
  properties: {
    kind: { type: "string", enum: ["bar", "pie", "line"] },
    title: str,
    unit: str,
    labels: strArr,
    series: {
      type: "array",
      items: { type: "object", properties: { name: str, values: { type: "array", items: { type: "number" } } }, required: ["values"] },
    },
  },
  required: ["kind", "labels", "series"],
};

export const noticeSchema = {
  type: "object",
  properties: { style: { type: "string", enum: ["poster", "msg", "ad"] }, title: str, lines: strArr },
  required: ["lines"],
};

export const groupSchema = {
  type: "object",
  properties: {
    example: str,
    script: str,
    passage: str,
    given: str,
    notice: noticeSchema,
    chart: chartSchema,
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          n: { type: "integer" },
          prompt: str,
          given: str,
          script: str,
          passage: str,
          notice: noticeSchema,
          chart: chartSchema,
          options: strArr,
          optionStyle: { type: "string", enum: ["text", "picture", "chart"] },
          optionCharts: { type: "array", items: chartSchema },
          answer: { type: "integer", description: "1-4" },
        },
        required: ["n", "options", "answer"],
      },
    },
  },
  required: ["questions"],
};

export const writingTaskSchema = {
  type: "object",
  properties: { passage: str, chart: chartSchema, notes: strArr, topic: str },
};

export const explainSchema = {
  type: "object",
  properties: {
    translation: { type: "string", description: "Translation of the Korean audio script / passage" },
    correct_reason: str,
    wrong_options: str,
    vocab: { type: "array", items: { type: "object", properties: { ko: str, meaning: str }, required: ["ko", "meaning"] } },
    grammar: { type: "array", items: { type: "object", properties: { pattern: str, meaning: str }, required: ["pattern", "meaning"] } },
    tip: str,
  },
  required: ["translation", "correct_reason", "vocab", "grammar", "tip"],
};

export const writingResultSchema = {
  type: "object",
  properties: {
    recognized_text: { type: "string", description: "Exact Korean text recognized from the handwriting/typed answer" },
    char_count: { type: "integer" },
    score: { type: "number" },
    max: { type: "number" },
    criteria: {
      type: "array",
      items: {
        type: "object",
        properties: { name: str, score: { type: "number" }, max: { type: "number" }, comment: str },
        required: ["name", "score", "max", "comment"],
      },
    },
    strengths: strArr,
    mistakes: {
      type: "array",
      items: {
        type: "object",
        properties: { original: str, corrected: str, explanation: str },
        required: ["original", "corrected", "explanation"],
      },
    },
    model_answer: str,
    summary: str,
    level_hint: str,
  },
  required: ["recognized_text", "score", "max", "criteria", "strengths", "mistakes", "model_answer", "summary"],
};

export const speakSchema = {
  type: "object",
  properties: {
    reply_ko: str,
    reply_rom: str,
    reply_tr: str,
    feedback: {
      type: "object",
      properties: {
        score: { type: "integer", description: "0-100" },
        corrected_ko: str,
        explanation: str,
        pronunciation: str,
      },
    },
    suggestions: {
      type: "array",
      items: { type: "object", properties: { ko: str, tr: str }, required: ["ko", "tr"] },
    },
    done: { type: "boolean" },
  },
  required: ["reply_ko", "reply_rom", "reply_tr", "suggestions"],
};
