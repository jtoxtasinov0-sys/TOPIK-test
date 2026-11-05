"use client";

import Link from "next/link";
import { Icon } from "@/components/Icon";
import { EXAM_INFO, type ExamId, type HistoryItem, SECTION_LABEL, type SectionId } from "@/lib/exam";
import { daysUntil, DEFAULT_PROFILE, KEYS, type Profile, useStored } from "@/lib/store";

function Trend({ items }: { items: HistoryItem[] }) {
  const pts = [...items].reverse().slice(-12);
  if (pts.length < 2) return null;
  const W = 600;
  const H = 160;
  const xs = (i: number) => 20 + (i * (W - 40)) / (pts.length - 1);
  const ys = (h: HistoryItem) => H - 24 - (h.total / h.max) * (H - 48);
  const d = pts.map((h, i) => `${i ? "L" : "M"}${xs(i)},${ys(h)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
      <defs>
        <linearGradient id="tr" x1="0" x2="1">
          <stop offset="0" stopColor="#8b3dff" />
          <stop offset="1" stopColor="#3a86ff" />
        </linearGradient>
        <linearGradient id="trf" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="rgba(139,61,255,.25)" />
          <stop offset="1" stopColor="rgba(139,61,255,0)" />
        </linearGradient>
      </defs>
      <path d={`${d} L${xs(pts.length - 1)},${H - 24} L${xs(0)},${H - 24} Z`} fill="url(#trf)" />
      <path d={d} fill="none" stroke="url(#tr)" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((h, i) => (
        <g key={h.id}>
          <circle cx={xs(i)} cy={ys(h)} r={6} fill="#fff" stroke="#8b3dff" strokeWidth={3} />
          <text x={xs(i)} y={ys(h) - 12} textAnchor="middle" fontSize={12} fontWeight={800} fill="#160f3b">
            {h.total}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function ProgressPage() {
  const [history, setHistory] = useStored<HistoryItem[]>(KEYS.history, []);
  const [profile, setProfile] = useStored<Profile>(KEYS.profile, DEFAULT_PROFILE);
  const done = history.filter((h) => h.total > 0 || Object.keys(h.sections).length);
  const days = daysUntil(profile.examDate);
  const best = (exam: ExamId) => done.filter((h) => h.exam === exam).sort((a, b) => b.total - a.total)[0];

  return (
    <main className="container page">
      <div className="section-head">
        <span className="eyebrow">📈 Natijalarim</span>
        <h1 className="h1">
          Sizning{" "}
          <span className="gradient-text">progressingiz</span>
        </h1>
        <p className="lead small">Ma’lumotlar faqat shu qurilmada saqlanadi.</p>
      </div>

      <div className="grid-2">
        <div className="card stack">
          <b>🎯 Maqsad va imtihon sanasi</b>
          <input className="input" placeholder="Ismingiz" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
          <input className="input" type="date" value={profile.examDate} onChange={(e) => setProfile({ ...profile, examDate: e.target.value })} />
          <select className="select" value={profile.target} onChange={(e) => setProfile({ ...profile, target: e.target.value })}>
            <option value="">Maqsad daraja</option>
            {["1급", "2급", "3급", "4급", "5급", "6급"].map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          {days !== null && (
            <div className="badge" style={{ alignSelf: "flex-start" }}>
              ⏳ {days > 0 ? `Imtihongacha ${days} kun` : "Imtihon kuni o‘tdi"}
            </div>
          )}
        </div>
        {(["topik1", "topik2", "eps"] as const).map((ex) => {
          const b = best(ex);
          return (
            <div
              key={ex}
              className={`level-card ${ex === "topik2" ? "violet" : ""}`}
              style={ex === "eps" ? { background: "var(--grad-sun)" } : undefined}
            >
              <div className="small" style={{ fontWeight: 800, opacity: 0.9 }}>
                🏆 {EXAM_INFO[ex].name} · eng yaxshi
              </div>
              {b ? (
                <>
                  <div className="kr" style={{ fontSize: "2.6rem", fontWeight: 800 }}>{b.level ?? "—"}</div>
                  <div className="small">
                    {b.total} / {b.max}
                    {b.estimated ? "*" : ""} · {new Date(b.date).toLocaleDateString("uz-UZ")}
                  </div>
                </>
              ) : (
                <Link href={`/test/${ex}`} className="btn btn-white btn-sm" style={{ marginTop: 18 }}>
                  Topshirish →
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {done.length >= 2 && (
        <div className="card" style={{ marginTop: 18 }}>
          <b>Ball dinamikasi</b>
          <Trend items={done} />
        </div>
      )}

      <div className="card" style={{ marginTop: 18 }}>
        <div className="row between" style={{ marginBottom: 10 }}>
          <b>Tarix</b>
          {done.length > 0 && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => window.confirm("Tarixni tozalaysizmi?") && setHistory([])}
            >
              <Icon name="x" size={16} /> Tozalash
            </button>
          )}
        </div>
        {done.length === 0 ? (
          <div className="empty">
            <div style={{ fontSize: "2.4rem" }}>📝</div>
            <p>Hali natija yo‘q. Birinchi testni topshiring!</p>
            <Link href="/test" className="btn btn-primary">
              Testlar
            </Link>
          </div>
        ) : (
          <div className="stack" style={{ gap: 0 }}>
            {done.map((h) => (
              <div key={h.id} className="row" style={{ padding: "12px 0", borderTop: "1px dashed var(--line)", flexWrap: "wrap" }}>
                <span className="badge dark kr" style={{ minWidth: 52, justifyContent: "center" }}>{h.level ?? "—"}</span>
                <div className="grow" style={{ minWidth: 160 }}>
                  <b className="small">{h.title}</b>
                  <div className="tiny muted">
                    {new Date(h.date).toLocaleString("uz-UZ")} · {h.mode === "exam" ? "imtihon" : "mashq"}
                  </div>
                </div>
                <div className="row-wrap" style={{ gap: 6 }}>
                  {(Object.entries(h.sections) as [SectionId, { score: number; max: number }][]).map(([k, v]) => (
                    <span key={k} className="chip" style={{ padding: "4px 10px", fontSize: ".8rem" }}>
                      <span className="kr">{SECTION_LABEL[k].ko}</span> {v.score}/{v.max}
                    </span>
                  ))}
                </div>
                <b className="display">
                  {h.total}
                  <span className="muted small">/{h.max}</span>
                  {h.estimated ? "*" : ""}
                </b>
              </div>
            ))}
          </div>
        )}
        {done.some((h) => h.estimated) && <div className="tiny muted" style={{ marginTop: 8 }}>* taxminiy ball</div>}
      </div>
    </main>
  );
}
