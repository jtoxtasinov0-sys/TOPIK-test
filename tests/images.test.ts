// Test rasmlari: /api/image (Gemini rasm modeli, model tanlash, disk keshi, ruxsatlar) va ma'lumotlar.
// Gemini soxta fetch bilan almashtiriladi.

import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, before, beforeEach, describe, test } from "node:test";

process.env.GEMINI_API_KEY = "test-key";
process.env.GOOGLE_CLIENT_ID = "";
process.env.GOOGLE_CLIENT_SECRET = "";
process.env.AUTH_SECRET = "test-secret-0123456789abcdef";
const DIR = mkdtempSync(path.join(tmpdir(), "hq-img-"));
process.env.IMAGE_DIR = DIR;

const { createMemoryStore, setStore } = await import("../src/lib/server/store");
const imageRoute = await import("../src/app/api/image/route");
const { clearImageMemory, imageKey, imageLog } = await import("../src/lib/server/images");
const { pickImageModel, resetImageModel } = await import("../src/lib/gemini");
const { imagePromptsOf, MAX_IMAGE_PROMPT, IMAGE_STYLE, ICON_STYLE, imageUrl, widthFor } = await import("../src/lib/images");
const { decodePng, encodePng, resizeBitmap, shrinkPng, toGrayIfPossible } = await import("../src/lib/server/png");
const { VISUALS, visualPrompts } = await import("../src/data/visuals");
const { LESSONS } = await import("../src/data/lessons");
const { SCENARIOS } = await import("../src/data/scenarios");
const { DECKS } = await import("../src/data/words");
const { EMERGENCY, FIRST_STEPS } = await import("../src/data/guide");
const { TOPIK1 } = await import("../src/data/topik1");
const { TOPIK2 } = await import("../src/data/topik2");
const { EPS } = await import("../src/data/eps");
const { allQuestions } = await import("../src/lib/exam");

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const realFetch = globalThis.fetch;
type Call = { url: string; body?: { contents?: { parts?: { text?: string }[] }[]; generationConfig?: { imageConfig?: unknown } } };
let calls: Call[] = [];

function mockGemini(opts: { models?: string[]; imageStatus?: number[]; png?: Buffer } = {}) {
  calls = [];
  const statuses = [...(opts.imageStatus ?? [])];
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    const u = String(url);
    calls.push({ url: u, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    if (u.includes("/models?")) {
      return Response.json({ models: (opts.models ?? ["models/gemini-2.5-flash-image"]).map((name) => ({ name, supportedGenerationMethods: ["generateContent"] })) });
    }
    const status = statuses.shift() ?? 200;
    if (status !== 200) return Response.json({ error: { message: `xato ${status}` } }, { status });
    return Response.json({ candidates: [{ content: { parts: [{ text: "ok" }, { inlineData: { mimeType: "image/png", data: (opts.png ?? PNG).toString("base64") } }] } }] });
  }) as typeof fetch;
}

let ip = 0;
const get = (prompt: string, cookie = "", extra = "") =>
  new Request(`https://hanustoz.tech/api/image?p=${encodeURIComponent(prompt)}${extra}`, {
    headers: { "x-forwarded-for": `10.2.0.${++ip}`, ...(cookie ? { cookie } : {}) },
  });

const BUILTIN = imagePromptsOf([TOPIK1, TOPIK2, EPS]);

before(() => setStore(createMemoryStore()));
beforeEach(() => {
  clearImageMemory();
  resetImageModel();
});
afterEach(() => {
  globalThis.fetch = realFetch;
  process.env.GEMINI_API_KEY = "test-key";
  process.env.GOOGLE_CLIENT_ID = "";
  process.env.GOOGLE_CLIENT_SECRET = "";
});

