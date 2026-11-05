// Ustoz bilim bazasi va EPS-TOPIK testi: ma'lumotlar butunligi, qidiruv va AI yo'llariga ulanishi.
// Gemini soxta fetch bilan almashtiriladi; login o'chiq ("ochiq" rejim).

import assert from "node:assert/strict";
import { afterEach, before, describe, test } from "node:test";

process.env.GEMINI_API_KEY = "test-key";
process.env.GOOGLE_CLIENT_ID = "";
process.env.GOOGLE_CLIENT_SECRET = "";

const { createMemoryStore, setStore } = await import("../src/lib/server/store");
const { GRAMMAR } = await import("../src/data/knowledge/grammar");
const { MISTAKES } = await import("../src/data/knowledge/mistakes");
const { WORK_NOTES } = await import("../src/data/knowledge/work");
const { STAGES } = await import("../src/data/knowledge/curriculum");
const { findGrammar, findMistakes, findWork, teacherNotes, BASIC_GRAMMAR } = await import("../src/lib/knowledge");
const { EPS } = await import("../src/data/eps");
const { TOPIK1 } = await import("../src/data/topik1");
const { TOPIK2 } = await import("../src/data/topik2");
const { EXAM_INFO, levelFor, nextLevelGap, allQuestions, sectionMax } = await import("../src/lib/exam");
const explainRoute = await import("../src/app/api/explain/route");
const tutorRoute = await import("../src/app/api/tutor/route");
const writingRoute = await import("../src/app/api/writing/route");

const realFetch = globalThis.fetch;
let systems: string[] = [];

function mockGemini(reply: () => Response) {
  systems = [];
  globalThis.fetch = (async (_url: string | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as { system_instruction?: string };
    systems.push(String(body.system_instruction ?? ""));
    return reply();
  }) as typeof fetch;
}
const jsonOut = (o: unknown) => Response.json({ steps: [{ type: "model_output", content: [{ type: "text", text: JSON.stringify(o) }] }] });
const sseOut = (text: string) =>
  new Response(`data: ${JSON.stringify({ event_type: "step.delta", delta: { type: "text", text } })}\n\n`, {
    headers: { "Content-Type": "text/event-stream" },
  });

let ip = 0;
const post = (path: string, body: unknown) =>
  new Request(`https://hanustoz.tech${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": `10.1.0.${++ip}` },
    body: JSON.stringify(body),
  });

before(() => setStore(createMemoryStore()));
afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("bilim bazasi ma'lumotlari", () => {
  test("grammatika: 100+ karta, noyob id, 1–6급, kamida 2 misol", () => {
    assert.ok(GRAMMAR.length >= 100, `kartalar soni: ${GRAMMAR.length}`);
    assert.equal(new Set(GRAMMAR.map((g) => g.id)).size, GRAMMAR.length, "id takrorlanmasin");
    for (const g of GRAMMAR) {
      assert.ok(/^[a-z-]+$/.test(g.id), `id faqat lotin: ${g.id}`);
      assert.ok(g.level >= 1 && g.level <= 6, g.id);
      assert.ok(g.examples.length >= 1 && g.examples.every(([ko, uz]) => ko.trim() && uz.trim()), g.id);
      assert.ok(g.uz.trim() && g.form.trim(), g.id);
    }
    for (const lv of [1, 2, 3, 4, 5, 6]) assert.ok(GRAMMAR.some((g) => g.level === lv), `${lv}급 bor`);
    for (const id of BASIC_GRAMMAR) assert.ok(GRAMMAR.some((g) => g.id === id), `BASIC: ${id}`);
  });

  test("xatolar, ish joyi va daraja rejasi", () => {
    assert.equal(new Set(MISTAKES.map((m) => m.id)).size, MISTAKES.length);
    assert.equal(new Set(WORK_NOTES.map((w) => w.id)).size, WORK_NOTES.length);
    assert.deepEqual(
      STAGES.map((s) => s.id),
      ["0", "1급", "2급", "3급", "4급", "5급", "6급", "eps"]
    );
  });
});

describe("qidiruv", () => {
  test("grammatika savolga mos topiladi", () => {
    assert.deepEqual(
      findGrammar("-(으)려고 va -(으)러 farqi").map((g) => g.id),
      ["ryeogo", "reo"]
    );
    assert.deepEqual(
      findGrammar("은/는 va 이/가 farqi nima?").map((g) => g.id),
      ["eun-neun", "i-ga"]
    );
    assert.equal(findGrammar("salom").length, 0);
  });

  test("filtr: daraja va oddiy shakllarni chiqarib tashlash", () => {
    const text = "비가 오는 바람에 늦었어요. 일하려고 왔습니다.";
    const ids = findGrammar(text, 5, { minLevel: 2, exclude: BASIC_GRAMMAR }).map((g) => g.id);
    assert.ok(ids.includes("barame") && ids.includes("ryeogo"), ids.join());
    assert.ok(ids.every((id) => !BASIC_GRAMMAR.includes(id)));
  });

  test("o'zbeklarga xos xato va ish joyi ma'lumoti", () => {
    assert.ok(findMistakes("공장에 일해요 to'g'rimi?").some((m) => m.id === "e-eseo"));
    assert.ok(findMistakes("ㅓ va ㅗ ni qanday farqlayman").some((m) => m.id === "eo-o"));
    assert.ok(findMistakes("Ishda boshliqqa qanday murojaat qilinadi?").some((m) => m.id === "dangsin"));
    assert.ok(findWork("xavfsizlik belgilari 안전모").some((w) => w.id === "signs-order"));
    assert.equal(teacherNotes("salom, qalaysiz"), "");
    assert.match(teacherNotes("-(으)려고 nima?"), /Grammatika kartochkalari:[\s\S]*-\(으\)려고/);
  });
});

describe("EPS-TOPIK", () => {
  test("tuzilma: o'qish 1–20 (25 daq.), tinglash 21–40 (25 daq.), 100 ball", () => {
    assert.equal(EPS.exam, "eps");
    assert.deepEqual(
      EPS.sections.map((s) => [s.id, s.minutes]),
      [
        ["reading", 25],
        ["listening", 25],
      ]
    );
    const nums = EPS.sections.flatMap((s) => allQuestions(s).map(({ q }) => q.n));
    assert.deepEqual(
      nums,
      Array.from({ length: 40 }, (_, i) => i + 1)
    );
    assert.equal(
      EPS.sections.reduce((a, s) => a + sectionMax(s), 0),
      EXAM_INFO.eps.max
    );
    for (const s of EPS.sections)
      for (const { q, g } of allQuestions(s)) {
        assert.equal(q.options.length, 4, `${q.n}`);
        assert.ok(q.answer >= 1 && q.answer <= 4, `${q.n}`);
        assert.ok(q.n >= g.from && q.n <= g.to, `${q.n} guruh oralig'ida`);
        if (s.id === "listening") assert.ok(q.script || g.script, `${q.n} tinglash matni bor`);
      }
  });

  test("javoblar taqsimoti muvozanatli (har bir variant 8–12 marta)", () => {
    const count = [0, 0, 0, 0];
    for (const s of EPS.sections) for (const { q } of allQuestions(s)) count[q.answer - 1]++;
    for (const c of count) assert.ok(c >= 8 && c <= 12, count.join());
  });

  test("minimal ball: 60+ ishlab chiqarish, 45+ boshqa sohalar", () => {
    assert.equal(levelFor("eps", 72.5), "60+");
    assert.equal(levelFor("eps", 50), "45+");
    assert.equal(levelFor("eps", 40), null);
    assert.deepEqual(nextLevelGap("eps", 50), { level: "60+", need: 10 });
    assert.ok(EXAM_INFO.eps.levelText?.["60+"]);
  });

  test("TOPIK variantlari o'zgarmagan: 200 va 300 ball", () => {
    assert.equal(
      TOPIK1.sections.reduce((a, s) => a + sectionMax(s), 0),
      200
    );
    assert.equal(
      TOPIK2.sections.reduce((a, s) => a + sectionMax(s), 0),
      300
    );
  });
});

