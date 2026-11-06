// Imtihon rejimi: tinglash audiosi o'zi o'ynash tartibi va «Tugatish» (muddatidan oldin natija).

import assert from "node:assert/strict";
import { describe, test } from "node:test";

const { ALL_BUILTIN_TESTS } = await import("../src/data/tests");
const { ANSWER_SECONDS, answerSeconds, listenItems, maxPlays, qKey, reachedSections } = await import("../src/lib/exam");

describe("tinglash: audio o‘zi o‘ynash tartibi", () => {
  test("eshittirish soni: TOPIK I va EPS — 2, TOPIK II — 1~20 bir marta, 21~50 ikki marta", () => {
    assert.equal(maxPlays("topik1", 1), 2);
    assert.equal(maxPlays("eps", 20), 2);
    assert.equal(maxPlays("topik2", 1), 1);
    assert.equal(maxPlays("topik2", 20), 1);
    assert.equal(maxPlays("topik2", 21), 2);
    assert.equal(maxPlays("topik2", 50), 2);
  });

  test("avval umumiy matn, keyin har bir savolniki; kalitlar sahifadagi pleer kalitlari bilan bir xil", () => {
    const group = {
      from: 21,
      to: 23,
      instruction: "",
      script: "남자: 안녕하세요",
      questions: [
        { n: 21, pts: 2, options: [], answer: 1 },
        { n: 22, pts: 2, options: [], answer: 1 },
        { n: 23, pts: 2, script: "여자: 네", options: [], answer: 1 },
      ],
    };
    const items = listenItems("topik2", "listening", group);
    assert.deepEqual(
      items.map((it) => [it.key, it.max, it.questions]),
      [
        ["listening-g21", 2, [21, 22]],
        ["listening-23", 2, [23]],
      ]
    );
    assert.equal(answerSeconds(items[0]), ANSWER_SECONDS * 2);
    assert.equal(answerSeconds(items[1]), ANSWER_SECONDS);
  });

  test("tayyor variantlar: har bir tinglash savolining audiosi bor, kalitlar noyob", () => {
    for (const t of ALL_BUILTIN_TESTS)
      for (const s of t.sections) {
        if (s.id !== "listening") continue;
        const keys = new Set<string>();
        for (const g of s.groups ?? []) {
          const items = listenItems(t.exam, s.id, g);
          assert.ok(items.length > 0, `${t.id} ${g.from}~${g.to}: audio yo‘q`);
          for (const it of items) {
            assert.ok(!keys.has(it.key), `${t.id}: ${it.key} takrorlandi`);
            keys.add(it.key);
            assert.ok(it.text.trim());
            assert.ok(it.max === 1 || it.max === 2);
          }
          // Har bir savol qaysidir audioga tegishli (javob vaqti hisoblanadi)
          const covered = new Set(items.flatMap((it) => it.questions));
          for (const q of g.questions) assert.ok(covered.has(q.n), `${t.id}: ${q.n}-savol audiosiz`);
          for (const q of g.questions) if (q.script?.trim()) assert.ok(items.some((it) => it.key === qKey(s.id, q.n)));
        }
      }
  });
});

describe("«Tugatish»: natija qaysi bo‘limlar bo‘yicha", () => {
  test("hozirgi bo‘limda javob bo‘lsa — u ham kiradi, bo‘lmasa — faqat oldingilari", () => {
    assert.equal(reachedSections(0, true), 1);
    assert.equal(reachedSections(1, true), 2);
    assert.equal(reachedSections(1, false), 1);
    assert.equal(reachedSections(2, false), 2);
  });

  test("kamida bitta bo‘lim doim bo‘ladi", () => {
    assert.equal(reachedSections(0, false), 1);
  });
});
