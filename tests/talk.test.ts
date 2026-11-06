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
const { talkChunks, splitTalk } = await import("../src/lib/audio");
const { partialJson } = await import("../src/lib/gemini");
const { greeting, TOPICS } = await import("../src/data/talk");

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

// ---------- Oqim (stream: true): javob tarjima va maslahatlardan oldin keladi ----------
const enc = new TextEncoder();
const ev = (o: unknown) => `data: ${JSON.stringify(o)}\n\n`;
const delta = (text: string) => ev({ event_type: "step.delta", delta: { type: "text", text } });

/** SSE javob: bo'laklar ketma-ket; gate berilsa — shu indeksdagi bo'lakdan oldin gate ochilishini kutadi */
function sse(chunks: string[], gate?: { at: number; open: Promise<void> }) {
  let i = 0;
  return new Response(
    new ReadableStream<Uint8Array>({
      async pull(c) {
        if (gate && i === gate.at) await gate.open;
        await new Promise((r) => setTimeout(r, 1));
        if (i >= chunks.length) return c.close();
        c.enqueue(enc.encode(chunks[i++]));
      },
    }),
    { headers: { "Content-Type": "text/event-stream" } }
  );
}

function mockStream(make: (body: Record<string, unknown>) => Response) {
  calls = [];
  globalThis.fetch = (async (_url: string | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    calls.push({ body });
    return make(body);
  }) as typeof fetch;
}

/** NDJSON hodisalarini birma-bir o'qiydi */
function events(res: Response) {
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";
  const queue: Record<string, unknown>[] = [];
  return async function next(): Promise<Record<string, unknown> | null> {
    for (;;) {
      if (queue.length) return queue.shift()!;
      const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error("hodisa kelmadi")), 2000));
      const { done, value } = await Promise.race([reader.read(), timeout]);
      if (done) return null;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const l of lines) if (l.trim()) queue.push(JSON.parse(l));
    }
  };
}