describe("AI yo'llari bilim bazasidan foydalanadi", () => {
  test("/api/explain: savoldagi grammatika kartasi va EPS ma'lumoti promptga qo'shiladi", async () => {
    mockGemini(() => jsonOut({ translation: "t", correct_reason: "r", vocab: [], grammar: [], tip: "x" }));
    const context = "※ [10~12] 다음 안전 표지가 뜻하는 것을 고르십시오.\n[그림] 🔵 ⛑️\n작업장은 위험하므로 안전모를 착용해야 합니다.\n① 안전모 착용";
    const res = await explainRoute.POST(post("/api/explain", { context, answer: 1, exam: "eps" }));
    assert.equal(res.status, 200);
    assert.equal(systems.length, 1);
    assert.match(systems[0], /EPS-TOPIK/);
    assert.match(systems[0], /Knowledge base notes/);
    assert.match(systems[0], /-\(으\)므로/, "grammatika kartasi");
    assert.match(systems[0], /안전모 착용/, "xavfsizlik belgilari");
    assert.doesNotMatch(systems[0], /\[1급\] -아요\/어요/, "oddiy shakllar qo'shilmaydi");
  });

  test("/api/tutor: o'qitish uslubi, o'quvchi profili va mos kartalar", async () => {
    mockGemini(() => sseOut("Salom!"));
    const res = await tutorRoute.POST(
      post("/api/tutor", {
        messages: [{ role: "user", text: "-(으)니까 va -아서/어서 farqi nima?" }],
        student: "target level 3급; recent mock tests: TOPIK II 2026-11-01: 98/300",
      })
    );
    assert.equal(res.status, 200);
    assert.equal(await res.text(), "Salom!");
    assert.match(systems[0], /Teaching method/);
    assert.match(systems[0], /Student profile \(from the app\): target level 3급/);
    assert.match(systems[0], /-\(으\)니까/);
    assert.match(systems[0], /-아서\/어서/);
  });

  test("/api/writing: 원고지 va 53-topshiriq eslatmalari", async () => {
    mockGemini(() =>
      jsonOut({ recognized_text: "t", score: 10, max: 30, criteria: [], strengths: [], mistakes: [], model_answer: "m", summary: "s" })
    );
    const task = { n: 53, pts: 30, kind: "graph", instruction: "다음 그래프를 보고 쓰십시오.", suggestedMinutes: 15 };
    const res = await writingRoute.POST(post("/api/writing", { task, text: "조사 결과 증가하였다." }));
    assert.equal(res.status, 200);
    assert.match(systems[0], /원고지/);
    assert.match(systems[0], /53: grafik/);
    assert.doesNotMatch(systems[0], /54: fikr-mulohaza/);
  });
});
