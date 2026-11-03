"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { Md, useAiErrorText, ApiError, notifyAccess } from "@/components/ui";
import { useLang } from "@/lib/i18n";
import { touchStreak } from "@/lib/store";

type M = { role: "user" | "ai"; text: string };

export default function TutorPage() {
  const { L, lang } = useLang();
  const errText = useAiErrorText();
  const [msgs, setMsgs] = useState<M[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), [msgs]);

  const chips = [
    L("은/는 va 이/가 farqi nima?", "В чём разница между 은/는 и 이/가?"),
    L("-아요/어요 qanday yasaladi?", "Как образуется -아요/어요?"),
    L("TOPIK 54-esseni qanday yozish kerak?", "Как писать эссе 54 в TOPIK?"),
    L("TOPIK I uchun 3 oylik reja tuzib ber", "Составь план подготовки к TOPIK I на 3 месяца"),
    L("Bu gapni tekshir: 저는 어제 학교에 가요.", "Проверь фразу: 저는 어제 학교에 가요."),
    L("Ishda boshliqqa qanday murojaat qilinadi?", "Как обращаться к начальнику на работе?"),
  ];

  const ask = async (q: string) => {
    const t = q.trim();
    if (!t || busy) return;
    setText("");
    setErr("");
    const next: M[] = [...msgs, { role: "user", text: t }];
    setMsgs([...next, { role: "ai", text: "" }]);
    setBusy(true);
    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, lang }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        notifyAccess(res.status, j?.code);
        throw new ApiError(j?.error || `HTTP ${res.status}`, res.status, j?.code);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setMsgs([...next, { role: "ai", text: acc }]);
      }
      if (!acc) throw new ApiError("Bo‘sh javob", 502);
      touchStreak();
    } catch (e) {
      setMsgs(next);
      setErr(errText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="container" style={{ maxWidth: 860, paddingTop: 20 }}>
      {msgs.length === 0 && (
        <div className="section-head center" style={{ alignItems: "center", paddingTop: 20 }}>
          <div className="syllable-box" style={{ width: 96, height: 96, fontSize: "2.8rem", borderRadius: 28 }}>
            <Icon name="spark" size={44} />
          </div>
          <h1 className="h2" style={{ marginTop: 8 }}>
            AI <span className="gradient-text">{L("Ustoz", "Учитель")}</span>
          </h1>
          <p className="lead">
            {L(
              "Grammatika, TOPIK strategiyasi, gaplarni tekshirish, Koreyadagi hayot — istalgan savolni o‘zbekcha bering.",
              "Грамматика, стратегия TOPIK, проверка фраз, жизнь в Корее — задавайте любые вопросы по-русски."
            )}
          </p>
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
                {m.text ? <Md text={m.text} /> : <span className="spinner" />}
              </div>
            </div>
          )
        )}
        {err && <div className="callout">{err}</div>}
        <div ref={endRef} />
      </div>

      <div className="composer">
        <div className="card row" style={{ padding: 10, gap: 10 }}>
          <textarea
            className="textarea grow"
            style={{ minHeight: 48, maxHeight: 160, border: 0, boxShadow: "none", padding: "10px 12px" }}
            rows={1}
            placeholder={L("Savolingizni yozing…", "Напишите вопрос…")}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void ask(text);
              }
            }}
          />
          <button className="icon-btn primary" disabled={busy || !text.trim()} onClick={() => ask(text)} aria-label="Yuborish">
            {busy ? <span className="spinner white" style={{ width: 18, height: 18 }} /> : <Icon name="send" size={18} />}
          </button>
        </div>
      </div>
    </main>
  );
}
