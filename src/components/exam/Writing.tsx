"use client";

import { useRef, useState } from "react";
import type { WritingTask } from "@/lib/exam";
import { ChartView } from "../ChartView";
import { Icon } from "../Icon";
import { compressImage, postJson, ScoreRing } from "../ui";

export type WritingAnswer = {
  mode: "photo" | "type";
  text: string;
  a: string;
  b: string;
  images: { data: string; mime: string; preview: string }[];
};

export type WritingResult = {
  recognized_text: string;
  char_count?: number;
  score: number;
  max: number;
  criteria: { name: string; score: number; max: number; comment: string }[];
  strengths: string[];
  mistakes: { original: string; corrected: string; explanation: string }[];
  model_answer: string;
  summary: string;
  level_hint?: string;
};

export const emptyWriting = (): WritingAnswer => ({ mode: "photo", text: "", a: "", b: "", images: [] });

export function hasWritingAnswer(w?: WritingAnswer) {
  if (!w) return false;
  return w.images.length > 0 || !!w.text.trim() || !!w.a.trim() || !!w.b.trim();
}

export async function gradeWriting(task: WritingTask, w: WritingAnswer) {
  const text = task.kind === "blank" ? (w.a || w.b ? `㉠: ${w.a}\n㉡: ${w.b}` : "") : w.text;
  return postJson<WritingResult>("/api/writing", {
    task,
    text: text.trim() ? text : undefined,
    images: w.images.map((i) => ({ data: i.data, mime: i.mime })),
  });
}

function Wongoji({ text, max }: { text: string; max: number }) {
  const cells = Math.max(max, Math.ceil(text.length / 20) * 20);
  const chars = Array.from(text.replace(/\n/g, " "));
  return (
    <div className="wongoji" aria-hidden>
      {Array.from({ length: cells }).map((_, i) => (
        <span key={i} className={(i + 1) % 100 === 0 ? "row-end" : ""}>
          {chars[i] ?? ""}
        </span>
      ))}
    </div>
  );
}

export function TaskPrompt({ task }: { task: WritingTask }) {
  return (
    <>
      <p className="instruction">
        {task.n}. {task.instruction}
      </p>
      {task.passage && <div className="passage">{task.passage}</div>}
      {task.chart && (
        <div className="card flat" style={{ padding: 14, marginBottom: 12 }}>
          <ChartView chart={task.chart} />
        </div>
      )}
      {task.notes && (
        <div className="passage" style={{ fontSize: "0.95rem" }}>
          {task.notes.join("\n")}
        </div>
      )}
      {task.topic && <div className="passage">{task.topic}</div>}
    </>
  );
}

