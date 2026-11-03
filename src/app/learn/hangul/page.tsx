"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { SpeakBtn } from "@/components/ui";
import { BATCHIM, compose, CONSONANTS, DOUBLE_CONSONANTS, INITIALS, MEDIALS, romanize, SIMPLE_FINALS, VOWELS, type Jamo } from "@/data/hangul";
import { playKorean } from "@/lib/audio";
import { touchStreak } from "@/lib/store";

type Tab = "cons" | "vow" | "build" | "batchim" | "quiz";

function Detail({ j }: { j: Jamo }) {
  return (
    <div className="card" style={{ display: "grid", gap: 18, gridTemplateColumns: "auto 1fr", alignItems: "center" }}>
      <div className="syllable-box" key={j.g} style={{ width: 130, height: 130, fontSize: "4.4rem" }}>
        {j.g}
      </div>
      <div className="stack" style={{ gap: 8 }}>
        <div className="row-wrap">
          <span className="badge">{j.r}</span>
          {j.name && <span className="badge dark kr">{j.name}</span>}
          <SpeakBtn text={j.say} opts={{ slow: true }} />
        </div>
        <div className="small">{j.tip}</div>
        <div className="row" style={{ gap: 8 }}>
          <span className="kr" style={{ fontWeight: 800, fontSize: "1.2rem" }}>{j.ex.ko}</span>
          <span className="small muted">
            [{j.ex.rom}] — {j.ex.uz}
          </span>
          <SpeakBtn text={j.ex.ko} opts={{ slow: true }} />
        </div>
        <div className="tiny muted">Harfni bosing — tovushini eshitasiz</div>
      </div>
    </div>
  );
}

function Grid({ list, sel, onSel }: { list: Jamo[]; sel: Jamo; onSel: (j: Jamo) => void }) {
  return (
    <div className="tiles">
      {list.map((j) => (
        <button
          key={j.g}
          className={`tile ${sel.g === j.g ? "on" : ""}`}
          onClick={() => {
            onSel(j);
            void playKorean(j.say, { slow: true });
          }}
        >
          <span className="g">{j.g}</span>
          <span className="r">{j.r}</span>
        </button>
      ))}
    </div>
  );
}

