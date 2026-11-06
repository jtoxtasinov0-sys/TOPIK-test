// Ovozli ustoz testi: /api/voice (bitta Gemini so'rovi: audio → "heard" + ikki tilli javob) va /api/tts tutor rejimi.
// Gemini Interactions API soxta fetch bilan almashtiriladi; login o'chiq ("ochiq" rejim).

import assert from "node:assert/strict";
import { afterEach, before, describe, test } from "node:test";

process.env.GEMINI_API_KEY = "test-key";
process.env.GOOGLE_CLIENT_ID = "";
process.env.GOOGLE_CLIENT_SECRET = "";

const { createMemoryStore, setStore } = await import("../src/lib/server/store");
const voiceRoute = await import("../src/app/api/voice/route");
const ttsRoute = await import("../src/app/api/tts/route");
const { splitForSpeech, tutorChunks, wavEnvelope } = await import("../src/lib/audio");

type Call = { model: string; body: Record<string, unknown> };
type Reply = unknown | { status: number; body: unknown };
const realFetch = globalThis.fetch;
let calls: Call[] = [];

/** Har bir so'rovga navbatdagi soxta javobni qaytaradi va so'rovlarni yozib boradi */
function mockGemini(replies: Reply[]) {
  calls = [];
  globalThis.fetch = (async (_url: string | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    calls.push({ model: String(body.model), body });
    const r = replies.shift() as { status?: number; body?: unknown } | undefined;
    if (r && typeof r.status === "number") return Response.json(r.body, { status: r.status });
    return Response.json(r ?? {});
  }) as typeof fetch;
}
const textOut = (text: string) => ({ steps: [{ type: "model_output", content: [{ type: "text", text }] }] });
const voiceOut = (o: unknown) => textOut(JSON.stringify(o));
const thinkingOf = (c: Call) => (c.body.generation_config as { thinking_level?: string } | undefined)?.thinking_level;

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
  test("matnli savol: bitta so'rov, javob bo'laklari tozalanadi", async () => {
    mockGemini([
      voiceOut({
        heard: "boshqa narsa",
        segments: [
          { lang: "uz", text: "Rahmat koreyschada" },
          { lang: "ko", text: "감사합니다" },
          { lang: "xx", text: "deyiladi." },
          { lang: "uz", text: "   " },
        ],
        practice: { ko: "", rom: "", uz: "" },
      }),
    ]);
    const res = await voiceRoute.POST(post("/api/voice", { text: "Rahmat koreyschada qanday?", level: "beginner", history: [] }));
    assert.equal(res.status, 200);
    const j = await res.json();
    assert.equal(j.transcript, "Rahmat koreyschada qanday?", "yozilgan matn o'zgarmaydi");
    assert.deepEqual(j.segments, [
      { lang: "uz", text: "Rahmat koreyschada" },
      { lang: "ko", text: "감사합니다" },
      { lang: "uz", text: "deyiladi." },
    ]);
    assert.equal(j.practice, undefined);
    assert.equal(calls.length, 1);
    assert.match(String(calls[0].body.system_instruction), /BY VOICE/);
    assert.equal(thinkingOf(calls[0]), "minimal", "tezlik uchun eng kam o'ylash");
  });

  test("ovozli xabar: transkripsiyasiz bitta so'rov, audio modelga beriladi, heard → transcript", async () => {
    mockGemini([voiceOut({ heard: "감사합니다", segments: [{ lang: "uz", text: "Juda yaxshi!" }], practice: { ko: "감사합니다", rom: "gamsahamnida", uz: "Rahmat" } })]);
    const res = await voiceRoute.POST(
      post("/api/voice", { audio: { data: Buffer.from("fake-audio").toString("base64"), mime: "audio/webm;codecs=opus" }, history: [{ role: "ai", text: "Takrorlang: 감사합니다" }] })
    );
    const j = await res.json();
    assert.equal(j.transcript, "감사합니다");
    assert.deepEqual(j.practice, { ko: "감사합니다", rom: "gamsahamnida", uz: "Rahmat" });
    assert.equal(calls.length, 1, "alohida transkripsiya so'rovi yo'q");
    const input = calls[0].body.input as { type: string; mime_type?: string; text?: string }[];
    assert.ok(input.some((p) => p.type === "audio" && p.mime_type === "audio/webm"));
    assert.match(String(input[0].text), /Takrorlang: 감사합니다/, "suhbat tarixi beriladi");
  });

  test("nutq eshitilmasa → empty", async () => {
    mockGemini([voiceOut({ heard: "  ", segments: [] })]);
    const empty = await voiceRoute.POST(post("/api/voice", { audio: { data: "YWJj", mime: "audio/webm" } }));
    assert.deepEqual(await empty.json(), { transcript: "", empty: true });
    const none = await voiceRoute.POST(post("/api/voice", {}));
    assert.deepEqual(await none.json(), { transcript: "", empty: true });
  });

  test("model 'minimal' darajani qo'llamasa — 'low' bilan qayta uriniladi va eslab qolinadi", async () => {
    mockGemini([{ status: 400, body: { error: { message: "Unsupported thinking level" } } }, voiceOut({ heard: "salom", segments: [{ lang: "ko", text: "안녕하세요" }] })]);
    const res = await voiceRoute.POST(post("/api/voice", { text: "salom" }));
    assert.equal(res.status, 200);
    assert.deepEqual(calls.map(thinkingOf), ["minimal", "low"]);

    mockGemini([voiceOut({ heard: "salom", segments: [{ lang: "ko", text: "안녕하세요" }] })]);
    await voiceRoute.POST(post("/api/voice", { text: "salom" }));
    assert.deepEqual(calls.map(thinkingOf), ["low"], "keyingi so'rov darhol 'low' bilan");
  });
});

