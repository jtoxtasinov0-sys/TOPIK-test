// Tayyor variantlar, 국립국어원 lug‘ati, rasmiy o‘tgan testlar va TOPIK faktlari: ma’lumotlar butunligi.

import assert from "node:assert/strict";
import { describe, test } from "node:test";

const { ALL_BUILTIN_TESTS, BUILTIN_TESTS } = await import("../src/data/tests");
const { TOPIK2_V2 } = await import("../src/data/topik2v2");
const { EXAM_INFO, allQuestions, sectionMax } = await import("../src/lib/exam");
const { imagePromptsOf, MAX_IMAGE_PROMPT } = await import("../src/lib/images");
const { VOCAB_A, VOCAB_B, VOCAB_ALL, LEVEL_DECKS, findWordsIn } = await import("../src/data/vocab");
const { romanize } = await import("../src/lib/romanize");
const { PAST_ROUNDS, PAST_PARTS, pastUrl } = await import("../src/data/pastExams");
const { TOPIK_FACTS, vocabNotes } = await import("../src/lib/knowledge");

// Rasmiy tuzilma: bo‘lim → [savollar soni, ball]
const SHAPE: Record<string, Record<string, [number, number]>> = {
  topik1: { listening: [30, 100], reading: [40, 100] },
  topik2: { listening: [50, 100], writing: [4, 100], reading: [50, 100] },
};

describe("tayyor variantlar", () => {
  test("ro‘yxat: noyob id, to‘g‘ri imtihon turi, yangi variantlar bor", () => {
    assert.equal(new Set(ALL_BUILTIN_TESTS.map((t) => t.id)).size, ALL_BUILTIN_TESTS.length);
    for (const [exam, list] of Object.entries(BUILTIN_TESTS)) for (const t of list) assert.equal(t.exam, exam, t.id);
    assert.deepEqual(
      BUILTIN_TESTS.topik1.map((t) => t.id),
      ["topik1-v1", "topik1-v2"]
    );
    assert.deepEqual(
      BUILTIN_TESTS.topik2.map((t) => t.id),
      ["topik2-v1", "topik2-v2"]
    );
  });

  test("har bir variant: savollar ketma-ket, 4 ta variant, javob 1–4, jami ball imtihonga teng", () => {
    for (const t of ALL_BUILTIN_TESTS) {
      let total = 0;
      for (const s of t.sections) {
        total += sectionMax(s);
        const shape = SHAPE[t.exam]?.[s.id];
        if (s.writing) {
          assert.deepEqual(
            s.writing.map((w) => w.n),
            [51, 52, 53, 54],
            `${t.id} 쓰기`
          );
          if (shape) assert.deepEqual([s.writing.length, sectionMax(s)], shape, `${t.id} ${s.id}`);
          continue;
        }
        const qs = allQuestions(s);
        if (shape) assert.deepEqual([qs.length, sectionMax(s)], shape, `${t.id} ${s.id}`);
        qs.forEach(({ q, g }, i) => {
          const id = `${t.id} ${s.id} ${q.n}`;
          if (i) assert.equal(q.n, qs[i - 1].q.n + 1, `${id}: raqamlar ketma-ket`);
          assert.ok(q.n >= g.from && q.n <= g.to, `${id}: guruh oralig‘ida`);
          assert.equal(q.options.length, 4, id);
          assert.ok(Number.isInteger(q.answer) && q.answer >= 1 && q.answer <= 4, id);
          if (q.optionStyle === "picture") assert.equal(q.optionImages?.length, 4, `${id}: 4 ta rasm tavsifi`);
          if (q.optionStyle === "chart") assert.equal(q.optionCharts?.length, 4, `${id}: 4 ta grafik`);
          if (s.id === "listening") assert.ok((q.script ?? g.script)?.trim(), `${id}: tinglash matni`);
        });
      }
      assert.equal(total, EXAM_INFO[t.exam].max, `${t.id}: jami ball`);
    }
  });

  test("javoblar bir xil raqamga yig‘ilib qolmagan (yangi variantlar)", () => {
    for (const t of [BUILTIN_TESTS.topik1[1], TOPIK2_V2])
      for (const s of t.sections) {
        const qs = allQuestions(s);
        if (!qs.length) continue;
        const counts = [1, 2, 3, 4].map((a) => qs.filter(({ q }) => q.answer === a).length);
        for (const c of counts) assert.ok(c >= qs.length * 0.15, `${t.id} ${s.id}: ${counts.join("/")}`);
      }
  });

  test("rasm marshruti yangi variantlarning rasm tavsiflarini ham taniydi", () => {
    const all = imagePromptsOf(ALL_BUILTIN_TESTS);
    for (const p of imagePromptsOf([TOPIK2_V2, BUILTIN_TESTS.topik1[1]])) assert.ok(all.includes(p));
    assert.ok(all.every((p) => p.length <= MAX_IMAGE_PROMPT));
  });
});