function Builder() {
  const [i, setI] = useState("ㅎ");
  const [v, setV] = useState("ㅏ");
  const [f, setF] = useState("ㄴ");
  const syl = compose(i, v, f);
  return (
    <div className="grid-2" id="builder">
      <div className="card center stack" style={{ alignItems: "center", gap: 14 }}>
        <div className="syllable-box" key={syl}>
          {syl}
        </div>
        <div className="row">
          <span className="badge" style={{ fontSize: ".9rem" }}>{romanize(i, v, f)}</span>
          <SpeakBtn text={syl} opts={{ slow: true }} size="md" />
        </div>
        <div className="kr small muted">
          {i} + {v}
          {f ? ` + ${f}` : ""} = {syl}
        </div>
        <div className="small muted" style={{ maxWidth: 360 }}>
          Koreys bo‘g‘ini: boshlang‘ich undosh + unli (+ oxirgi undosh — 받침). Unli boshlansa ㅇ yoziladi (아, 오).
        </div>
      </div>
      <div className="card stack">
        <b className="small">1. Boshlang‘ich undosh</b>
        <div className="row-wrap" style={{ gap: 6 }}>
          {INITIALS.map((x) => (
            <button key={x} className={`chip kr ${i === x ? "active" : ""}`} style={{ padding: "6px 11px" }} onClick={() => setI(x)}>
              {x}
            </button>
          ))}
        </div>
        <b className="small">2. Unli</b>
        <div className="row-wrap" style={{ gap: 6 }}>
          {MEDIALS.map((x) => (
            <button key={x} className={`chip kr ${v === x ? "active" : ""}`} style={{ padding: "6px 11px" }} onClick={() => setV(x)}>
              {x}
            </button>
          ))}
        </div>
        <b className="small">3. 받침 (ixtiyoriy)</b>
        <div className="row-wrap" style={{ gap: 6 }}>
          {SIMPLE_FINALS.map((x) => (
            <button key={x || "none"} className={`chip kr ${f === x ? "active" : ""}`} style={{ padding: "6px 11px" }} onClick={() => setF(x)}>
              {x || "∅"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Quiz() {
  const pool = useMemo(() => [...CONSONANTS, ...VOWELS.slice(0, 10)], []);
  const [q, setQ] = useState<{ ans: Jamo; opts: Jamo[] } | null>(() => ({ ans: CONSONANTS[0], opts: [CONSONANTS[3], CONSONANTS[0], VOWELS[2], CONSONANTS[8]] }));
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState({ ok: 0, all: 0 });

  const next = () => {
    const ans = pool[Math.floor(Math.random() * pool.length)];
    const others = pool.filter((p) => p.g !== ans.g).sort(() => Math.random() - 0.5).slice(0, 3);
    setQ({ ans, opts: [...others, ans].sort(() => Math.random() - 0.5) });
    setPicked(null);
    void playKorean(ans.say, { slow: true });
  };

  if (!q) return null;
  return (
    <div className="card center stack" style={{ alignItems: "center", maxWidth: 560, margin: "0 auto" }}>
      <div className="row between" style={{ width: "100%" }}>
        <span className="badge">🎯 {score.ok} / {score.all}</span>
        <span className="small muted">Eshiting va harfni tanlang</span>
      </div>
      <button className="mic" onClick={() => playKorean(q.ans.say, { slow: true })} aria-label="Tinglash">
        <Icon name="volume" size={32} />
      </button>
      <div className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", width: "100%", gap: 10 }}>
        {q.opts.map((o) => {
          const state = picked ? (o.g === q.ans.g ? "on" : picked === o.g ? "bad" : "") : "";
          return (
            <button
              key={o.g}
              className={`tile ${state === "on" ? "on" : ""}`}
              style={state === "bad" ? { borderColor: "var(--red)", background: "rgba(255,77,109,.08)" } : undefined}
              disabled={!!picked}
              onClick={() => {
                setPicked(o.g);
                setScore((s) => ({ ok: s.ok + (o.g === q.ans.g ? 1 : 0), all: s.all + 1 }));
                touchStreak();
              }}
            >
              <span className="g">{o.g}</span>
              {picked && <span className="r">{o.r}</span>}
            </button>
          );
        })}
      </div>
      <button className="btn btn-primary" onClick={next}>
        {picked ? "Keyingisi" : "Boshlash / o‘tkazish"} <Icon name="right" size={18} />
      </button>
    </div>
  );
}

export default function HangulPage() {
  const [tab, setTab] = useState<Tab>("cons");
  const [sel, setSel] = useState<Jamo>(CONSONANTS[0]);

  useEffect(() => {
    // URL #builder bo'lsa — bo'g'in yasash bo'limini ochamiz (faqat brauzerda ma'lum)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (window.location.hash === "#builder") setTab("build");
  }, []);

  return (
    <main className="container page">
      <div className="section-head">
        <span className="eyebrow">한글 · Hangul</span>
        <h1 className="h1">
          Koreys 
          <span className="gradient-text">alifbosi</span>
        </h1>
        <p className="lead">
          Hangul — dunyodagi eng mantiqiy alifbolardan biri. 14 undosh + 10 unli asosini bilsangiz, istalgan so‘zni o‘qiy olasiz.
        </p>
      </div>
      <div className="seg" style={{ marginBottom: 18 }}>
        {(
          [
            ["cons", "Undoshlar"],
            ["vow", "Unlilar"],
            ["build", "Bo‘g‘in yasash"],
            ["batchim", "받침"],
            ["quiz", "Viktorina"],
          ] as [Tab, string][]
        ).map(([k, t]) => (
          <button
            key={k}
            className={tab === k ? "on" : ""}
            onClick={() => {
              setTab(k);
              if (k === "cons") setSel(CONSONANTS[0]);
              if (k === "vow") setSel(VOWELS[0]);
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {(tab === "cons" || tab === "vow") && (
        <div className="stack" style={{ gap: 18 }}>
          <Detail j={sel} />
          {tab === "cons" ? (
            <>
              <h3 className="h3">Asosiy undoshlar (14)</h3>
              <Grid list={CONSONANTS} sel={sel} onSel={setSel} />
              <h3 className="h3">Qo‘sh (taranglashgan) undoshlar (5)</h3>
              <Grid list={DOUBLE_CONSONANTS} sel={sel} onSel={setSel} />
            </>
          ) : (
            <>
              <h3 className="h3">Asosiy unlilar (10)</h3>
              <Grid list={VOWELS.slice(0, 10)} sel={sel} onSel={setSel} />
              <h3 className="h3">Murakkab unlilar (11)</h3>
              <Grid list={VOWELS.slice(10)} sel={sel} onSel={setSel} />
            </>
          )}
        </div>
      )}

      {tab === "build" && <Builder />}

      {tab === "batchim" && (
        <div className="stack">
          <div className="callout violet">
            받침 — bo‘g‘in oxiridagi undosh. Ko‘p harf bo‘lsa ham, oxirida faqat 7 xil tovush eshitiladi:
          </div>
          <div className="grid-3">
            {BATCHIM.map((b) => (
              <div key={b.sound} className="card stack" style={{ gap: 10 }}>
                <div className="row between">
                  <span className="display" style={{ fontSize: "1.6rem", fontWeight: 700 }}>[{b.sound}]</span>
                  <span className="kr badge">{b.letters}</span>
                </div>
                {b.ex.map((e) => (
                  <div key={e.ko} className="row" style={{ gap: 8 }}>
                    <span className="kr" style={{ fontWeight: 800, fontSize: "1.15rem" }}>{e.ko}</span>
                    <span className="small muted grow">
                      [{e.rom}] {e.uz}
                    </span>
                    <SpeakBtn text={e.ko} opts={{ slow: true }} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "quiz" && <Quiz />}
    </main>
  );
}