describe("rasm modeli tanlash", () => {
  test("flash > pro, yangi versiya, imagen va matnli modellar emas", () => {
    const m = (name: string, methods = ["generateContent"]) => ({ name: `models/${name}`, supportedGenerationMethods: methods });
    assert.equal(
      pickImageModel([m("gemini-3.8-flash"), m("imagen-4.0-generate-001", ["predict"]), m("gemini-3-pro-image-preview"), m("gemini-2.5-flash-image"), m("gemini-3.1-flash-image")]),
      "gemini-3.1-flash-image"
    );
    assert.equal(pickImageModel([m("gemini-3-pro-image-preview")]), "gemini-3-pro-image-preview");
    assert.equal(pickImageModel([m("gemini-3.8-flash")]), null);
  });
});

describe("/api/image", () => {
  test("tayyor variant rasmi: bir marta chiziladi, keyin keshdan (xotira va disk)", async () => {
    mockGemini({ models: ["models/gemini-3-pro-image-preview", "models/gemini-2.5-flash-image"] });
    const prompt = BUILTIN[0];
    const res = await imageRoute.GET(get(prompt));
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-type"), "image/png");
    assert.match(res.headers.get("cache-control") ?? "", /public/);
    assert.deepEqual(Buffer.from(await res.arrayBuffer()), PNG);

    const gen = calls.filter((c) => c.url.includes(":generateContent"));
    assert.equal(gen.length, 1);
    assert.match(gen[0].url, /models\/gemini-2\.5-flash-image:generateContent/, "flash model tanlandi");
    const text = gen[0].body?.contents?.[0]?.parts?.[0]?.text ?? "";
    assert.ok(text.startsWith(IMAGE_STYLE) && text.endsWith(prompt), "uslub + sahna");
    assert.deepEqual(gen[0].body?.generationConfig?.imageConfig, { aspectRatio: "4:3" });
    assert.ok(existsSync(path.join(DIR, `${imageKey(prompt)}.png`)), "diskka yozildi");

    // Xotira tozalansa ham diskdan olinadi — Gemini'ga qayta murojaat yo'q
    clearImageMemory();
    mockGemini();
    const again = await imageRoute.GET(get(prompt));
    assert.equal(again.status, 200);
    assert.equal(calls.length, 0);
  });

  test("imageConfig qabul qilinmasa — sozlamasiz qayta uriniladi", async () => {
    mockGemini({ imageStatus: [400, 200] });
    const res = await imageRoute.GET(get(BUILTIN[1]));
    assert.equal(res.status, 200);
    const gen = calls.filter((c) => c.url.includes(":generateContent"));
    assert.equal(gen.length, 2);
    assert.equal(gen[1].body?.generationConfig?.imageConfig, undefined);
  });

  test("AI variant rasmi: login yoqilgan bo'lsa kirish kerak, tayyor rasm esa hammaga ochiq", async () => {
    process.env.GOOGLE_CLIENT_ID = "cid.apps.googleusercontent.com";
    process.env.GOOGLE_CLIENT_SECRET = "csecret";
    mockGemini();
    const res = await imageRoute.GET(get("A man reads a newspaper on a park bench."));
    assert.equal(res.status, 401);
    assert.equal(calls.length, 0);
    const ok = await imageRoute.GET(get(BUILTIN[2]));
    assert.equal(ok.status, 200);
  });

  test("ochiq rejimda AI variant rasmi ham chiziladi (private kesh)", async () => {
    mockGemini();
    const res = await imageRoute.GET(get("A woman waters flowers on a balcony."));
    assert.equal(res.status, 200);
    assert.match(res.headers.get("cache-control") ?? "", /private/);
  });

  test("noto'g'ri so'rovlar: bo'sh, juda uzun, kalitsiz", async () => {
    mockGemini();
    assert.equal((await imageRoute.GET(get(""))).status, 400);
    assert.equal((await imageRoute.GET(get("x".repeat(MAX_IMAGE_PROMPT + 1)))).status, 400);
    process.env.GEMINI_API_KEY = "";
    assert.equal((await imageRoute.GET(get(BUILTIN[3]))).status, 503);
    assert.equal(calls.length, 0);
  });
});

