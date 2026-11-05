// AI Ustoz chati: Gemini oqimi (SSE) "o'ylash" va xizmat hodisalari bilan boshlanganda ham javob to'xtab qolmasligi kerak.
// Oldin pull() matnsiz bo'lakda hech narsa qo'shmay qaytardi — oqim abadiy osilib, chatda cheksiz «yuklanmoqda» chiqardi.

import assert from "node:assert/strict";
import { afterEach, before, describe, test } from "node:test";

process.env.GEMINI_API_KEY = "test-key";
process.env.GOOGLE_CLIENT_ID = "";
process.env.GOOGLE_CLIENT_SECRET = "";

const { createMemoryStore, setStore } = await import("../src/lib/server/store");
const { streamText, sseText } = await import("../src/lib/gemini");
const tutorRoute = await import("../src/app/api/tutor/route");

const realFetch = globalThis.fetch;
type Sent = { thinking?: string };
let sent: Sent[] = [];

const ev = (o: unknown) => `data: ${JSON.stringify(o)}\n\n`;
const delta = (text: string) => ev({ event_type: "step.delta", delta: { type: "text", text } });

/** Bo'laklarni tarmoqdagidek alohida-alohida (kichik kechikish bilan) yuboradigan SSE javob */
function sse(chunks: string[]) {
  const enc = new TextEncoder();
  let i = 0;
  return new Response(
    new ReadableStream<Uint8Array>({
      async pull(c) {
        await new Promise((r) => setTimeout(r, 2));
        if (i >= chunks.length) return c.close();
        c.enqueue(enc.encode(chunks[i++]));
      },
    }),
    { headers: { "Content-Type": "text/event-stream" } }
  );
}

function mockGemini(replies: (() => Response)[]) {
  sent = [];
  globalThis.fetch = (async (_url: string | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as { generation_config?: { thinking_level?: string } };
    sent.push({ thinking: body.generation_config?.thinking_level });
    const next = replies.shift();
    return next ? next() : Response.json({ error: { message: "no mock" } }, { status: 500 });
  }) as typeof fetch;
}

/** Oqimni oxirigacha o'qiydi; 3 soniyada tugamasa — test yiqiladi (osilib qolish) */
async function readAll(stream: ReadableStream<Uint8Array>) {
  const text = new Response(stream).text();
  const hang = new Promise<never>((_, rej) => setTimeout(() => rej(new Error("oqim osilib qoldi")), 3000));
  return Promise.race([text, hang]);
}

let ip = 0;
const post = (body: unknown) =>
  new Request("https://hanustoz.tech/api/tutor", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": `10.9.0.${++ip}` },
    body: JSON.stringify(body),
  });

before(() => setStore(createMemoryStore()));
afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("Gemini oqimi (AI Ustoz)", () => {
  test("avval faqat o'ylash/xizmat hodisalari kelsa ham javob to'liq keladi", async () => {
    mockGemini([
      () =>
        sse([
          ev({ event_type: "interaction.start" }),
          ev({ event_type: "step.start", step: { type: "thought" } }),
          ev({ event_type: "step.delta", delta: { type: "thought", text: "o'ylayapman…" } }),
          // hodisa ikki bo'lakka bo'lingan
          delta("**어제 일").slice(0, 25),
          delta("**어제 일").slice(25) + delta("에서 피곤해서 왔어요.**"),
          ev({ event_type: "step.stop" }),
          ev({ event_type: "interaction.complete" }),
        ]),
    ]);
    const text = await readAll(await streamText({ system: "s", input: "i" }));
    assert.equal(text, "**어제 일에서 피곤해서 왔어요.**");
    assert.equal(sent[0].thinking, "minimal", "tezlik uchun eng kam o'ylash");
  });

  test("/api/tutor: tarjima so'rovi — javob osilmasdan keladi", async () => {
    mockGemini([() => sse([ev({ event_type: "interaction.start" }), ev({ event_type: "step.start" }), delta("**어제 퇴근하고 너무 피곤해서 바로 잤어요.**"), ev({ event_type: "interaction.complete" })])]);
    const res = await tutorRoute.POST(post({ messages: [{ role: "user", text: "Men kecha ishdan charchab uyga keldim, koreyscha qanday bo'ladi?" }] }));
    assert.equal(res.status, 200);
    assert.equal(await readAll(res.body!), "**어제 퇴근하고 너무 피곤해서 바로 잤어요.**");
  });

  test("oxirgi hodisadan keyin bo'sh qator bo'lmasa ham matn yo'qolmaydi", async () => {
    mockGemini([() => sse([delta("Salom").trimEnd()])]);
    assert.equal(await readAll(await streamText({ system: "s", input: "i" })), "Salom");
  });

  test("model 'minimal' ni qabul qilmasa — bir marta 'low' bilan qayta so'raladi", async () => {
    mockGemini([() => Response.json({ error: { message: "thinking_level minimal is not supported" } }, { status: 400 }), () => sse([delta("OK")])]);
    assert.equal(await readAll(await streamText({ system: "s", input: "i" })), "OK");
    assert.deepEqual(
      sent.map((s) => s.thinking),
      ["minimal", "low"]
    );
  });

  test("oqim o'rtasida xato hodisasi: kelgan qism saqlanadi, oqim yopiladi", async () => {
    mockGemini([() => sse([delta("Birinchi qism. "), ev({ event_type: "error", error: { message: "overloaded" } })])]);
    assert.equal(await readAll(await streamText({ system: "s", input: "i" })), "Birinchi qism. ");
  });

  test("hech qanday matn kelmasdan xato — iste'molchiga xato beriladi (osilmaydi)", async () => {
    mockGemini([() => sse([ev({ event_type: "step.start" }), ev({ event_type: "error", error: { message: "overloaded" } })])]);
    await assert.rejects(readAll(await streamText({ system: "s", input: "i" })), (e: Error) => e.message !== "oqim osilib qoldi");
  });

  test("sseText: faqat javob matni olinadi", () => {
    const events = [ev({ event_type: "step.delta", delta: { type: "thought", text: "x" } }), delta("A"), "data: [DONE]", "event: ping", delta("B")];
    assert.deepEqual(sseText(events.map((e) => e.trim())), { text: "AB" });
  });
});