describe("/api/talk oqimi", () => {
  const full = {
    heard: "오늘 8시니까 출근하고요",
    help: [],
    teach: { ko: "", rom: "", uz: "" },
    reply: "아, 8시에 출근했군요! 보통 몇 시에 퇴근해요?",
    reply_rom: "a, yeodeolsie chulgeunhaetgunyo! botong myeot sie toegeunhaeyo?",
    reply_uz: "Soat 8 da ishga borgan ekansiz! Odatda soat nechada chiqasiz?",
    fix: { ko: "오늘 8시에 출근했어요.", uz: "" },
    hints: [{ ko: "6시에 퇴근해요.", uz: "6 da chiqaman." }],
  };

  test("heard va reply darhol (qolgan maydonlarni kutmasdan), keyin done — to'liq natija", async () => {
    const json = JSON.stringify(full);
    const cut = json.indexOf('"reply_rom"');
    let release!: () => void;
    const open = new Promise<void>((r) => (release = r));
    mockStream(() =>
      sse(
        [
          ev({ event_type: "interaction.start" }),
          delta(json.slice(0, 20)),
          delta(json.slice(20, cut)),
          // shu yerda Gemini hali tarjima va maslahatlarni yozyapti
          delta(json.slice(cut, cut + 30)),
          delta(json.slice(cut + 30)),
          ev({ event_type: "interaction.complete" }),
        ],
        { at: 3, open }
      )
    );
    const res = await talkRoute.POST(
      post("/api/talk", { stream: true, audio: { data: "YWJj", mime: "audio/webm" }, partner: "minjun", level: "intermediate", history: [] })
    );
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") ?? "", /ndjson/);
    const next = events(res);

    assert.deepEqual(await next(), { t: "heard", transcript: "오늘 8시니까 출근하고요" });
    const reply = await next();
    assert.equal(reply?.t, "reply");
    assert.equal(reply?.reply, full.reply, "javob tarjima kelmasdan oldin yuboriladi");
    assert.deepEqual(reply?.help, []);
    assert.equal(reply?.uz, undefined);

    release();
    const done = await next();
    assert.equal(done?.t, "done");
    assert.equal(done?.uz, full.reply_uz);
    assert.equal(done?.rom, full.reply_rom);
    assert.deepEqual(done?.fix, { ko: "오늘 8시에 출근했어요.", uz: "" });
    assert.equal((done?.hints as unknown[]).length, 1);
    assert.equal(await next(), null, "oqim yopiladi");

    const body = calls[0].body;
    assert.equal(body.stream, true);
    assert.equal((body.response_format as { mime_type?: string }).mime_type, "application/json", "JSON sxemasi bilan oqim");
    assert.equal((body.generation_config as { thinking_level?: string }).thinking_level, "minimal");
    assert.ok((body.input as { type: string }[]).some((p) => p.type === "audio"));
  });

  test("o'zbekcha yordam bo'lsa — reply hodisasida help ham bor (ovoz yordamdan boshlanadi)", async () => {
    const r = {
      heard: "bozor koreyschada nima",
      help: [
        { lang: "uz", text: "Bozor —" },
        { lang: "ko", text: "시장" },
      ],
      teach: { ko: "시장에 가요.", rom: "sijang-e gayo.", uz: "Bozorga boraman." },
      reply: "시장에 자주 가요?",
      reply_rom: "",
      reply_uz: "Bozorga tez-tez borasizmi?",
      hints: [],
    };
    mockStream(() => sse([delta(JSON.stringify(r))]));
    const next = events(await talkRoute.POST(post("/api/talk", { stream: true, audio: { data: "YWJj", mime: "audio/webm" } })));
    assert.equal((await next())?.t, "heard");
    const reply = await next();
    assert.deepEqual(reply?.help, [
      { lang: "uz", text: "Bozor —" },
      { lang: "ko", text: "시장" },
    ]);
    assert.deepEqual(reply?.teach, { ko: "시장에 가요.", rom: "sijang-e gayo.", uz: "Bozorga boraman." });
    assert.equal((await next())?.t, "done");
  });

  test("yozilgan matn va boshlash: heard hodisasi yo'q, transcript reply'da", async () => {
    mockStream(() => sse([delta(JSON.stringify({ ...full, heard: "감사합니다" }))]));
    let next = events(await talkRoute.POST(post("/api/talk", { stream: true, text: "감사합니다" })));
    const reply = await next();
    assert.equal(reply?.t, "reply");
    assert.equal(reply?.transcript, "감사합니다");
    assert.equal((await next())?.t, "done");

    mockStream(() => sse([delta(JSON.stringify({ ...full, heard: "" }))]));
    next = events(await talkRoute.POST(post("/api/talk", { stream: true, start: true })));
    assert.equal((await next())?.t, "reply");
    assert.equal((await next())?.transcript, "");
  });

  test("nutq eshitilmasa — darhol done {empty}", async () => {
    mockStream(() => sse([delta('{"heard":"","help":[],"reply":""'), delta(',"reply_rom":"","reply_uz":"","hints":[]}')]));
    const next = events(await talkRoute.POST(post("/api/talk", { stream: true, audio: { data: "YWJj", mime: "audio/webm" } })));
    assert.deepEqual(await next(), { t: "done", transcript: "", empty: true });
    assert.equal(await next(), null);
  });

  test("oqim yarmida uzilsa — kelgan javob bilan yakunlanadi", async () => {
    const json = JSON.stringify(full);
    mockStream(() => sse([delta(json.slice(0, json.indexOf('"reply_uz"')))]));
    const next = events(await talkRoute.POST(post("/api/talk", { stream: true, text: "오늘 8시에 출근했어요" })));
    assert.equal((await next())?.reply, full.reply);
    const done = await next();
    assert.equal(done?.t, "done");
    assert.equal(done?.reply, full.reply);
    assert.equal(done?.rom, full.reply_rom);
    assert.equal(done?.uz, "");
  });

  test("Gemini oqimni JSON sxemasi bilan qabul qilmasa — oddiy so'rovga o'tadi", async () => {
    mockStream((body) => (body.stream ? Response.json({ error: { message: "stream not supported" } }, { status: 500 }) : Response.json(out(full))));
    const res = await talkRoute.POST(post("/api/talk", { stream: true, text: "오늘 8시에 출근했어요" }));
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") ?? "", /json/);
    const j = await res.json();
    assert.equal(j.reply, full.reply);
    assert.equal(j.uz, full.reply_uz);
    assert.equal(calls.length, 2);
    assert.equal(calls[1].body.stream, undefined);

    // Keyingi so'rovlar bir muddat to'g'ridan-to'g'ri oddiy rejimda
    mockStream(() => Response.json(out(full)));
    await (await talkRoute.POST(post("/api/talk", { stream: true, text: "네" }))).json();
    assert.equal(calls.length, 1);
    assert.equal(calls[0].body.stream, undefined);
  });
});

