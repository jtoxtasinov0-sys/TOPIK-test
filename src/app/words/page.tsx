"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { SpeakBtn } from "@/components/ui";
import { DECKS, type Deck } from "@/data/words";
import { playKorean } from "@/lib/audio";
import { useLang } from "@/lib/i18n";
import { KEYS, touchStreak, useStored } from "@/lib/store";

// Leitner tizimi: 0..5 quti. Har to'g'ri javobda quti oshadi.
type Boxes = Record<string, number>;

export default function WordsPage() {
  const { L, tr, lang } = useLang();
  const [boxes, setBoxes] = useStored<Boxes>(KEYS.words, {});
  const [deck, setDeck] = useState<Deck>(DECKS[0]);
  const [flip, setFlip] = useState(false);
  const [i, setI] = useState(0);
  const [view, setView] = useState<"cards" | "list">("cards");

  // Kam bilinadigan so'zlar oldinda
  const queue = useMemo(() => [...deck.words].sort((a, b) => (boxes[a.id] ?? 0) - (boxes[b.id] ?? 0)), [deck, boxes]);
  const word = queue[i % queue.length];
  const learned = deck.words.filter((w) => (boxes[w.id] ?? 0) >= 3).length;
  const totalLearned = Object.values(boxes).filter((b) => b >= 3).length;

  const answer = (know: boolean) => {
    setBoxes((b) => ({ ...b, [word.id]: know ? Math.min(5, (b[word.id] ?? 0) + 1) : 0 }));
    touchStreak();
    setFlip(false);
    setTimeout(() => setI((x) => x + 1), 180);
  };

  return (
    <main className="container page">
      <div className="section-head">
        <span className="eyebrow">🃏 {L("So‘z kartochkalari", "Карточки слов")}</span>
        <h1 className="h1">
          {L("So‘zlarni ", "Запоминайте ")}
          <span className="gradient-text">{L("yodda saqlang", "слова")}</span>
        </h1>
        <p className="lead">
          {L(`Jami o‘rganilgan: ${totalLearned} ta so‘z. Kartani bosing — tarjimasi ochiladi.`, `Всего выучено: ${totalLearned} слов. Нажмите на карточку — увидите перевод.`)}
        </p>
      </div>

      <div className="scroll-x" style={{ marginBottom: 18 }}>
        {DECKS.map((d) => {
          const n = d.words.filter((w) => (boxes[w.id] ?? 0) >= 3).length;
          return (
            <button
              key={d.id}
              className={`scenario ${deck.id === d.id ? "on" : ""}`}
              style={{ width: 170 }}
              onClick={() => {
                setDeck(d);
                setI(0);
                setFlip(false);
              }}
            >
              <span className="em">{d.emoji}</span>
              <b className="small">{tr(d.title)}</b>
              <span className="tiny" style={{ opacity: 0.8 }}>
                {d.level} · {n}/{d.words.length}
              </span>
            </button>
          );
        })}
      </div>

      <div className="row between" style={{ marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div className="seg">
          <button className={view === "cards" ? "on" : ""} onClick={() => setView("cards")}>
            🃏 {L("Kartalar", "Карточки")}
          </button>
          <button className={view === "list" ? "on" : ""} onClick={() => setView("list")}>
            📋 {L("Ro‘yxat", "Список")}
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
                <span className="badge white">
                  {L("Quti", "Ящик")} {boxes[word.id] ?? 0}/5
                </span>
                <div className="kr" style={{ fontSize: "3.4rem", fontWeight: 800 }}>{word.ko}</div>
                <div className="small" style={{ opacity: 0.85 }}>{L("Bosing — tarjima", "Нажмите — перевод")}</div>
              </div>
              <div className="flip-face back">
                <div className="kr" style={{ fontSize: "2rem", fontWeight: 800 }}>{word.ko}</div>
                <div className="muted" style={{ fontStyle: "italic" }}>[{word.rom}]</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 800 }} className="gradient-text">
                  {lang === "ru" ? word.ru : word.uz}
                </div>
                <div className="small muted">{lang === "ru" ? `UZ: ${word.uz}` : `RU: ${word.ru}`}</div>
              </div>
            </div>
          </div>
          <div className="row" style={{ gap: 12, marginTop: 6 }}>
            <button className="btn btn-danger btn-lg" onClick={() => answer(false)}>
              <Icon name="x" size={18} /> {L("Bilmayman", "Не знаю")}
            </button>
            <SpeakBtn text={word.ko} opts={{ slow: true }} size="md" />
            <button className="btn btn-primary btn-lg" onClick={() => answer(true)}>
              <Icon name="check" size={18} /> {L("Bilaman", "Знаю")}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid-3">
          {deck.words.map((w) => (
            <div key={w.id} className="card row" style={{ padding: 14 }}>
              <div className="grow">
                <div className="kr" style={{ fontWeight: 800, fontSize: "1.15rem" }}>{w.ko}</div>
                <div className="tiny muted">[{w.rom}]</div>
                <div className="small">{lang === "ru" ? w.ru : w.uz}</div>
              </div>
              {(boxes[w.id] ?? 0) >= 3 && <span className="badge green">✓</span>}
              <SpeakBtn text={w.ko} opts={{ slow: true }} />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
