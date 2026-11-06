"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, useAiErrorText } from "@/components/ui";
import { fmtMoney, PLANS, REGIONS, type PlanId, type Region } from "@/lib/plans";
import { fmtDate } from "./shared";

// Admin: obuna to'lovlarini tekshirish (chek rasmi bilan), tasdiqlash / rad etish, qo'lda berish va PDF hisobot.

type Pay = {
  id: string;
  email: string;
  region: Region;
  plan: PlanId;
  days: number;
  amount: number;
  promo: boolean;
  code: string;
  status: "new" | "paid" | "approved" | "rejected" | "cancelled";
  createdAt: number;
  paidAt?: number;
  doneAt?: number;
  until?: number;
  receipt?: string;
  manual?: boolean;
  note?: string;
};
type Data = {
  pending: Pay[];
  waiting: Pay[];
  done: Pay[];
  stats: { paidUsers: number; promoLeft: number; revenue30: Record<Region, number>; approved30: number };
  config: { uz: boolean; kr: boolean; contact: boolean; telegram: boolean };
};

const flag = (r: Region) => REGIONS.find((x) => x.id === r)?.flag ?? "";
const planName = (p: Pay) => (p.manual ? `${p.days} kun (qo‘lda)` : (PLANS.find((x) => x.id === p.plan)?.label ?? p.plan));
const codeOf = (p: Pay) => (!p.code ? "" : p.region === "uz" ? `kod ${p.code}` : `입금자명 HU${p.code}`);
const ago = (ms: number) => {
  const m = Math.round((Date.now() - ms) / 60_000);
  return m < 60 ? `${m} daq. oldin` : m < 1440 ? `${Math.round(m / 60)} soat oldin` : fmtDate(ms);
};

/** Toshkent bo'yicha YYYY-MM-DD */
const ymd = (ms: number) => new Date(ms + 5 * 3_600_000).toISOString().slice(0, 10);
function presets() {
  const now = new Date(Date.now() + 5 * 3_600_000);
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const first = (yy: number, mm: number) => new Date(Date.UTC(yy, mm, 1)).toISOString().slice(0, 10);
  const last = (yy: number, mm: number) => new Date(Date.UTC(yy, mm + 1, 0)).toISOString().slice(0, 10);
  return [
    { label: "Bu oy", from: first(y, m), to: ymd(Date.now()) },
    { label: "O‘tgan oy", from: first(y, m - 1), to: last(y, m - 1) },
    { label: "30 kun", from: ymd(Date.now() - 29 * 86_400_000), to: ymd(Date.now()) },
    { label: "Bu yil", from: `${y}-01-01`, to: ymd(Date.now()) },
  ];
}

async function api<T>(body?: unknown): Promise<T> {
  const r = await fetch("/api/admin/payments", body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : { cache: "no-store" });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(j?.error || `HTTP ${r.status}`, r.status, j?.code);
  return j as T;
}

function PayRow({ p, onAction, busy }: { p: Pay; onAction: (a: "approve" | "reject", p: Pay) => void; busy: boolean }) {
  return (
    <div className="pay-row">
      {p.receipt ? (
        <a href={`/api/admin/receipt?id=${p.id}`} target="_blank" rel="noreferrer" className="pay-receipt" title="Chekni ochish">
          {/* eslint-disable-next-line @next/next/no-img-element -- admin uchun chek rasmi */}
          <img src={`/api/admin/receipt?id=${p.id}`} alt="Chek" loading="lazy" />
        </a>
      ) : (
        <span className="pay-receipt empty">chek yo‘q</span>
      )}
      <div className="grow" style={{ minWidth: 0 }}>
        <b style={{ overflowWrap: "anywhere" }}>{p.email}</b>
        <div className="small">
          {flag(p.region)} {planName(p)} · <b>{fmtMoney(p.amount, p.region)}</b> {p.promo && <span className="badge amber">chegirma</span>}
        </div>
        <div className="tiny muted">
          {codeOf(p)} · {p.status === "paid" ? `«To‘ladim»: ${ago(p.paidAt ?? p.createdAt)}` : `kod olingan: ${ago(p.createdAt)}`}
        </div>
      </div>
      <div className="stack" style={{ gap: 6 }}>
        <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => onAction("approve", p)}>
          ✅ Tasdiqlash
        </button>
        <button className="btn btn-sm" disabled={busy} onClick={() => onAction("reject", p)}>
          ✖ Rad etish
        </button>
      </div>
    </div>
  );
}