export function WritingTaskView({
  task,
  value,
  onChange,
  locked,
  uploadOnly,
}: {
  task: WritingTask;
  value: WritingAnswer;
  onChange: (w: WritingAnswer) => void;
  locked?: boolean;
  uploadOnly?: boolean;
}) {
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const count = Array.from(value.text).length;
  const inRange = task.minChars && task.maxChars ? count >= task.minChars && count <= task.maxChars : true;

  const addFiles = async (files: FileList | File[] | null) => {
    if (!files) return;
    setBusy(true);
    try {
      const list = Array.from(files).filter((f) => f.type.startsWith("image/")).slice(0, 4 - value.images.length);
      const imgs = await Promise.all(list.map((f) => compressImage(f)));
      onChange({ ...value, images: [...value.images, ...imgs].slice(0, 4) });
    } finally {
      setBusy(false);
    }
  };

  const mode = uploadOnly ? "photo" : value.mode;

  return (
    <div className="paper">
      <TaskPrompt task={task} />

      <div className="row between" style={{ margin: "18px 0 12px", flexWrap: "wrap", gap: 10 }}>
        <div className="seg">
          <button className={mode === "photo" ? "on" : ""} onClick={() => onChange({ ...value, mode: "photo" })}>
            📸 Daftardan rasm
          </button>
          <button className={mode === "type" ? "on" : ""} onClick={() => !uploadOnly && onChange({ ...value, mode: "type" })} disabled={uploadOnly}>
            ⌨️ Shu yerda yozish
          </button>
        </div>
        <span className="badge">
          {task.pts} ball
        </span>
      </div>

      {mode === "photo" ? (
        <div className="stack">
          <div
            className={`dropzone ${drag ? "drag" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              if (!locked || uploadOnly) addFiles(e.dataTransfer.files);
            }}
          >
            <div style={{ fontSize: "2rem" }}>📝</div>
            <p className="small" style={{ margin: "6px 0 14px", color: "var(--ink-2)" }}>
              Javobni daftarga (yoki 원고지 varag‘iga) qo‘lda yozing, so‘ng rasmga oling. AI yozuvingizni o‘qib, TOPIK mezonlari bo‘yicha baholaydi.
            </p>
            <div className="row-wrap" style={{ justifyContent: "center" }}>
              <button className="btn btn-primary btn-sm" onClick={() => camRef.current?.click()} disabled={busy || value.images.length >= 4}>
                <Icon name="camera" size={18} /> Kamera
              </button>
              <button className="btn btn-sm" onClick={() => galRef.current?.click()} disabled={busy || value.images.length >= 4}>
                <Icon name="upload" size={18} /> Fayldan
              </button>
            </div>
            <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => addFiles(e.target.files)} />
            <input ref={galRef} type="file" accept="image/*" multiple hidden onChange={(e) => addFiles(e.target.files)} />
          </div>
          {busy && (
            <div className="row small muted">
              <span className="spinner" /> Rasm tayyorlanmoqda…
            </div>
          )}
          {value.images.length > 0 && (
            <div className="thumbs">
              {value.images.map((im, i) => (
                <div className="thumb" key={i}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={im.preview} alt={`page ${i + 1}`} />
                  <button onClick={() => onChange({ ...value, images: value.images.filter((_, j) => j !== i) })} aria-label="O‘chirish">
                    <Icon name="x" size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="tiny muted">Ko‘pi bilan 4 sahifa. Yorug‘ joyda, tekis suratga oling.</div>
        </div>
      ) : task.kind === "blank" ? (
        <div className="stack">
          {(["a", "b"] as const).map((k) => (
            <label key={k} className="stack" style={{ gap: 6 }}>
              <b className="kr">{k === "a" ? "㉠" : "㉡"}</b>
              <input className="input kr" value={value[k]} disabled={locked} onChange={(e) => onChange({ ...value, [k]: e.target.value })} placeholder="..." />
            </label>
          ))}
        </div>
      ) : (
        <div className="stack">
          <textarea
            className="textarea kr"
            style={{ minHeight: task.kind === "essay" ? 260 : 180 }}
            value={value.text}
            disabled={locked}
            onChange={(e) => onChange({ ...value, text: e.target.value })}
            placeholder="Javobingizni koreys tilida yozing…"
          />
          <div className="row between">
            <span className={`badge ${inRange ? "green" : count ? "amber" : ""}`}>
              {count} / {task.minChars}~{task.maxChars} belgi
            </span>
            <span className="tiny muted">Bo‘sh joylar ham hisoblanadi (원고지 kabi)</span>
          </div>
          <Wongoji text={value.text} max={task.maxChars ?? 300} />
        </div>
      )}
    </div>
  );
}

export function WritingResultView({ task, result }: { task: WritingTask; result: WritingResult }) {
  const [showModel, setShowModel] = useState(false);
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div className="row" style={{ padding: 18, gap: 18, background: "var(--grad)", color: "#fff", flexWrap: "wrap" }}>
        <ScoreRing
          value={result.score}
          max={result.max || task.pts}
          size={110}
          label={<div className="display" style={{ fontSize: "1.5rem", fontWeight: 700 }}>{result.score}</div>}
          sub={<div className="tiny" style={{ opacity: 0.85 }}>/ {result.max || task.pts}</div>}
        />
        <div className="grow" style={{ minWidth: 200 }}>
          <div className="badge white">
            Topshiriq {task.n}
          </div>
          <div style={{ marginTop: 8, fontWeight: 600 }}>{result.summary}</div>
          {result.level_hint && <div className="small" style={{ opacity: 0.85, marginTop: 6 }}>🎯 {result.level_hint}</div>}
        </div>
      </div>
      <div className="stack" style={{ padding: 18 }}>
        <div className="grid" style={{ gap: 10 }}>
          {result.criteria.map((c) => (
            <div key={c.name}>
              <div className="row between small" style={{ fontWeight: 700 }}>
                <span className="kr">{c.name}</span>
                <span>
                  {c.score} / {c.max}
                </span>
              </div>
              <div className="bar thin" style={{ margin: "6px 0" }}>
                <i style={{ width: `${(c.score / Math.max(1, c.max)) * 100}%` }} />
              </div>
              <div className="small muted">{c.comment}</div>
            </div>
          ))}
        </div>

        {result.recognized_text && (
          <details>
            <summary className="small" style={{ fontWeight: 700, cursor: "pointer" }}>
              🔍 AI o‘qigan matn {result.char_count ? `(${result.char_count} belgi)` : ""}
            </summary>
            <div className="script-box" style={{ marginTop: 8 }}>
              {result.recognized_text}
            </div>
          </details>
        )}

        {result.strengths?.length > 0 && (
          <div>
            <div className="small" style={{ fontWeight: 800, color: "var(--green)" }}>
              💪 Kuchli tomonlar
            </div>
            <ul className="small" style={{ margin: "6px 0 0", paddingLeft: 18 }}>
              {result.strengths.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        {result.mistakes?.length > 0 && (
          <div className="stack" style={{ gap: 8 }}>
            <div className="small" style={{ fontWeight: 800, color: "var(--red)" }}>
              ✏️ Xatolar va tuzatishlar
            </div>
            {result.mistakes.map((m, i) => (
              <div key={i} className="card flat" style={{ padding: 12, borderRadius: 14 }}>
                <div className="kr small">
                  <s style={{ color: "var(--red)" }}>{m.original}</s> → <b style={{ color: "var(--green)" }}>{m.corrected}</b>
                </div>
                <div className="small muted" style={{ marginTop: 4 }}>
                  {m.explanation}
                </div>
              </div>
            ))}
          </div>
        )}

        <button className="btn btn-soft btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => setShowModel((s) => !s)}>
          <Icon name="star" size={16} /> {showModel ? "Namunani yashirish" : "Namunaviy javob (yuqori ball)"}
        </button>
        {showModel && <div className="passage">{result.model_answer}</div>}
      </div>
    </div>
  );
}
