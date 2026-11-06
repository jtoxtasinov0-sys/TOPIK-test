import "server-only";
import { parseJson, partialJson } from "@/lib/gemini";
import type { SpeechChunk } from "@/lib/speech";
import { speech } from "./tts";
import type { User } from "./users";

// Ovozli suhbatlar (/api/talk, /api/voice) uchun umumiy oqim: Gemini JSON javobi kelayotgan paytdayoq
// tayyor maydonlar NDJSON hodisalari bo'lib brauzerga yuboriladi, javob ovozi esa shu serverning o'zida
// darhol tayyorlanib, {"t":"audio"} hodisasi bilan keladi — brauzer /api/tts ga alohida so'rov yubormaydi.

export type EventApi = {
  emit: (o: Record<string, unknown>) => void;
  /** Bo'laklar ovozini parallel tayyorlaydi; qaysilari tayyorlanishini qaytaradi (TTS o'chiq bo'lsa — []) */
  voice: (chunks: SpeechChunk[]) => SpeechChunk[];
};

export const ndjson = (body: ReadableStream<Uint8Array>) =>
  new Response(body, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" },
  });

/**
 * partial — har yangi bo'lakda to'liq kelgan maydonlar bilan chaqiriladi: "stop" — o'qish to'xtaydi,
 * "enough" — boshqa chaqirilmaydi (o'qish davom etadi). final — oxirida to'liq javob (uzilsa — kelgan qismi) bilan.
 * Oqim ovozlar tayyor bo'lgach yopiladi. tts — null bo'lsa ovoz tayyorlanmaydi.
 */
export function jsonEvents<T>(
  src: ReadableStream<Uint8Array>,
  tts: { user: User | null } | null,
  partial: (f: Partial<T>, api: EventApi) => void | "stop" | "enough",
  final: (raw: T, api: EventApi) => void
): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const reader = src.getReader();
  let closed = false;
  return new ReadableStream<Uint8Array>({
    start(controller) {
      const emit = (o: Record<string, unknown>) => {
        if (closed) return;
        try {
          controller.enqueue(enc.encode(JSON.stringify(o) + "\n"));
        } catch {}
      };
      const voices: Promise<unknown>[] = [];
      const voice = (chunks: SpeechChunk[]) => {
        if (!tts) return [];
        for (const c of chunks)
          voices.push(
            speech(c.text, c.opts, tts.user).then(
              (buf) => emit({ t: "audio", text: c.text, data: buf.toString("base64") }),
              () => emit({ t: "audio", text: c.text, failed: true })
            )
          );
        return chunks;
      };
      const api: EventApi = { emit, voice };
      void (async () => {
        let buf = "";
        let watching = true;
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (value) buf += dec.decode(value, { stream: true });
            if (watching) {
              const r = partial(partialJson(buf) as Partial<T>, api);
              if (r === "stop") break;
              if (r === "enough") watching = false;
            }
            if (done) break;
          }
        } catch {
          // oqim uzildi — kelgan qismi bilan yakunlaymiz
        }
        reader.cancel().catch(() => {});
        let raw: T;
        try {
          raw = parseJson<T>(buf);
        } catch {
          raw = partialJson(buf) as T;
        }
        final(raw, api);
        await Promise.allSettled(voices);
        if (!closed) {
          closed = true;
          controller.close();
        }
      })();
    },
    cancel() {
      closed = true;
      reader.cancel().catch(() => {});
    },
  });
}