describe("rasmli savollar ma'lumotlari", () => {
  test("rasmli variantlarda 4 ta tavsif, xavfsizlik belgilari to'g'ri, tavsiflar qisqa", () => {
    let pictureQs = 0;
    for (const t of [TOPIK1, TOPIK2, EPS])
      for (const s of t.sections)
        for (const { q } of allQuestions(s)) {
          if (q.optionStyle === "picture") {
            pictureQs++;
            assert.equal(q.optionImages?.length, 4, `${t.id} ${q.n}: 4 ta rasm tavsifi`);
          }
          if (q.sign) assert.ok(["prohibit", "warn", "order", "guide"].includes(q.sign.kind) && q.sign.icon, `${t.id} ${q.n}`);
        }
    assert.equal(pictureQs, 6, "TOPIK I 15–16, TOPIK II 1–2, EPS 23–24");
    assert.ok(BUILTIN.length >= 28, `rasmlar soni: ${BUILTIN.length}`);
    assert.ok(BUILTIN.every((p) => p.length <= MAX_IMAGE_PROMPT && !/%[MW]/.test(p)));
    assert.equal(readdirSync(DIR).filter((f) => f.endsWith(".tmp")).length, 0, "vaqtinchalik fayl qolmaydi");
  });
});

/** Sinov uchun rangli gradient rasm */
function sample(width: number, height: number, gray = false) {
  const data = new Uint8Array(width * height * 3);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      const v = (x * 255) / (width - 1);
      data[i] = v;
      data[i + 1] = gray ? v : (y * 255) / (height - 1);
      data[i + 2] = gray ? v : 128;
    }
  return { width, height, channels: 3 as const, data };
}

describe("PNG: o'qish, kichraytirish, yozish", () => {
  test("RGB, RGBA va kulrang rasm yozilib, aynan o'qiladi", () => {
    const rgb = sample(37, 23);
    assert.deepEqual(decodePng(encodePng(rgb)), rgb);
    const rgba = { width: 5, height: 4, channels: 4 as const, data: Uint8Array.from({ length: 80 }, (_, i) => (i * 37) % 256) };
    assert.deepEqual(decodePng(encodePng(rgba)), rgba);
    const gray = { width: 9, height: 3, channels: 1 as const, data: Uint8Array.from({ length: 27 }, (_, i) => i * 9) };
    assert.deepEqual(decodePng(encodePng(gray)), gray);
    assert.equal(decodePng(Buffer.from("not a png")), null);
  });

  test("kichraytirish: proporsiya saqlanadi, ranglar o'rtachalanadi, kattalashtirilmaydi", () => {
    const img = sample(400, 300);
    const r = resizeBitmap(img, 100);
    assert.equal(r.width, 100);
    assert.equal(r.height, 75);
    assert.ok(Math.abs(r.data[0] - 1) <= 2 && Math.abs(r.data[(100 * 75 - 1) * 3] - 254) <= 2, "chap va o'ng chekka");
    assert.equal(resizeBitmap(img, 800), img);
    // Bir xil rang — natija ham aynan shu rang
    const flat = { width: 30, height: 30, channels: 3 as const, data: new Uint8Array(2700).fill(200) };
    assert.ok(resizeBitmap(flat, 7).data.every((x) => x === 200));
  });

  test("oq-qora rasm bitta kanalga o'tadi va fayl kichrayadi", () => {
    assert.equal(toGrayIfPossible(sample(20, 20, true)).channels, 1);
    assert.equal(toGrayIfPossible(sample(20, 20)).channels, 3);
    const big = encodePng(sample(1024, 768, true));
    const small = shrinkPng(big, 256)!;
    const back = decodePng(small)!;
    assert.equal(back.width, 256);
    assert.equal(back.height, 192);
    assert.equal(back.channels, 1);
    assert.ok(small.length < big.length / 4, `${small.length} < ${big.length}/4`);
    assert.equal(shrinkPng(Buffer.from([1, 2, 3]), 128), null);
  });
});

