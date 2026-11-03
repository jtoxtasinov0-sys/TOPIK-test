"use client";

import { useEffect, useState } from "react";
import { ApiError, useAiErrorText } from "@/components/ui";
import { Avatar, useAuth } from "@/lib/auth";
import type { Access } from "@/lib/access";
import { fmtDate } from "./shared";

type AUser = { id: string; email: string; name: string; picture?: string; createdAt: number; lastLoginAt: number; access: Access };
type Totals = Record<string, number | undefined>;
type Stats = { total: number; new30: number; recent: AUser[]; usage?: { today: Totals; week: Totals; month: Totals } };

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "no-store" });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(j?.error || `HTTP ${r.status}`, r.status, j?.code);
  return j as T;
}

export function AdminView() {
  const errText = useAiErrorText();
  const { me, loading } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<{ user: AUser | null } | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const isAdmin = !!me?.admin;

  useEffect(() => {
    if (!isAdmin) return;
    let alive = true;
    getJson<Stats>("/api/admin")
      .then((s) => alive && setStats(s))
      .catch((e: unknown) => alive && setMsg(e instanceof Error ? e.message : String(e)));
    return () => {
      alive = false;
    };
  }, [isAdmin]);

  const search = async (email = q) => {
    if (!email.trim()) return;
    setMsg("");
    setBusy(true);
    try {
      setFound(await getJson<{ user: AUser | null }>(`/api/admin?q=${encodeURIComponent(email.trim())}`));
    } catch (e) {
      setMsg(errText(e));
    } finally {
      setBusy(false);
    }
  };

  // Statistika qatorlari: kalit serverdagi USAGE_EVENTS bilan bir xil
  const usageRows: [string, string][] = [
    ["test_topik1", "TOPIK I mock test yakunlandi"],
    ["test_topik2", "TOPIK II mock test yakunlandi"],
    ["explain", "AI tushuntirish"],
    ["writing", "Yozma ishni AI baholash"],
    ["speak", "Gemini bilan suhbat (xabarlar)"],
    ["tutor", "AI Ustoz (savollar)"],
    ["generate", "AI variant so‘rovlari (1 variant ≈ 40–60)"],
    ["tts", "AI ovoz (yangi audio)"],
    ["need_login", "Kirmasdan AI funksiyasini bosgan"],
    ["trial_over", "Sinovi tugab, AI funksiyasini bosgan"],
  ];

  const statusBadge = (a: Access) =>
    a.status === "trial" ? <span className="badge">🎁 {a.daysLeft}</span> : <span className="badge red">tugagan</span>;

  if (loading) return <main className="container page"><span className="spinner" /></main>;
  if (!isAdmin) {
    return (
      <main className="container page" style={{ maxWidth: 560 }}>
        <div className="card center">Bu sahifa faqat administratorlar uchun (ADMIN_EMAILS).</div>
      </main>
    );
  }

  return (
    <main className="container page">
      <div className="section-head">
        <span className="eyebrow">🛠️ Admin</span>
        <h1 className="h2">Foydalanuvchilar</h1>
      </div>

      <div className="grid-2">
        {[
          ["Jami foydalanuvchi", stats ? String(stats.total) : "…"],
          ["Yangi (30 kun)", stats ? String(stats.new30) : "…"],
        ].map(([t, v]) => (
          <div key={t} className="card">
            <div className="small muted" style={{ fontWeight: 700 }}>{t}</div>
            <div className="display" style={{ fontSize: "1.7rem", fontWeight: 700, marginTop: 6 }}>{v}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h2 className="h3" style={{ marginBottom: 10 }}>Faollik</h2>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th />
                <th>Bugun</th>
                <th>7 kun</th>
                <th>30 kun</th>
              </tr>
            </thead>
            <tbody>
              {usageRows.map(([k, label]) => (
                <tr key={k} style={k === "trial_over" ? { fontWeight: 800 } : undefined}>
                  <td>{label}</td>
                  <td>{stats?.usage?.today[k] ?? 0}</td>
                  <td>{stats?.usage?.week[k] ?? 0}</td>
                  <td>{stats?.usage?.month[k] ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="tiny muted" style={{ margin: "10px 0 0" }}>
          «Sinovi tugab, AI funksiyasini bosgan» — to‘lov ulanganda pul to‘lashga tayyor odamlar soni haqida eng muhim ko‘rsatkich. Faqat sonlar saqlanadi, shaxsiy ma’lumot emas.
        </p>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h2 className="h3" style={{ marginBottom: 12 }}>Foydalanuvchini qidirish</h2>
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            void search();
          }}
        >
          <input className="input" type="email" placeholder="email@gmail.com" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn btn-primary" disabled={busy}>Qidirish</button>
        </form>
        {msg && <div className="callout info" style={{ marginTop: 12 }}>{msg}</div>}
        {found && !found.user && <p className="muted">Topilmadi. Foydalanuvchi avval saytga Google orqali kirishi kerak.</p>}
        {found?.user && (
          <div className="row" style={{ marginTop: 16, gap: 14 }}>
            <Avatar user={found.user} size={48} />
            <div className="grow">
              <b>{found.user.name}</b> {statusBadge(found.user.access)}
              <div className="small muted">
                {found.user.email} · sinov {fmtDate(found.user.access.until)} gacha
              </div>
              <div className="tiny muted">
                Ro‘yxatdan: {fmtDate(found.user.createdAt)} · Oxirgi kirish: {fmtDate(found.user.lastLoginAt)}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h2 className="h3" style={{ marginBottom: 10 }}>So‘nggi foydalanuvchilar</h2>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Holat</th>
                <th>Ro‘yxatdan</th>
                <th>Oxirgi kirish</th>
              </tr>
            </thead>
            <tbody>
              {(stats?.recent ?? []).map((u) => (
                <tr key={u.id} style={{ cursor: "pointer" }} onClick={() => { setQ(u.email); void search(u.email); }}>
                  <td>{u.email}</td>
                  <td>{statusBadge(u.access)}</td>
                  <td>{fmtDate(u.createdAt)}</td>
                  <td>{fmtDate(u.lastLoginAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
