// Ovozli ustoz testi: /api/voice (nutq → matn → ikki tilli javob) va /api/tts tutor rejimi.
// Gemini Interactions API soxta fetch bilan almashtiriladi; login o'chiq ("ochiq" rejim).

import assert from "node:assert/strict";
import { afterEach, before, describe, test } from "node:test";

process.env.GEMINI_API_KEY = "test-key";
process.env.GOOGLE_CLIENT_ID = "";
process.env.GOOGLE_CLIENT_SECRET = "";

const { createMemoryStore, setStore } = await import("../src/lib/server/store");
const voiceRoute = await import("../src/app/api/voice/route");
const ttsRoute = await import("../src/app/api/tts/route");

type Call = { model: string; body: Record<string, unknown> };
const realFetch = globalThis.fetch;
let calls: Call[] = [];

/** Har bir so'rovga navbatdagi soxta javobni qaytaradi va so'rovlarni yozib boradi */
function mockGemini(replies: unknown[]) {
  calls = [];
  globalThis.fetch = (async (_url: string | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    calls.push({ model: String(body.model), body });
    const r = replies.shift();
    return Response.json(r ?? {});
  }) as typeof fetch;
}
const textOut = (text: string) => ({ steps: [{ type: "model_output", content: [{ type: "text", text }] }] });

let ip = 0;
const post = (path: string, body: unknown) =>
  new Request(`https://hanustoz.tech${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": `10.0.0.${++ip}` },
    body: JSON.stringify(body),
  });

before(() => setStore(createMemoryStore()));
afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("/api/voice", () => {
  test("matnli savol: transkripsiyasiz, javob bo'laklari tozalanadi", async () => {
    mockGemini([
      textOut(
        JSON.stringify({
          segments: [
            { lang: "uz", text: "Rahmat koreyschada" },
            { lang: "ko", text: "감사합니다" },
            { lang: "xx", text: "deyiladi." },
            { lang: "uz", text: "   " },
          ],
          practice: { ko: "", rom: "", uz: "" },
        })
      ),
    ]);
    const res = await voiceRoute.POST(post("/api/voice", { text: "Rahmat koreyschada qanday?", level: "beginner", history: [] }));
    assert.equal(res.status, 200);
    const j = await res.json();
    assert.equal(j.transcript, "Rahmat koreyschada qanday?");
    assert.deepEqual(j.segments, [
      { lang: "uz", text: "Rahmat koreyschada" },
      { lang: "ko", text: "감사합니다" },
      { lang: "uz", text: "deyiladi." },
    ]);
    assert.equal(j.practice, undefined);
    assert.equal(calls.length, 1, "matn uchun faqat bitta (javob) so'rovi");
    assert.match(String(calls[0].body.system_instruction), /BY VOICE/);
  });

  test("koreyscha gapirilsa: transkripsiya o'zbekcha birinchi, talaffuz uchun audio biriktiriladi", async () => {
    mockGemini([
      textOut("감사합니다"),
      textOut(JSON.stringify({ segments: [{ lang: "uz", text: "Juda yaxshi!" }], practice: { ko: "감사합니다", rom: "gamsahamnida", uz: "Rahmat" } })),
    ]);
    const res = await voiceRoute.POST(
      post("/api/voice", { audio: { data: Buffer.from("fake-audio").toString("base64"), mime: "audio/webm;codecs=opus" }, history: [{ role: "ai", text: "Takrorlang: 감사합니다" }] })
    );
    const j = await res.json();
    assert.equal(j.transcript, "감사합니다");
    assert.deepEqual(j.practice, { ko: "감사합니다", rom: "gamsahamnida", uz: "Rahmat" });
    assert.equal(calls.length, 2);
    const cfg = calls[0].body.generation_config as { transcription_config: { language_codes: string[] } };
    assert.equal(cfg.transcription_config.language_codes[0], "uz-UZ");
    const input = calls[1].body.input as { type: string; mime_type?: string }[];
    assert.ok(input.some((p) => p.type === "audio" && p.mime_type === "audio/webm"), "audio talaffuz uchun biriktirilgan");
  });

  test("o'zbekcha gapirilsa audio qayta yuborilmaydi; bo'sh nutq → empty", async () => {
    mockGemini([textOut("Salom, dars o'tib ber"), textOut(JSON.stringify({ segments: [{ lang: "ko", text: "안녕하세요" }] }))]);
    await voiceRoute.POST(post("/api/voice", { audio: { data: "YWJj", mime: "audio/webm" } }));
    const input = calls[1].body.input as { type: string }[];
    assert.ok(!input.some((p) => p.type === "audio"));

    mockGemini([textOut("   ")]);
    const empty = await voiceRoute.POST(post("/api/voice", { audio: { data: "YWJj", mime: "audio/webm" } }));
    assert.deepEqual(await empty.json(), { transcript: "", empty: true });
  });
});

describe("/api/tts tutor rejimi", () => {
  test("aralash matn bitta ovoz bilan, o'zbek-koreys uslubida o'qiladi", async () => {
    const wav = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(40)]).toString("base64");
    mockGemini([{ steps: [{ type: "model_output", content: [{ type: "audio", data: wav }] }] }]);
    const text = "남자: so'zi erkak degani. 남자 deb ayting.";
    const res = await ttsRoute.POST(post("/api/tts", { text, tutor: true }));
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("Content-Type"), "audio/wav");
    const content = (calls[0].body.input as { content: { text: string; annotations: { style: string }[] }[] }[])[0].content;
    assert.equal(content.length, 1);
    assert.equal(content[0].text, text, "dialog sifatida bo'linmaydi");
    assert.match(content[0].annotations[0].style, /Uzbek/);
  });
});
