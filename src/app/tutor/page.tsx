"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { Md, useAiErrorText, ApiError, notifyAccess } from "@/components/ui";
import { studentSummary, touchStreak } from "@/lib/store";

type M = { role: "user" | "ai"; text: string };

/** Shuncha vaqt ichida javobdan hech narsa kelmasa — so'rov uziladi va «qayta urinish» chiqadi */
const IDLE_MS = 30_000;

export default function TutorPage() {
  const errText = useAiErrorText();
  const [msgs, setMsgs] = useState<M[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [retry, setRetry] = useState<{ q: string; base: M[] } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const msgsRef = useRef<M[]>([]);

  useEffect(() => {
    // Yangi brauzerlarda scrollIntoView Promise qaytaradi — effektdan qaytarilmasligi kerak
    void endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, err]);
  // Sahifadan chiqilganda — ochiq so'rovni to'xtatamiz
  useEffect(() => () => abortRef.current?.abort(), []);

  const commit = (list: M[]) => {
    msgsRef.current = list;
    setMsgs(list);
  };

  const chips = [
    "은/는 va 이/가 farqi nima?",
    "-아요/어요 qanday yasaladi?",
    "TOPIK 54-esseni qanday yozish kerak?",
    "-느라고 va -는 바람에 farqi nima?",
    "2026-yil TOPIK jadvali qanday?",
    "TOPIK II o‘qish 39–41-savollari qanday yechiladi?",
    "TOPIK I uchun 3 oylik reja tuzib ber",
    "Bu gapni tekshir: 저는 어제 학교에 가요.",
    "Ishda boshliqqa qanday murojaat qilinadi?",
    "EPS-TOPIK uchun xavfsizlik belgilarini o‘rgat",
    "Mening natijalarim bo‘yicha o‘quv reja tuz",
  ];

  /** base — savoldan oldingi suhbat (qayta urinishda shu holatdan davom etiladi) */
  const ask = async (q: string, base: M[] = msgsRef.current) => {
    const t = q.trim();
    if (!t || busy) return;
    setText("");
    setErr("");
    setRetry(null);
    const next: M[] = [...base, { role: "user", text: t }];
    commit([...next, { role: "ai", text: "" }]);
    setBusy(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let timedOut = false;
    let idle = 0;
    const kick = () => {
      window.clearTimeout(idle);
      idle = window.setTimeout(() => {
        timedOut = true;
        ctrl.abort();
      }, IDLE_MS);
    };
    kick();

    let acc = "";
    try {
      let res: Response;
      try {
        res = await fetch("/api/tutor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: next, student: studentSummary() }),
          signal: ctrl.signal,
        });
      } catch (e) {
        if ((e as Error).name === "AbortError") throw e;
        throw new ApiError("network", 0);
      }
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        notifyAccess(res.status, j?.code);
        throw new ApiError(j?.error || `HTTP ${res.status}`, res.status, j?.code);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        kick();
        acc += dec.decode(value, { stream: true });
        commit([...next, { role: "ai", text: acc }]);
      }
      if (!acc.trim()) throw new ApiError("Bo‘sh javob", 502);
      touchStreak();
    } catch (e) {
      const aborted = (e as Error)?.name === "AbortError";
      if (acc.trim()) {
        // Javobning bir qismi kelgan — o'chirmaymiz
        commit([...next, { role: "ai", text: acc }]);
        if (timedOut) setErr("Javob to‘liq kelmadi — internet sekin bo‘lishi mumkin.");
      } else {
        commit(base);
        setText((cur) => cur || t); // savol yo'qolmasin — tahrirlab qayta yuborish mumkin
        if (timedOut || !aborted) setErr(timedOut ? "Javob kelmadi (internet yoki server sekin). Qayta urinib ko‘ring." : errText(e));
      }
      if (timedOut || !aborted) setRetry({ q: t, base });
    } finally {
      window.clearTimeout(idle);
      if (abortRef.current === ctrl) abortRef.current = null;
      setBusy(false);
    }
  };

  const stop = () => abortRef.current?.abort();

  return (
    <main className="container chat-page" style={{ maxWidth: 860, paddingTop: 20 }}>
      <Link href="/speak" className="back-link">
        <Icon name="left" size={16} /> AI Ustoz
      </Link>
      {msgs.length === 0 && (
        <div className="section-head center" style={{ alignItems: "center", paddingTop: 20 }}>
          <div className="syllable-box" style={{ width: 96, height: 96, fontSize: "2.8rem", borderRadius: 28 }}>
            <Icon name="spark" size={44} />
          </div>
          <h1 className="h2" style={{ marginTop: 8 }}>
            AI <span className="gradient-text">Ustoz</span>
          </h1>
          <p className="lead">
            Grammatika, tarjima, TOPIK strategiyasi, gaplarni tekshirish, Koreyadagi hayot — istalgan savolni o‘zbekcha bering.
          </p>
          <Link href="/speak/ustoz" className="btn btn-primary" style={{ marginTop: 4 }}>
            <Icon name="mic" size={18} /> Ovozli rejim — gapirib so‘rang
          </Link>
          <div className="row-wrap" style={{ justifyContent: "center", marginTop: 8 }}>
            {chips.map((c) => (
              <button key={c} className="chip" style={{ whiteSpace: "normal" }} onClick={() => ask(c)}>
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="chat" style={{ paddingTop: 10 }}>
        {msgs.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="msg me">
              <div className="bubble">{m.text}</div>
            </div>
          ) : (
            <div key={i} className="msg ai" style={{ maxWidth: "100%" }}>
              <div className="bubble kr" style={{ fontFamily: "var(--font-body), var(--font-kr)" }}>
                {m.text ? (
                  <Md text={m.text} />
                ) : (
                  <span className="vs-dots" aria-label="Ustoz yozmoqda">
                    <i />
                    <i />
                    <i />
                  </span>
                )}
              </div>
            </div>
          )
        )}
        {err && (
          <div className="callout" style={{ alignItems: "center" }}>
            <span className="grow">{err}</span>
            {retry && (
              <button className="btn btn-sm btn-soft" onClick={() => ask(retry.q, retry.base)}>
                <Icon name="rotate" size={15} /> Qayta urinish
              </button>
            )}
          </div>
        )}
        <div ref={endRef} className="chat-end" />
      </div>

      <div className="composer">
        <div className="card row" style={{ padding: 10, gap: 10 }}>
          <textarea
            className="textarea grow"
            style={{ minHeight: 48, maxHeight: 160, border: 0, boxShadow: "none", padding: "10px 12px" }}
            rows={1}
            placeholder="Savolingizni yozing…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void ask(text);
              }
            }}
          />
          {busy ? (
            <button className="icon-btn primary" onClick={stop} aria-label="To‘xtatish" title="To‘xtatish">
              <Icon name="stop" size={16} fill />
            </button>
          ) : (
            <button className="icon-btn primary" disabled={!text.trim()} onClick={() => ask(text)} aria-label="Yuborish">
              <Icon name="send" size={18} />
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
