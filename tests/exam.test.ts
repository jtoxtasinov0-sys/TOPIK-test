// Imtihon rejimi: tinglash audiosi o'zi o'ynash tartibi va «Tugatish» (muddatidan oldin natija).

import assert from "node:assert/strict";
import { describe, test } from "node:test";

const { ALL_BUILTIN_TESTS } = await import("../src/data/tests");
const { ANSWER_SECONDS, answerSeconds, instructionSpeech, listenItems, maxPlays, parseScript, qKey, reachedSections } = await import("../src/lib/exam");
const { TOPIK1 } = await import("../src/data/topik1");

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

  test("ko‘rsatma haqiqiy imtihondagidek koreyscha o‘qiladi: raqamlar, <보기> suhbati, variantlarsiz", () => {
    const g = TOPIK1.sections[0].groups!.find((x) => x.from === 17)!;
    const text = instructionSpeech(g);
    const lines = text.split("\n");
    assert.equal(lines[0], "17번부터 21번까지. 다음을 듣고 보기와 같이 대화 내용과 같은 것을 고르십시오.");
    assert.equal(lines[1], "보기.");
    assert.deepEqual(lines.slice(2), ["남자: 요즘 한국어를 공부해요?", "여자: 네, 한국 친구한테서 한국어를 배워요."]);
    assert.doesNotMatch(text, /[※<>\[\]①②③④❶❷❸❹]/);
    // TTS: ko'rsatma — diktor, suhbat — ikki ovoz
    assert.deepEqual(
      parseScript(text).map((l) => l.speaker),
      [null, null, "남자", "여자"]
    );
  });

  test("ko‘rsatma: (각 2점) o‘qilmaydi, 가/나 ikki ovozga, bo‘sh qator tashlanadi, bitta savol — «N번»", () => {
    assert.equal(
      instructionSpeech({ from: 1, to: 3, instruction: "※ [1~3] 다음을 듣고 알맞은 그림 또는 그래프를 고르십시오. (각 2점)" }),
      "1번부터 3번까지. 다음을 듣고 알맞은 그림 또는 그래프를 고르십시오."
    );
    assert.equal(
      instructionSpeech({ from: 1, to: 4, instruction: "※ [1~4] 다음을 듣고 <보기>와 같이 물음에 맞는 대답을 고르십시오.", example: "가: 공책이에요?\n나: ____________\n❶ 네, 공책이에요.   ② 네, 공책이 없어요." }),
      "1번부터 4번까지. 다음을 듣고 보기와 같이 물음에 맞는 대답을 고르십시오.\n보기.\n여자: 공책이에요?"
    );
    assert.equal(instructionSpeech({ from: 15, to: 15, instruction: "※ [15] 다음을 듣고 물음에 답하십시오." }), "15번. 다음을 듣고 물음에 답하십시오.");
    assert.equal(instructionSpeech({ from: 1, to: 2, instruction: "" }), "");
  });

  test("sahifa ko‘rsatma bilan boshlanadi: bir marta, javob vaqtisiz, keyin savol audiolari", () => {
    const g = TOPIK1.sections[0].groups!.find((x) => x.from === 27)!;
    const items = listenItems("topik1", "listening", g);
    assert.deepEqual(
      items.map((it) => [it.key, it.max, it.questions, !!it.intro]),
      [
        ["listening-i27", 1, [], true],
        ["listening-g27", 2, [27, 28], false],
      ]
    );
    assert.equal(answerSeconds(items[0]), 0);
    assert.equal(answerSeconds(items[1]), ANSWER_SECONDS * 2);
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
          // Har bir sahifa ko'rsatma bilan boshlanadi
          assert.ok(items[0].intro, `${t.id} ${g.from}~${g.to}: ko‘rsatma o‘qilmaydi`);
          assert.ok(items.slice(1).every((it) => !it.intro));
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