describe("/api/voice oqimi (stream: true)", () => {
  const WAV = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(40)]).toString("base64");
  const enc = new TextEncoder();
  const delta = (text: string) => `data: ${JSON.stringify({ event_type: "step.delta", delta: { type: "text", text } })}\n\n`;
  let tts: Record<string, unknown>[] = [];

  /** Matn — SSE bo'laklari bilan; ovoz (TTS) — WAV */
  function mockStream(chunks: string[]) {
    calls = [];
    tts = [];
    globalThis.fetch = (async (_url: string | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      if (String(body.model).includes("tts")) {
        tts.push(body);
        return Response.json({ steps: [{ type: "model_output", content: [{ type: "audio", data: WAV }] }] });
      }
      calls.push({ model: String(body.model), body });
      let i = 0;
      return new Response(
        new ReadableStream<Uint8Array>({
          async pull(c) {
            await new Promise((r) => setTimeout(r, 1));
            if (i >= chunks.length) return c.close();
            c.enqueue(enc.encode(chunks[i++]));
          },
        }),
        { headers: { "Content-Type": "text/event-stream" } }
      );
    }) as typeof fetch;
  }
  const readAll = async (res: Response) =>
    (await res.text())
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l) as Record<string, unknown>);

  test("ovozli savol: heard → reply (+ server tayyorlagan ovoz) → done (practice)", async () => {
    const segments = [
      { lang: "uz", text: "Ajoyib savol! «Rahmat» koreyschada" },
      { lang: "ko", text: "감사합니다" },
      { lang: "uz", text: "bo‘ladi. Qani, qaytaring!" },
    ];
    const json = JSON.stringify({ heard: "rahmat koreyschada qanday", segments, practice: { ko: "감사합니다", rom: "gamsahamnida", uz: "Rahmat" } });
    const cut = json.indexOf('"practice"');
    mockStream([delta(json.slice(0, 40)), delta(json.slice(40, cut)), delta(json.slice(cut))]);
    const res = await voiceRoute.POST(post("/api/voice", { stream: true, audio: { data: "YWJj", mime: "audio/webm" } }));
    assert.match(res.headers.get("content-type") ?? "", /ndjson/);
    const evs = await readAll(res);
    const kinds = evs.map((e) => e.t);
    assert.deepEqual(kinds.filter((k) => k !== "audio"), ["heard", "reply", "done"]);
    assert.ok(kinds.indexOf("reply") < kinds.lastIndexOf("audio"), "ovoz javobdan keyin, shu oqimda");
    const reply = evs.find((e) => e.t === "reply")!;
    assert.equal(reply.transcript, "rahmat koreyschada qanday");
    assert.deepEqual(reply.tts, tutorChunks(segments as { lang: "uz" | "ko"; text: string }[]), "bo'laklar brauzerdagi bilan aynan bir xil");
    const audio = evs.filter((e) => e.t === "audio");
    assert.equal(audio.length, (reply.tts as unknown[]).length);
    assert.ok(audio.every((a) => a.data === WAV));
    assert.deepEqual(evs.find((e) => e.t === "done")!.practice, { ko: "감사합니다", rom: "gamsahamnida", uz: "Rahmat" });
    assert.equal(tts.length, audio.length);
    assert.deepEqual((tts[0].generation_config as { speech_config: unknown }).speech_config, [{ voice: "Puck" }], "ustoz — yigit ovozi");
  });

  test("nutq eshitilmasa — darhol {empty}, ovoz tayyorlanmaydi", async () => {
    mockStream([delta('{"heard":"","segments":[]}')]);
    const evs = await readAll(await voiceRoute.POST(post("/api/voice", { stream: true, audio: { data: "YWJj", mime: "audio/webm" } })));
    assert.deepEqual(evs, [{ t: "done", transcript: "", empty: true }]);
    assert.equal(tts.length, 0);
  });
});

