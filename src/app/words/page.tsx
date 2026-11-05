"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { SpeakBtn } from "@/components/ui";
import { DECKS, type Deck, type Word } from "@/data/words";
import { GROUPS, LEVEL_DECKS, POS_NAME, VOCAB_A, VOCAB_ALL, VOCAB_B, VOCAB_SOURCE, type Level, type PosGroup, type VWord } from "@/data/vocab";
import { playKorean } from "@/lib/audio";
import { KEYS, touchStreak, useStored } from "@/lib/store";

// Leitner tizimi: 0..5 quti. Har to'g'ri javobda quti oshadi.
type Boxes = Record<string, number>;
type SetId = "theme" | Level;

const SETS: { id: SetId; label: string }[] = [
  { id: "theme", label: "🏷️ Mavzular" },
  { id: "A", label: `🟢 TOPIK I · ${VOCAB_A.length}` },
  { id: "B", label: `🔵 TOPIK II · ${VOCAB_B.length}` },
];

const posOf = (w: Word) => ("pos" in w ? POS_NAME[(w as VWord).pos] : undefined);

export default function WordsPage() {
  const [boxes, setBoxes] = useStored<Boxes>(KEYS.words, {});
  const [set, setSet] = useState<SetId>("theme");
  const [group, setGroup] = useState<PosGroup>("n");
  const [deck, setDeck] = useState<Deck>(DECKS[0]);
  const [flip, setFlip] = useState(false);
  const [i, setI] = useState(0);
  const [view, setView] = useState<"cards" | "list">("cards");
  const [q, setQ] = useState("");

  const levelDecks = set === "theme" ? [] : LEVEL_DECKS[set].filter((d) => d.group === group);

  const pickDeck = (d: Deck) => {
    setDeck(d);
    setI(0);
    setFlip(false);
  };

  const pickSet = (s: SetId) => {
    setSet(s);
    setQ("");
    if (s === "theme") pickDeck(DECKS[0]);
    else {
      setGroup("n");
      pickDeck(LEVEL_DECKS[s][0]);
    }
  };

  const pickGroup = (g: PosGroup) => {
    if (set === "theme") return;
    setGroup(g);
    const first = LEVEL_DECKS[set].find((d) => d.group === g);
    if (first) pickDeck(first);
  };

  // Kam bilinadigan so'zlar oldinda
  const queue = useMemo(() => [...deck.words].sort((a, b) => (boxes[a.id] ?? 0) - (boxes[b.id] ?? 0)), [deck, boxes]);
  const word = queue[i % queue.length];
  const learned = deck.words.filter((w) => (boxes[w.id] ?? 0) >= 3).length;
  const totalLearned = Object.values(boxes).filter((b) => b >= 3).length;

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    const all: Word[] = [...DECKS.flatMap((d) => d.words), ...VOCAB_ALL];
    return all.filter((w) => w.ko.includes(s) || w.uz.toLowerCase().includes(s) || w.rom.includes(s)).slice(0, 60);
  }, [q]);

  const answer = (know: boolean) => {
    setBoxes((b) => ({ ...b, [word.id]: know ? Math.min(5, (b[word.id] ?? 0) + 1) : 0 }));
    touchStreak();
    setFlip(false);
    setTimeout(() => setI((x) => x + 1), 180);
  };

  const listOf = (ws: Word[]) => (
    <div className="grid-3">
      {ws.map((w) => (
        <div key={w.id} className="card row" style={{ padding: 14 }}>
          <div className="grow">
            <div className="kr" style={{ fontWeight: 800, fontSize: "1.15rem" }}>{w.ko}</div>
            <div className="tiny muted">
              [{w.rom}]{posOf(w) ? ` · ${posOf(w)}` : ""}
            </div>
            <div className="small">{w.uz}</div>
          </div>
          {(boxes[w.id] ?? 0) >= 3 && <span className="badge green">✓</span>}
          <SpeakBtn text={w.ko} opts={{ slow: true }} />
        </div>
      ))}
    </div>
  );

  return (
    <main className="container page">
      <div className="section-head">
        <span className="eyebrow">🃏 So‘z kartochkalari</span>
        <h1 className="h1">
          So‘zlarni{" "}
          <span className="gradient-text">yodda saqlang</span>
        </h1>
        <p className="lead">
          {`${DECKS.reduce((a, d) => a + d.words.length, 0) + VOCAB_ALL.length} ta so‘z · jami o‘rganilgan: ${totalLearned} ta. Kartani bosing — tarjimasi ochiladi.`}
        </p>
      </div>

      <div className="row between" style={{ marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div className="seg">
          {SETS.map((s) => (
            <button key={s.id} className={set === s.id ? "on" : ""} onClick={() => pickSet(s.id)}>
              {s.label}
            </button>
          ))}
        </div>
        <input
          className="input"
          style={{ maxWidth: 280 }}
          placeholder="🔎 So‘z qidirish (koreyscha yoki o‘zbekcha)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="So‘z qidirish"
        />
      </div>

      {q.trim() ? (
        <div className="stack">
          <p className="small muted" style={{ margin: 0 }}>
            {results.length ? `${results.length} ta natija${results.length === 60 ? " (birinchi 60 tasi)" : ""}` : "Hech narsa topilmadi"}
          </p>
          {listOf(results)}
        </div>
      ) : (
        <>
          {set !== "theme" && (
            <div className="row-wrap" style={{ marginBottom: 12 }}>
              {GROUPS.map((g) => {
                const n = LEVEL_DECKS[set].filter((d) => d.group === g.id).reduce((a, d) => a + d.words.length, 0);
                if (!n) return null;
                return (
                  <button key={g.id} className={`chip ${group === g.id ? "active" : ""}`} onClick={() => pickGroup(g.id)}>
                    {g.emoji} {g.label} · {n}
                  </button>
                );
              })}
            </div>
          )}

          <div className="scroll-x" style={{ marginBottom: 18 }}>
            {(set === "theme" ? DECKS : levelDecks).map((d) => {
              const n = d.words.filter((w) => (boxes[w.id] ?? 0) >= 3).length;
              const ld = "from" in d ? (d as (typeof levelDecks)[number]) : null;
              return (
                <button
                  key={d.id}
                  className={`scenario ${deck.id === d.id ? "on" : ""}`}
                  style={{ width: ld ? 130 : 170 }}
                  onClick={() => pickDeck(d)}
                >
                  <span className="em">{d.emoji}</span>
                  <b className="small">{ld ? `${ld.from}–${ld.to}` : d.title}</b>
                  <span className="tiny" style={{ opacity: 0.8 }}>
                    {ld ? "" : `${d.level} · `}
                    {n}/{d.words.length}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="row between" style={{ marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
            <div className="seg">
              <button className={view === "cards" ? "on" : ""} onClick={() => setView("cards")}>
                🃏 Kartalar
              </button>
              <button className={view === "list" ? "on" : ""} onClick={() => setView("list")}>
                📋 Ro‘yxat
              </button>
            </div>
            <div className="row" style={{ minWidth: 200 }}>
              <div className="bar grow">
                <i style={{ width: `${(learned / deck.words.length) * 100}%` }} />
              </div>
              <span className="small" style={{ fontWeight: 800 }}>
                {learned}/{deck.words.length}
              </span>
            </div>
          </div>

          {view === "cards" ? (
            <div className="stack" style={{ alignItems: "center" }}>
              <div
                className={`flip ${flip ? "on" : ""}`}
                onClick={() => {
                  setFlip((f) => !f);
                  if (!flip) void playKorean(word.ko, { slow: true });
                }}
              >
                <div className="flip-in">
                  <div className="flip-face front">
                    <span className="badge white">Quti {boxes[word.id] ?? 0}/5</span>
                    <div className="kr" style={{ fontSize: word.ko.length > 5 ? "2.4rem" : "3.4rem", fontWeight: 800 }}>{word.ko}</div>
                    <div className="small" style={{ opacity: 0.85 }}>Bosing — tarjima</div>
                  </div>
                  <div className="flip-face back">
                    <div className="kr" style={{ fontSize: "2rem", fontWeight: 800 }}>{word.ko}</div>
                    <div className="muted" style={{ fontStyle: "italic" }}>
                      [{word.rom}]{posOf(word) ? ` · ${posOf(word)}` : ""}
                    </div>
                    <div style={{ fontSize: "1.3rem", fontWeight: 800, textAlign: "center" }} className="gradient-text">
                      {word.uz}
                    </div>
                  </div>
                </div>
              </div>
              <div className="row" style={{ gap: 12, marginTop: 6 }}>
                <button className="btn btn-danger btn-lg" onClick={() => answer(false)}>
                  <Icon name="x" size={18} /> Bilmayman
                </button>
                <SpeakBtn text={word.ko} opts={{ slow: true }} size="md" />
                <button className="btn btn-primary btn-lg" onClick={() => answer(true)}>
                  <Icon name="check" size={18} /> Bilaman
                </button>
              </div>
            </div>
          ) : (
            listOf(deck.words)
          )}
        </>
      )}

      {set !== "theme" && (
        <p className="tiny muted" style={{ marginTop: 28 }}>
          Manba:{" "}
          <a href={VOCAB_SOURCE.url} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>
            {VOCAB_SOURCE.name}
          </a>{" "}
          — {VOCAB_SOURCE.license}. So‘zlar chastota tartibida, tarjimalar HanQadam tomonidan.
        </p>
      )}
    </main>
  );
}
