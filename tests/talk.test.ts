// Erkin suhbat testi: /api/talk (bitta Gemini so'rovi: audio → "heard" + koreyscha javob, kerak bo'lsa o'zbekcha yordam),
// /api/tts suhbat uslubi va o'qiladigan bo'laklar. Gemini soxta fetch bilan almashtiriladi; login o'chiq ("ochiq" rejim).

import assert from "node:assert/strict";
import { afterEach, before, describe, test } from "node:test";

process.env.GEMINI_API_KEY = "test-key";
process.env.GOOGLE_CLIENT_ID = "";
process.env.GOOGLE_CLIENT_SECRET = "";

const { createMemoryStore, setStore } = await import("../src/lib/server/store");
const talkRoute = await import("../src/app/api/talk/route");
const ttsRoute = await import("../src/app/api/tts/route");
const { talkChunks } = await import("../src/lib/audio");

type Call = { body: Record<string, unknown> };
const realFetch = globalThis.fetch;
let calls: Call[] = [];

function mockGemini(replies: unknown[]) {
  calls = [];
  globalThis.fetch = (async (_url: string | URL, init?: RequestInit) => {
    calls.push({ body: JSON.parse(String(init?.body)) as Record<string, unknown> });
    return Response.json(replies.shift() ?? {});
  }) as typeof fetch;
}
const out = (o: unknown) => ({ steps: [{ type: "model_output", content: [{ type: "text", text: JSON.stringify(o) }] }] });
const systemOf = (c: Call) => String(c.body.system_instruction);
const inputText = (c: Call) => String((c.body.input as { text?: string }[])[0].text);

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

describe("/api/talk", () => {
  test("o'zbekcha so'z: yordam bo'laklari, o'rgatiladigan gap va koreyscha davomi; o'zbekcha gapga tuzatish yo'q", async () => {
    mockGemini([
      out({
        heard: "boshqa",
        help: [
          { lang: "uz", text: "«Bozor» koreyschada" },
          { lang: "ko", text: "시장" },
          { lang: "xx", text: "bo‘ladi." },
          { lang: "uz", text: "  " },
        ],
        teach: { ko: "어제 시장에 갔어요.", rom: "eoje sijang-e gasseoyo.", uz: "Kecha bozorga bordim." },
        reply: "**시장에서** 뭐 샀어요?",
        reply_rom: "sijang-eseo mwo sasseoyo?",
        reply_uz: "Bozordan nima oldingiz?",
        fix: { ko: "어제 시장에 갔어요.", uz: "…" },
        hints: [
          { ko: "과일을 샀어요.", uz: "Meva oldim." },
          { ko: "", uz: "bo‘sh" },
          { ko: "고기를 샀어요.", uz: "Go‘sht oldim." },
          { ko: "아무것도 안 샀어요.", uz: "Hech narsa olmadim." },
          { ko: "옷을 샀어요.", uz: "Kiyim oldim." },
        ],
      }),
    ]);
    const res = await talkRoute.POST(post("/api/talk", { text: "Men kecha bozorga bordim", partner: "jisu", topic: "day", level: "beginner", style: "polite", history: [] }));
    assert.equal(res.status, 200);
    const j = await res.json();
    assert.equal(j.transcript, "Men kecha bozorga bordim", "yozilgan matn o'zgarmaydi");
    assert.deepEqual(j.help, [
      { lang: "uz", text: "«Bozor» koreyschada" },
      { lang: "ko", text: "시장" },
      { lang: "uz", text: "bo‘ladi." },
    ]);
    assert.deepEqual(j.teach, { ko: "어제 시장에 갔어요.", rom: "eoje sijang-e gasseoyo.", uz: "Kecha bozorga bordim." });
    assert.equal(j.reply, "시장에서 뭐 샀어요?", "markdown belgilari olib tashlanadi");
    assert.equal(j.uz, "Bozordan nima oldingiz?");
    assert.equal(j.fix, undefined, "koreyscha bo'lmagan gap tuzatilmaydi");
    assert.equal(j.hints.length, 3);
    assert.ok(j.hints.every((h: { ko: string }) => h.ko));

    assert.equal(calls.length, 1, "bitta so'rov");
    assert.equal((calls[0].body.generation_config as { thinking_level?: string }).thinking_level, "minimal", "tezlik uchun eng kam o'ylash");
    const sys = systemOf(calls[0]);
    assert.match(sys, /지수/);
    assert.match(sys, /해요체/);
    assert.match(sys, /BY VOICE/);
    assert.match(inputText(calls[0]), /Student typed: "Men kecha bozorga bordim"/);
  });

  test("ovozli koreyscha xabar: heard → transcript, xato bo'lsa tuzatish; 반말 uslubi va tarix beriladi", async () => {
    mockGemini([
      out({
        heard: "나는 학교에서 가요",
        help: [],
        teach: { ko: "", rom: "", uz: "" },
        reply: "아, 학교에 가? 무슨 공부해?",
        reply_rom: "a, hakgyo-e ga? museun gongbuhae?",
        reply_uz: "A, maktabga ketyapsanmi? Nima o‘qiysan?",
        fix: { ko: "나는 학교에 가.", uz: "Borish joyi — 에, 에서 emas." },
        hints: [{ ko: "한국어 공부해.", uz: "Koreys tili o‘qiyman." }],
      }),
    ]);
    const res = await talkRoute.POST(
      post("/api/talk", {
        audio: { data: Buffer.from("fake-audio").toString("base64"), mime: "audio/webm;codecs=opus" },
        partner: "minjun",
        style: "casual",
        level: "intermediate",
        history: [{ role: "ai", text: "오늘 어디 가?" }],
      })
    );
    const j = await res.json();
    assert.equal(j.transcript, "나는 학교에서 가요");
    assert.deepEqual(j.fix, { ko: "나는 학교에 가.", uz: "Borish joyi — 에, 에서 emas." });
    assert.deepEqual(j.help, []);
    assert.equal(j.teach, undefined);
    const input = calls[0].body.input as { type: string; mime_type?: string }[];
    assert.ok(input.some((p) => p.type === "audio" && p.mime_type === "audio/webm"), "audio modelga beriladi");
    assert.match(inputText(calls[0]), /민준: 오늘 어디 가\?/, "suhbat tarixi do'st ismi bilan");
    assert.match(systemOf(calls[0]), /반말/);
  });

  test("tuzatish o'quvchi gapi bilan bir xil bo'lsa — ko'rsatilmaydi", async () => {
    mockGemini([out({ heard: "감사합니다", help: [], reply: "천만에요!", reply_rom: "cheonmaneyo!", reply_uz: "Arzimaydi!", fix: { ko: "감사합니다.", uz: "" }, hints: [] })]);
    const j = await (await talkRoute.POST(post("/api/talk", { text: "감사합니다" }))).json();
    assert.equal(j.fix, undefined);
  });

  test("boshlash: o'quvchi gapisiz, do'st o'zi salomlashadi", async () => {
    mockGemini([out({ heard: "", help: [], reply: "안녕하세요! 저는 민준이에요. 오늘 하루 어땠어요?", reply_rom: "", reply_uz: "", hints: [] })]);
    const res = await talkRoute.POST(post("/api/talk", { start: true, topic: "food" }));
    const j = await res.json();
    assert.equal(j.transcript, "");
    assert.match(j.reply, /민준/);
    assert.match(inputText(calls[0]), /Start the conversation/);
    assert.match(systemOf(calls[0]), /osh, somsa/, "mavzu promptga qo'shiladi");
  });

  test("bo'sh so'rov va eshitilmagan nutq → empty", async () => {
    mockGemini([]);
    assert.deepEqual(await (await talkRoute.POST(post("/api/talk", {}))).json(), { transcript: "", empty: true });
    assert.equal(calls.length, 0, "bo'sh so'rovga Gemini chaqirilmaydi");

    mockGemini([out({ heard: " ", help: [], reply: "", reply_rom: "", reply_uz: "", hints: [] })]);
    const j = await (await talkRoute.POST(post("/api/talk", { audio: { data: "YWJj", mime: "audio/webm" } }))).json();
    assert.deepEqual(j, { transcript: "", empty: true });
  });
});