describe("kichraytirilgan nusxalar va ikonkalar", () => {
  test("?w=128: kichraytirilgan PNG qaytadi va diskda saqlanadi, keyin keshdan", async () => {
    const png = encodePng(sample(300, 200));
    mockGemini({ png });
    const prompt = BUILTIN[4];
    const res = await imageRoute.GET(get(prompt, "", "&w=128"));
    assert.equal(res.status, 200);
    const img = decodePng(new Uint8Array(await res.arrayBuffer()))!;
    assert.equal(img.width, 128);
    assert.equal(img.height, 85);
    assert.ok(existsSync(path.join(DIR, `${imageKey(prompt)}.png`)), "asl rasm");
    assert.ok(existsSync(path.join(DIR, `${imageKey(prompt)}-w128.png`)), "kichik nusxa");

    clearImageMemory();
    mockGemini();
    const again = await imageRoute.GET(get(prompt, "", "&w=128"));
    assert.equal(decodePng(new Uint8Array(await again.arrayBuffer()))!.width, 128);
    // Boshqa o'lcham — asl rasmdan yasaladi, Gemini'ga murojaat yo'q
    const other = await imageRoute.GET(get(prompt, "", "&w=256"));
    assert.equal(decodePng(new Uint8Array(await other.arrayBuffer()))!.width, 256);
    // Ruxsat etilmagan o'lcham — asl rasm
    const orig = await imageRoute.GET(get(prompt, "", "&w=999"));
    assert.equal(decodePng(new Uint8Array(await orig.arrayBuffer()))!.width, 300);
    assert.equal(calls.length, 0);
  });

  test("ikonka uslubi: faqat saytning o'z ikonkalari, kvadrat va ikonka uslubida chiziladi", async () => {
    mockGemini();
    const prompt = VISUALS["home:test"].prompt;
    const res = await imageRoute.GET(get(prompt, "", "&s=icon"));
    assert.equal(res.status, 200);
    const gen = calls.filter((c) => c.url.includes(":generateContent"));
    const text = gen[0].body?.contents?.[0]?.parts?.[0]?.text ?? "";
    assert.ok(text.startsWith(ICON_STYLE) && text.endsWith(prompt));
    assert.deepEqual(gen[0].body?.generationConfig?.imageConfig, { aspectRatio: "1:1" });
    assert.notEqual(imageKey(prompt, "icon"), imageKey(prompt, "test"));
    assert.equal((await imageRoute.GET(get("a random picture", "", "&s=icon"))).status, 400);
  });

  test("har bir dars, vaziyat, so'z to'plami va qo'llanma bandida ikonka bor", () => {
    for (const l of LESSONS) assert.ok(`lesson:${l.id}` in VISUALS, l.id);
    for (const sc of SCENARIOS) assert.ok(`scenario:${sc.id}` in VISUALS, sc.id);
    for (const d of DECKS) assert.ok(`deck:${d.id}` in VISUALS, d.id);
    for (const e of EMERGENCY) assert.ok(`guide:${e.num}` in VISUALS, e.num);
    for (const st of FIRST_STEPS) assert.ok(`step:${st.id}` in VISUALS, st.id);
    const prompts = visualPrompts();
    assert.equal(prompts.length, Object.keys(VISUALS).length, "tavsiflar takrorlanmaydi");
    assert.ok(prompts.every((p) => p.length <= MAX_IMAGE_PROMPT));
  });

  test("URL va kengliklar", () => {
    assert.equal(widthFor(56), 128);
    assert.equal(widthFor(66), 256);
    assert.equal(widthFor(500), 768);
    assert.equal(imageUrl("a b", { style: "icon", w: 128 }), "/api/image?p=a%20b&s=icon&w=128");
    assert.equal(imageUrl("a b"), "/api/image?p=a%20b");
  });
});

