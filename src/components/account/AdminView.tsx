"use client";

import { useEffect, useState } from "react";
import { ApiError, useAiErrorText } from "@/components/ui";
import { Avatar, useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";
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
  const { L, lang } = useLang();
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
    ["test_topik1", L("TOPIK I mock test yakunlandi", "Пройден пробный TOPIK I")],
    ["test_topik2", L("TOPIK II mock test yakunlandi", "Пройден пробный TOPIK II")],
    ["explain", L("AI tushuntirish", "AI-объяснение")],
    ["writing", L("Yozma ishni AI baholash", "AI-оценка письма")],
    ["speak", L("Gemini bilan suhbat (xabarlar)", "Разговор с Gemini (реплики)")],
    ["tutor", L("AI Ustoz (savollar)", "AI Учитель (вопросы)")],
    ["generate", L("AI variant so‘rovlari (1 variant ≈ 40–60)", "Запросы AI-вариантов (1 вариант ≈ 40–60)")],
    ["tts", L("AI ovoz (yangi audio)", "AI-голос (новое аудио)")],
    ["need_login", L("Kirmasdan AI funksiyasini bosgan", "Нажали AI-функцию без входа")],
    ["trial_over", L("Sinovi tugab, AI funksiyasini bosgan", "Пробный период истёк, но нажали AI-функцию")],
  ];

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
        <h2 className="h3" style={{ marginBottom: 10 }}>{L("Faollik", "Активность")}</h2>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th />
                <th>{L("Bugun", "Сегодня")}</th>
                <th>{L("7 kun", "7 дн.")}</th>
                <th>{L("30 kun", "30 дн.")}</th>
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
          {L(
            "«Sinovi tugab, AI funksiyasini bosgan» — to‘lov ulanganda pul to‘lashga tayyor odamlar soni haqida eng muhim ko‘rsatkich. Faqat sonlar saqlanadi, shaxsiy ma’lumot emas.",
            "«Пробный период истёк, но нажали AI-функцию» — главный показатель того, сколько людей готовы платить, когда появится оплата. Хранятся только числа, без личных данных."
          )}
        </p>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h2 className="h3" style={{ marginBottom: 12 }}>{L("Foydalanuvchini qidirish", "Поиск пользователя")}</h2>
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
          <div className="row" style={{ marginTop: 16, gap: 14 }}>
            <Avatar user={found.user} size={48} />
            <div className="grow">
              <b>{found.user.name}</b> {statusBadge(found.user.access)}
              <div className="small muted">
                {found.user.email} · {L("sinov", "пробный период до")} {fmtDate(found.user.access.until, lang)} {L("gacha", "")}
              </div>
              <div className="tiny muted">
                {L("Ro‘yxatdan:", "Регистрация:")} {fmtDate(found.user.createdAt, lang)} · {L("Oxirgi kirish:", "Последний вход:")} {fmtDate(found.user.lastLoginAt, lang)}
              </div>
            </div>
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