describe("/api/tts tutor rejimi", () => {
  test("aralash matn bitta yigit ovozi (Puck) bilan, o'zbek-koreys uslubida o'qiladi", async () => {
    const wav = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(40)]).toString("base64");
    mockGemini([{ steps: [{ type: "model_output", content: [{ type: "audio", data: wav }] }] }]);
    const text = "남자: so'zi erkak degani. 남자 deb ayting.";
    const res = await ttsRoute.POST(post("/api/tts", { text, tutor: true, voice: "m" }));
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("Content-Type"), "audio/wav");
    const content = (calls[0].body.input as { content: { text: string; annotations: { style: string }[] }[] }[])[0].content;
    assert.equal(content.length, 1);
    assert.equal(content[0].text, text, "dialog sifatida bo'linmaydi");
    assert.match(content[0].annotations[0].style, /Uzbek/);
    assert.deepEqual((calls[0].body.generation_config as { speech_config: unknown }).speech_config, [{ voice: "Puck" }]);
  });
});

describe("ovoz yordamchilari", () => {
  test("splitForSpeech: qisqa matn bo'linmaydi, uzunida birinchi gap alohida", () => {
    assert.deepEqual(splitForSpeech("Rahmat koreyschada 감사합니다 deyiladi."), ["Rahmat koreyschada 감사합니다 deyiladi."]);
    const long = "Rahmat koreyschada 감사합니다 deyiladi. Bu hurmatli shakl, kattalarga shunday aytiladi. Endi menga qaytarib ayting!";
    const parts = splitForSpeech(long);
    assert.equal(parts.length, 2);
    assert.equal(parts[0], "Rahmat koreyschada 감사합니다 deyiladi.");
    assert.equal(parts.join(" "), long);
  });

  test("wavEnvelope: jim joy past, ovozli joy baland", () => {
    const rate = 6000;
    const n = rate; // 1 soniya: birinchi yarmi jim, ikkinchisi baland
    const buf = Buffer.alloc(44 + n * 2);
    buf.write("RIFF", 0);
    buf.writeUInt32LE(36 + n * 2, 4);
    buf.write("WAVEfmt ", 8);
    buf.writeUInt32LE(16, 16);
    buf.writeUInt16LE(1, 20);
    buf.writeUInt16LE(1, 22);
    buf.writeUInt32LE(rate, 24);
    buf.writeUInt32LE(rate * 2, 28);
    buf.writeUInt16LE(2, 32);
    buf.writeUInt16LE(16, 34);
    buf.write("data", 36);
    buf.writeUInt32LE(n * 2, 40);
    for (let i = n / 2; i < n; i++) buf.writeInt16LE(i % 2 ? 8000 : -8000, 44 + i * 2);
    const env = wavEnvelope(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length), 60)!;
    assert.equal(env.length, 60);
    assert.ok(env[5] < 0.01);
    assert.ok(env[50] > 0.5);
    assert.equal(wavEnvelope(new ArrayBuffer(10)), null);
  });
});