describe("birinchi salom (AI'siz, darhol)", () => {
  test("ism qo'shimchasi va uslub: 민준이에요 / 지수예요, 반말 — 민준이야 / 지수야", () => {
    assert.match(greeting("minjun", "food", "polite").ko, /^안녕하세요! 저는 민준이에요\. 무슨 음식을 제일 좋아해요\?$/);
    assert.match(greeting("jisu", "food", "polite").ko, /저는 지수예요\./);
    assert.match(greeting("minjun", "day", "casual").ko, /^안녕! 나는 민준이야\. 오늘 뭐 했어\?$/);
    assert.match(greeting("jisu", "day", "casual").ko, /나는 지수야\./);
    assert.match(greeting("jisu", "day", "casual").uz, /^Salom! Men Jisuman\./);
  });

  test("har bir mavzu va uslub uchun salom, tarjima va 2 ta javob g'oyasi bor; noma'lum mavzu — erkin", () => {
    for (const t of TOPICS)
      for (const style of ["polite", "casual"] as const) {
        const g = greeting("minjun", t.id, style);
        assert.ok(g.ko.endsWith("?"), `${t.id}/${style}: savol bilan tugaydi`);
        assert.ok(g.uz.length > 10);
        assert.equal(g.hints.length, 2);
        assert.ok(g.hints.every((h) => /[가-힣]/.test(h.ko) && h.uz));
      }
    assert.deepEqual(greeting("minjun", "yo'q", "polite"), greeting("minjun", "free", "polite"));
  });

  test("uyg'otish so'rovi (GET) — AI chaqirilmaydi", async () => {
    mockGemini([]);
    const res = talkRoute.GET();
    assert.equal(res.status, 204);
    assert.equal(calls.length, 0);
  });
});

describe("partialJson", () => {
  test("faqat to'liq kelgan maydonlar", () => {
    assert.deepEqual(partialJson(""), {});
    assert.deepEqual(partialJson('{"heard":"안녕'), {});
    assert.deepEqual(partialJson('{"heard":"안녕","help":[{"lang":"uz","text":"a]b'), { heard: "안녕" });
    assert.deepEqual(partialJson('{"heard":"say \\"hi\\"", "help": [{"lang":"uz","text":"}]{"}], "n": 12, "ok": tr'), {
      heard: 'say "hi"',
      help: [{ lang: "uz", text: "}]{" }],
      n: 12,
    });
    assert.deepEqual(partialJson('```json\n{"a":1,"b":{"c":[1,2]}}'), { a: 1, b: { c: [1, 2] } });
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

  test("koreyscha javobning birinchi gapi alohida bo'lak — ovoz tezroq boshlanadi", () => {
    assert.deepEqual(splitTalk("아, 8시에 출근하셨군요! 아침 일찍 시작하셔서 피곤하겠어요. 보통 몇 시에 퇴근해요?"), [
      "아, 8시에 출근하셨군요!",
      "아침 일찍 시작하셔서 피곤하겠어요. 보통 몇 시에 퇴근해요?",
    ]);
    assert.deepEqual(splitTalk("네! 저도 좋아해요. 뭐 먹었어요?"), ["네! 저도 좋아해요.", "뭐 먹었어요?"], "juda qisqa bo'lak ajratilmaydi");
    assert.deepEqual(splitTalk("좋아요. 네?"), ["좋아요. 네?"]);
    assert.deepEqual(splitTalk("시장에서 뭐 샀어요?"), ["시장에서 뭐 샀어요?"]);
  });
});
