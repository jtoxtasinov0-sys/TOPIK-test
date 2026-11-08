// Natija sahifasidagi «Xatolar tahlili»: savol turlari va xatolar xulosasi.

import assert from "node:assert/strict";
import { describe, test } from "node:test";

const { ALL_BUILTIN_TESTS } = await import("../src/data/tests");
const { TOPIK1 } = await import("../src/data/topik1");
const { allQuestions, qKey } = await import("../src/lib/exam");
const { KIND_INFO, mistakeSummary, questionKind } = await import("../src/lib/review");

const g = (instruction: string) => ({ instruction });

describe("xatolar tahlili: savol turi", () => {
  test("savol matni bo‘yicha (bo‘lmasa — ko‘rsatma bo‘yicha)", () => {
    const cases: [string | undefined, string, string][] = [
      ["두 사람이 무엇에 대해 이야기를 하고 있는지 고르십시오.", "", "topic"],
      ["여자가 왜 이 이야기를 하고 있는지 고르십시오.", "", "reason"],
      ["남자의 중심 생각으로 가장 알맞은 것을 고르십시오.", "", "main"],
      ["들은 내용과 일치하는 것을 고르십시오.", "", "same"],
      ["밑줄 친 부분에 나타난 '나'의 심정으로 가장 알맞은 것을 고르십시오.", "", "attitude"],
      ["다음 문장이 들어갈 곳을 고르십시오.", "", "insert"],
      ["㉠에 들어갈 알맞은 것을 고르십시오.", "", "blank"],
      ["다음 주부터 일은 몇 시에 끝납니까?", "", "detail"],
      [undefined, "※ [7~10] 여기는 어디입니까? <보기>와 같이 알맞은 것을 고르십시오.", "place"],
      [undefined, "※ [1~4] 다음을 듣고 <보기>와 같이 물음에 맞는 대답을 고르십시오.", "reply"],
      [undefined, "※ [9~12] 다음 대화를 잘 듣고 여자가 이어서 할 행동으로 알맞은 것을 고르십시오. (각 2점)", "action"],
      [undefined, "※ [1~4] 다음 그림을 보고 맞는 단어나 문장을 고르십시오.", "picture"],
      [undefined, "※ 다음 글 또는 도표의 내용과 같은 것을 고르십시오. (각 2점)", "same"],
      [undefined, "※ [5~8] 다음 밑줄 친 부분과 의미가 비슷한 것을 고르십시오.", "similar"],
    ];
    for (const [prompt, instruction, kind] of cases) assert.equal(questionKind({ prompt }, g(instruction)), kind, prompt ?? instruction);
  });

  test("har bir tur uchun nom va maslahat bor; tayyor variantlarning ko‘p savoli turini topadi", () => {
    for (const info of Object.values(KIND_INFO)) {
      assert.ok(info.label.trim());
      assert.ok(info.tip.length > 40);
    }
    let all = 0;
    let other = 0;
    for (const t of ALL_BUILTIN_TESTS)
      for (const s of t.sections)
        for (const { q, g } of allQuestions(s)) {
          all++;
          if (questionKind(q, g) === "other") other++;
        }
    assert.ok(other / all < 0.15, `${other}/${all} savol turi aniqlanmadi`);
  });
});

describe("xatolar tahlili: xulosa", () => {
  test("xato va javobsiz savollar bo‘lim va tur bo‘yicha sanaladi, to‘g‘rilari kirmaydi", () => {
    const listening = TOPIK1.sections[0];
    const reading = TOPIK1.sections[1];
    const answers: Record<string, number> = {};
    for (const s of [listening, reading]) for (const { q } of allQuestions(s)) answers[qKey(s.id, q.n)] = q.answer;
    answers[qKey("listening", 27)] = 4; // 요리 방법 — xato (to'g'risi 방학 계획)
    delete answers[qKey("listening", 28)]; // javobsiz
    answers[qKey("reading", 31)] = (reading.groups![0].questions[0].answer % 4) + 1;

    const m = mistakeSummary([listening, reading], answers);
    assert.equal(m.total, 3);
    assert.equal(m.unanswered, 1);
    assert.deepEqual(m.bySection, [
      { section: "listening", count: 2 },
      { section: "reading", count: 1 },
    ]);
    const topic = m.kinds.find((k) => k.kind === "topic");
    // 31 (읽기) ham «무엇에 대한 이야기입니까» — mavzu turi
    assert.deepEqual(topic?.items, [
      { section: "listening", n: 27, unanswered: false },
      { section: "reading", n: 31, unanswered: false },
    ]);
    assert.equal(m.kinds[0].kind, "topic", "eng ko‘p xato qilingan tur birinchi");
    assert.match(topic!.tip, /방학 계획/);
    assert.ok(m.kinds.some((k) => k.items.some((it) => it.n === 28 && it.unanswered)));
  });

  test("hammasi to‘g‘ri — xato yo‘q", () => {
    const s = TOPIK1.sections[0];
    const answers = Object.fromEntries(allQuestions(s).map(({ q }) => [qKey(s.id, q.n), q.answer]));
    const m = mistakeSummary([s], answers);
    assert.equal(m.total, 0);
    assert.deepEqual(m.kinds, []);
    assert.deepEqual(m.bySection, []);
  });
});
