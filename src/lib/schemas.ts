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
          picture: { type: "string", description: "Emoji scene shown with the question (only if the template has it)" },
          pictureImage: { type: "string", description: "English description of the question picture for an illustrator (only if the template has it)" },
          sign: {
            type: "object",
            description: "Safety sign shown with the question (only if the template has it)",
            properties: { kind: { type: "string", enum: ["prohibit", "warn", "order", "guide"] }, icon: str },
            required: ["kind", "icon"],
          },
          notice: noticeSchema,
          chart: chartSchema,
          options: strArr,
          optionStyle: { type: "string", enum: ["text", "picture", "chart"] },
          optionImages: { type: "array", items: str, description: "For picture options: 4 English scene descriptions for an illustrator" },
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

/** Ovozli ustoz: javob tillar bo'yicha bo'laklarga ajratiladi (o'zbekcha tushuntirish + koreyscha so'zlar) */
export const voiceSchema = {
  type: "object",
  properties: {
    heard: {
      type: "string",
      description: "Exactly what the student said in the attached audio, in the original language and script (empty if no clear speech)",
    },
    segments: {
      type: "array",
      description: "What the teacher says, in order, split by language",
      items: {
        type: "object",
        properties: { lang: { type: "string", enum: ["uz", "ko"] }, text: str },
        required: ["lang", "text"],
      },
    },
    practice: {
      type: "object",
      description: "Main Korean phrase of this turn for the student to repeat (empty ko if none)",
      properties: { ko: str, rom: str, uz: str },
    },
  },
  required: ["heard", "segments"],
};

/** Erkin suhbat: koreyscha javob + kerak bo'lsa o'zbekcha yordam, xato tuzatish va javob g'oyalari */
export const talkSchema = {
  type: "object",
  properties: {
    heard: {
      type: "string",
      description: "Exactly what the student said, in the original language and script (empty if no clear speech or if starting)",
    },
    help: {
      type: "array",
      description: "Short Uzbek help, split by language — only when the student used Uzbek/Russian, asked how to say something or did not understand; otherwise []",
      items: {
        type: "object",
        properties: { lang: { type: "string", enum: ["uz", "ko"] }, text: str },
        required: ["lang", "text"],
      },
    },
    teach: {
      type: "object",
      description: "The full Korean sentence the student wanted to say (only together with help; empty ko otherwise)",
      properties: { ko: str, rom: str, uz: str },
    },
    reply: { type: "string", description: "Your next line in Korean only (Hangul)" },
    reply_rom: str,
    reply_uz: str,
    fix: {
      type: "object",
      description: "Natural correct version of the student's Korean sentence and a short Uzbek explanation; empty strings if it was fine",
      properties: { ko: str, uz: str },
    },
    hints: {
      type: "array",
      description: "2 short Korean answers the student could say next",
      items: { type: "object", properties: { ko: str, uz: str }, required: ["ko", "uz"] },
    },
  },
  required: ["heard", "help", "reply", "reply_rom", "reply_uz", "hints"],
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