describe("PWA: ilova ikonkasi va manifest", () => {
  test("logo fayllari: ilova ikonkalari aniq o'lchamda, SVG manbalar bor", async () => {
    const { readFileSync } = await import("node:fs");
    const dir = new URL("../public/brand/", import.meta.url);
    const size = (f: string) => {
      const img = decodePng(readFileSync(new URL(f, dir)))!;
      return [img.width, img.height];
    };
    assert.deepEqual(size("icon-180.png"), [180, 180]);
    assert.deepEqual(size("icon-192.png"), [192, 192]);
    assert.deepEqual(size("icon-512.png"), [512, 512]);
    assert.deepEqual(size("icon-maskable-512.png"), [512, 512]);
    assert.deepEqual(size("logo-1024.png"), [1024, 1024]);
    for (const f of ["logo-mark.svg", "app-icon.svg", "logo-horizontal.svg", "logo-horizontal-white.svg", "logo-tagline.svg", "logo-tagline-white.svg", "logo-stacked.svg"]) {
      const svg = readFileSync(new URL(f, dir), "utf8");
      assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/, f);
      assert.doesNotMatch(svg, /<text|font-family/, `${f}: shriftsiz (faqat chiziqlar)`);
    }
    // Ilova ikonkasi burchakgacha to'liq fon (telefon o'zi yumaloqlaydi), sayt belgisi — yumaloq burchakli
    for (const f of ["icon-180.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png"]) {
      const icon = decodePng(readFileSync(new URL(f, dir)))!;
      // iPhone shaffof joyni qora qiladi — ilova ikonkasida shaffoflik bo'lmasligi kerak
      const opaque = icon.channels === 3 || [0, icon.width - 1, icon.width * icon.height - 1].every((i) => icon.data[i * 4 + 3] === 255);
      assert.ok(opaque, `${f}: burchaklari to'liq`);
    }
    const favicon = readFileSync(new URL("../src/app/icon.svg", import.meta.url), "utf8");
    assert.equal(favicon, readFileSync(new URL("logo-mark.svg", dir), "utf8"), "favicon = logo belgisi");
  });

  test("/api/app-icon eski manzili yangi ikonkaga yo'naltiradi", async () => {
    const appRoute = await import("../src/app/api/app-icon/route");
    const res = appRoute.GET(new Request("https://hanustoz.tech/api/app-icon?size=180&v=a1"));
    assert.equal(res.status, 307);
    assert.equal(res.headers.get("location"), "https://hanustoz.tech/brand/icon-180.png?v=2");
    assert.equal(appRoute.GET(new Request("https://hanustoz.tech/api/app-icon?size=7")).headers.get("location"), "https://hanustoz.tech/brand/icon-512.png?v=2");
  });

  test("manifest: 192/512 PNG, maskable, tezkor menyular; service worker fayli bor", async () => {
    const { default: manifest } = await import("../src/app/manifest");
    const m = manifest();
    assert.equal(m.display, "standalone");
    const icons = m.icons ?? [];
    assert.ok(icons.some((i) => i.sizes === "192x192" && i.type === "image/png"));
    assert.ok(icons.some((i) => i.sizes === "512x512" && i.purpose === "maskable" && i.src.startsWith("/brand/icon-maskable-512.png")));
    assert.ok(icons.filter((i) => i.type === "image/png").every((i) => i.src.startsWith("/brand/")), "ikonkalar statik logo fayllari");
    assert.equal(m.shortcuts?.length, 4);
    for (const s of m.shortcuts ?? []) assert.match(String(s.icons?.[0]?.src), /^\/api\/image\?p=.+&s=icon&w=128$/);
    const { readFileSync } = await import("node:fs");
    const sw = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
    assert.match(sw, /addEventListener\("fetch"/);
    assert.match(sw, /Internet yo'q/);
  });
});

describe("rasm xatolari ko'rinadi", () => {
  test("Gemini xatosi (masalan, bepul tarif) javobda va admin jurnalida aniq ko'rinadi", async () => {
    mockGemini({ imageStatus: [429] });
    const res = await imageRoute.GET(get(BUILTIN[5]));
    assert.equal(res.status, 429);
    assert.match((await res.json()).error, /xato 429/);
    const log = imageLog();
    assert.match(log.error?.message ?? "", /xato 429/);
    assert.equal(log.error?.style, "test");
  });

  test("/api/admin/images faqat admin uchun", async () => {
    const adminImages = await import("../src/app/api/admin/images/route");
    assert.equal((await adminImages.GET(new Request("https://hanustoz.tech/api/admin/images"))).status, 401);
  });
});