export function AdminPayments() {
  const errText = useAiErrorText();
  const [data, setData] = useState<Data | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [showWaiting, setShowWaiting] = useState(false);
  const [grant, setGrant] = useState({ email: "", days: 30, note: "" });
  const [range, setRange] = useState(() => presets()[0]);

  const reload = useCallback(async () => {
    try {
      setData(await api<Data>());
    } catch (e) {
      setMsg(errText(e));
    }
  }, [errText]);
  useEffect(() => {
    let alive = true;
    api<Data>()
      .then((d) => alive && setData(d))
      .catch((e: unknown) => alive && setMsg(e instanceof Error ? e.message : String(e)));
    return () => {
      alive = false;
    };
  }, []);

  const act = async (action: "approve" | "reject", p: Pay) => {
    let note = "";
    if (action === "approve" && !window.confirm(`${p.email}\n${fmtMoney(p.amount, p.region)} — pul kelganini bank ilovasida tekshirdingizmi?\n\n${planName(p)} obuna ochiladi.`)) return;
    if (action === "reject") {
      const n = window.prompt("Rad etish sababi (ixtiyoriy):", "Pul kelmadi");
      if (n === null) return;
      note = n;
    }
    setBusy(true);
    setMsg("");
    try {
      await api({ action, id: p.id, note });
      setMsg(action === "approve" ? `✅ ${p.email} — obuna ochildi` : `✖ ${p.email} — rad etildi`);
      await reload();
    } catch (e) {
      setMsg(errText(e));
    } finally {
      setBusy(false);
    }
  };

  const give = async () => {
    if (!grant.email.trim()) return;
    setBusy(true);
    setMsg("");
    try {
      const r = await api<{ payment: Pay }>({ action: "grant", email: grant.email.trim(), days: grant.days, note: grant.note });
      setMsg(`✅ ${r.payment.email} — ${grant.days} kun berildi (${fmtDate(r.payment.until)} gacha)`);
      setGrant({ email: "", days: 30, note: "" });
      await reload();
    } catch (e) {
      setMsg(errText(e));
    } finally {
      setBusy(false);
    }
  };

  const s = data?.stats;
  const cfg = data?.config;
  const missing = cfg
    ? [!cfg.uz && "PAY_UZ_CARD (O‘zbekiston kartasi)", !cfg.kr && "PAY_KR_ACCOUNT (Koreya hisobi)", !cfg.contact && "PAY_CONTACT (Telegram)"].filter(Boolean)
    : [];

  return (
    <div className="card" style={{ marginTop: 18 }}>
      <div className="row between" style={{ flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <h2 className="h3">💳 To‘lovlar</h2>
        <button className="btn btn-sm btn-soft" onClick={() => void reload()} disabled={busy}>
          Yangilash
        </button>
      </div>

      <div className="grid-4" style={{ gap: 10 }}>
        {[
          ["Tekshirish kutilmoqda", data ? String(data.pending.length) : "…"],
          ["To‘lagan foydalanuvchilar", s ? String(s.paidUsers) : "…"],
          ["Chegirma qoldi", s ? `${s.promoLeft} / 100` : "…"],
          ["Tushum (30 kun)", s ? `${fmtMoney(s.revenue30.uz, "uz")} · ${fmtMoney(s.revenue30.kr, "kr")}` : "…"],
        ].map(([t, v]) => (
          <div key={t} className="card flat" style={{ padding: 12 }}>
            <div className="tiny muted" style={{ fontWeight: 700 }}>{t}</div>
            <div style={{ fontWeight: 800, marginTop: 4 }}>{v}</div>
          </div>
        ))}
      </div>

      {missing.length > 0 && (
        <div className="callout small" style={{ marginTop: 12 }}>
          Sozlanmagan: {missing.join(", ")}. Dokploy → Environment’ga qo‘shing (README’ga qarang).
        </div>
      )}
      {cfg && !cfg.telegram && (
        <div className="tiny muted" style={{ marginTop: 8 }}>
          💡 TELEGRAM_BOT_TOKEN va TELEGRAM_CHAT_ID qo‘shsangiz, har bir «To‘ladim» haqida Telegram’ga xabar keladi.
        </div>
      )}
      {msg && <div className="callout info small" style={{ marginTop: 12 }}>{msg}</div>}

      <h3 className="small" style={{ margin: "18px 0 8px", fontWeight: 800 }}>Tekshiriladigan to‘lovlar</h3>
      {data && !data.pending.length && <p className="small muted" style={{ margin: 0 }}>Hozircha yo‘q.</p>}
      <div className="stack" style={{ gap: 10 }}>
        {data?.pending.map((p) => <PayRow key={p.id} p={p} onAction={act} busy={busy} />)}
      </div>

      {!!data?.waiting.length && (
        <>
          <button className="btn btn-sm" style={{ marginTop: 12 }} onClick={() => setShowWaiting((v) => !v)}>
            {showWaiting ? "▾" : "▸"} Kod olgan, lekin «To‘ladim» bosmaganlar ({data.waiting.length})
          </button>
          {showWaiting && (
            <div className="stack" style={{ gap: 10, marginTop: 10 }}>
              <p className="tiny muted" style={{ margin: 0 }}>Pul tushgan-u, tugmani bosishni unutgan bo‘lsa — shu yerdan tasdiqlang (summa yoki kod bo‘yicha toping).</p>
              {data.waiting.map((p) => <PayRow key={p.id} p={p} onAction={act} busy={busy} />)}
            </div>
          )}
        </>
      )}

      <div className="grid-2" style={{ marginTop: 20, gap: 14 }}>
        <div className="card flat" style={{ padding: 14 }}>
          <b className="small">📄 Hisobot (PDF)</b>
          <div className="row-wrap" style={{ gap: 6, margin: "10px 0" }}>
            {presets().map((p) => (
              <button key={p.label} className={`chip ${range.label === p.label ? "active" : ""}`} onClick={() => setRange(p)}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="row" style={{ gap: 8 }}>
            <input className="input" type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, label: "", from: e.target.value }))} />
            <input className="input" type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, label: "", to: e.target.value }))} />
          </div>
          <a className="btn btn-primary btn-block" style={{ marginTop: 10 }} href={`/api/admin/report?from=${range.from}&to=${range.to}`} download>
            PDF yuklab olish
          </a>
        </div>

        <div className="card flat" style={{ padding: 14 }}>
          <b className="small">🎁 Qo‘lda obuna berish</b>
          <div className="tiny muted" style={{ margin: "4px 0 10px" }}>Sovg‘a, naqd to‘lov yoki tuzatish uchun — tushumga kirmaydi.</div>
          <form
            className="stack"
            style={{ gap: 8 }}
            onSubmit={(e) => {
              e.preventDefault();
              void give();
            }}
          >
            <input className="input" type="email" placeholder="email@gmail.com" value={grant.email} onChange={(e) => setGrant((g) => ({ ...g, email: e.target.value }))} />
            <div className="row" style={{ gap: 8 }}>
              <select className="input" value={grant.days} onChange={(e) => setGrant((g) => ({ ...g, days: Number(e.target.value) }))}>
                {[7, 30, 90, 180].map((d) => (
                  <option key={d} value={d}>
                    {d} kun
                  </option>
                ))}
              </select>
              <input className="input" placeholder="Izoh" value={grant.note} onChange={(e) => setGrant((g) => ({ ...g, note: e.target.value }))} />
            </div>
            <button className="btn btn-soft" disabled={busy || !grant.email.trim()}>
              Berish
            </button>
          </form>
        </div>
      </div>

      {!!data?.done.length && (
        <>
          <h3 className="small" style={{ margin: "20px 0 8px", fontWeight: 800 }}>So‘nggi natijalar</h3>
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Tarif</th>
                  <th>Summa</th>
                  <th>Holat</th>
                  <th>Sana</th>
                </tr>
              </thead>
              <tbody>
                {data.done.map((p) => (
                  <tr key={p.id}>
                    <td>{p.email}</td>
                    <td>
                      {flag(p.region)} {planName(p)}
                    </td>
                    <td>{p.manual ? "—" : fmtMoney(p.amount, p.region)}</td>
                    <td>{p.status === "approved" ? <span className="badge">✅ {fmtDate(p.until)} gacha</span> : <span className="badge red" title={p.note}>rad etildi</span>}</td>
                    <td>{fmtDate(p.doneAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
