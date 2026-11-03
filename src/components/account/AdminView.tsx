"use client";

import { useEffect, useState } from "react";
import { ApiError, postJson, useAiErrorText } from "@/components/ui";
import { Avatar, useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";
import type { Access } from "@/lib/access";
import { fmtDate } from "./shared";

type AUser = { id: string; email: string; name: string; picture?: string; createdAt: number; lastLoginAt: number; access: Access };
type Stats = { total: number; new30: number; recent: AUser[] };

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "no-store" });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(j?.error || `HTTP ${r.status}`, r.status, j?.code);
  return j as T;
}

export function AdminView() {
  const { L, lang } = useLang();
  const errText = useAiErrorText();
  const { me, loading } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<{ user: AUser | null } | null>(null);
  const [days, setDays] = useState("30");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const [reload, setReload] = useState(0);
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
  }, [isAdmin, reload]);

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

  const grant = async (n: number) => {
    const u = found?.user;
    if (!u || !n) return;
    if (!window.confirm(L(`${u.email} ga ${n > 0 ? "+" : ""}${n} kun?`, `${u.email}: ${n > 0 ? "+" : ""}${n} дн.?`))) return;
    setBusy(true);
    setMsg("");
    try {
      const r = await postJson<{ user: AUser }>("/api/admin", { email: u.email, days: n });
      setFound({ user: r.user });
      setMsg(L(`Saqlandi: ${fmtDate(r.user.access.until, lang)} gacha`, `Сохранено: до ${fmtDate(r.user.access.until, lang)}`));
      setReload((x) => x + 1);
    } catch (e) {
      setMsg(errText(e));
    } finally {
      setBusy(false);
    }
  };

  const statusBadge = (a: Access) =>
    a.status === "trial" ? <span className="badge">🎁 {a.daysLeft}</span> : <span className="badge red">{L("tugagan", "истёк")}</span>;

  if (loading) return <main className="container page"><span className="spinner" /></main>;
  if (!isAdmin) {
    return (
      <main className="container page" style={{ maxWidth: 560 }}>
        <div className="card center">{L("Bu sahifa faqat administratorlar uchun (ADMIN_EMAILS).", "Эта страница только для администраторов (ADMIN_EMAILS).")}</div>
      </main>
    );
  }

  return (
    <main className="container page">
      <div className="section-head">
        <span className="eyebrow">🛠️ Admin</span>
        <h1 className="h2">{L("Foydalanuvchilar", "Пользователи")}</h1>
      </div>

      <div className="grid-2">
        {[
          [L("Jami foydalanuvchi", "Всего пользователей"), stats ? String(stats.total) : "…"],
          [L("Yangi (30 kun)", "Новые (30 дн.)"), stats ? String(stats.new30) : "…"],
        ].map(([t, v]) => (
          <div key={t} className="card">
            <div className="small muted" style={{ fontWeight: 700 }}>{t}</div>
            <div className="display" style={{ fontSize: "1.7rem", fontWeight: 700, marginTop: 6 }}>{v}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h2 className="h3" style={{ marginBottom: 12 }}>{L("Bepul sinovni uzaytirish", "Продление пробного периода")}</h2>
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            void search();
          }}
        >
          <input className="input" type="email" placeholder="email@gmail.com" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn btn-primary" disabled={busy}>{L("Qidirish", "Найти")}</button>
        </form>
        {msg && <div className="callout info" style={{ marginTop: 12 }}>{msg}</div>}
        {found && !found.user && <p className="muted">{L("Topilmadi. Foydalanuvchi avval saytga Google orqali kirishi kerak.", "Не найден. Пользователь должен сначала войти на сайт через Google.")}</p>}
        {found?.user && (
          <div className="stack" style={{ marginTop: 16, gap: 14 }}>
            <div className="row" style={{ gap: 14 }}>
              <Avatar user={found.user} size={48} />
              <div className="grow">
                <b>{found.user.name}</b> {statusBadge(found.user.access)}
                <div className="small muted">
                  {found.user.email} · {L("gacha", "до")} {fmtDate(found.user.access.until, lang)}
                </div>
              </div>
            </div>
            <div className="row-wrap">
              {[30, 90, 180].map((n) => (
                <button key={n} className="btn btn-soft btn-sm" disabled={busy} onClick={() => void grant(n)}>
                  +{n} {L("kun", "дн.")}
                </button>
              ))}
              <input className="input" style={{ width: 110, padding: "8px 12px" }} type="number" value={days} onChange={(e) => setDays(e.target.value)} aria-label={L("Kunlar", "Дни")} />
              <button className="btn btn-sm" disabled={busy} onClick={() => void grant(Math.trunc(Number(days)))}>
                {L("Qo‘llash", "Применить")}
              </button>
            </div>
            <p className="tiny muted" style={{ margin: 0 }}>
              {L("Manfiy son sinovni qisqartiradi (masalan, -30).", "Отрицательное число сокращает пробный период (например, -30).")}
            </p>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h2 className="h3" style={{ marginBottom: 10 }}>{L("So‘nggi foydalanuvchilar", "Последние пользователи")}</h2>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>{L("Holat", "Статус")}</th>
                <th>{L("Ro‘yxatdan", "Регистрация")}</th>
                <th>{L("Oxirgi kirish", "Последний вход")}</th>
              </tr>
            </thead>
            <tbody>
              {(stats?.recent ?? []).map((u) => (
                <tr key={u.id} style={{ cursor: "pointer" }} onClick={() => { setQ(u.email); void search(u.email); }}>
                  <td>{u.email}</td>
                  <td>{statusBadge(u.access)}</td>
                  <td>{fmtDate(u.createdAt, lang)}</td>
                  <td>{fmtDate(u.lastLoginAt, lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