describe("erkin suhbat ovozi", () => {
  test("/api/tts talk: bitta ovoz, do'stona suhbat uslubi (qiz — Aoede)", async () => {
    const wav = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(40)]).toString("base64");
    mockGemini([{ steps: [{ type: "model_output", content: [{ type: "audio", data: wav }] }] }]);
    const text = "남자: 아니에요, 저는 학생이에요.";
    const res = await ttsRoute.POST(post("/api/tts", { text, talk: true, voice: "f" }));
    assert.equal(res.status, 200);
    const content = (calls[0].body.input as { content: { text: string; annotations: { style: string }[] }[] }[])[0].content;
    assert.equal(content.length, 1);
    assert.equal(content[0].text, text, "dialog sifatida bo'linmaydi");
    assert.match(content[0].annotations[0].style, /chatting/);
    assert.deepEqual((calls[0].body.generation_config as { speech_config: unknown }).speech_config, [{ voice: "Aoede" }]);
  });

  test("talkChunks: avval o'zbekcha yordam (ustoz uslubi), keyin koreyscha javob (suhbat uslubi)", () => {
    const chunks = talkChunks({
      help: [
        { lang: "uz", text: "«Bozor» koreyschada" },
        { lang: "ko", text: "시장" },
      ],
      reply: "시장에서 뭐 샀어요?",
      voice: "m",
      slow: true,
    });
    assert.deepEqual(chunks, [
      { text: "«Bozor» koreyschada 시장", opts: { tutor: true, voice: "m" } },
      { text: "시장에서 뭐 샀어요?", opts: { talk: true, voice: "m", slow: true } },
    ]);
    assert.deepEqual(talkChunks({ reply: "  ", voice: "f" }), []);
  });
});