describe("국립국어원 lug‘ati", () => {
  test("so‘zlar soni, noyob id, bo‘sh maydon yo‘q, to‘plamlar 50 tadan", () => {
    assert.ok(VOCAB_A.length >= 900 && VOCAB_B.length >= 900, `${VOCAB_A.length} / ${VOCAB_B.length}`);
    assert.equal(new Set(VOCAB_ALL.map((w) => w.id)).size, VOCAB_ALL.length, "id takrorlanmasin");
    for (const w of VOCAB_ALL) assert.ok(w.ko && w.uz && w.rom && w.pos, w.id);
    for (const lv of ["A", "B"] as const) {
      const decks = LEVEL_DECKS[lv];
      assert.equal(
        decks.reduce((a, d) => a + d.words.length, 0),
        lv === "A" ? VOCAB_A.length : VOCAB_B.length
      );
      assert.ok(decks.every((d) => d.words.length >= 1 && d.words.length <= 50));
    }
  });

  test("romanizatsiya talaffuz qoidalari bilan", () => {
    const cases: [string, string][] = [
      ["좋다", "jota"],
      ["많다", "manta"],
      ["학년", "hangnyeon"],
      ["신라", "silla"],
      ["국립", "gungnip"],
      ["같이", "gachi"],
      ["한국어", "hangugeo"],
    ];
    for (const [ko, rom] of cases) assert.equal(romanize(ko), rom, ko);
  });

  test("savoldagi so‘zlar lug‘atdan topiladi, tasodifiy bo‘g‘inlar emas", () => {
    const found = findWordsIn("회사에서 월급을 받았는데 세금이 많아요").map((w) => w.ko);
    for (const ko of ["회사", "세금", "받다", "많다"]) assert.ok(found.includes(ko), ko);
    assert.ok(!findWordsIn("저는 학교에 가요").some((w) => w.ko === "서다"));
    assert.match(vocabNotes("계약을 했어요"), /계약.*shartnoma/);
    assert.equal(vocabNotes("hech qanday koreyscha yo‘q"), "");
  });
});

describe("rasmiy o‘tgan testlar va TOPIK faktlari", () => {
  test("12 ta sessiya, har biriga 4 ta rasmiy havola", () => {
    assert.equal(PAST_ROUNDS.length, 12);
    assert.equal(new Set(PAST_ROUNDS.map((r) => r.no)).size, 12);
    assert.equal(PAST_PARTS.length, 4);
    assert.equal(pastUrl(102, 2, "r"), "https://www.topik.go.kr/TWSTDY/TWSTDY0090.do?sNo=102&sGrade=2&sType=r");
  });

  test("AI Ustoz faktlari: jadval, darajalar va mualliflik qoidasi", () => {
    for (const s of ["109-sessiya 2026-11-15", "140+ → 2급", "230+ → 6급", "verbatim", "/test/past"]) assert.ok(TOPIK_FACTS.includes(s), s);
  });
});
