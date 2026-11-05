"use client";

import { useEffect, useMemo, useState } from "react";
import { TOPIK1 } from "@/data/topik1";
import { TOPIK2 } from "@/data/topik2";
import { EPS } from "@/data/eps";
import { appIconUrl, imagePromptsOf, imageUrl } from "@/lib/images";
import { visualPrompts } from "@/data/visuals";
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

type ImgDiag = {
  hasKey: boolean;
  model: { model: string | null; source: "env" | "auto" | "none"; models: string[]; error?: string };
  appIcon: { ready: boolean; mime?: string; bytes?: number };
  log: { error?: { at: number; message?: string; style: string }; ok?: { at: number; style: string } };
  dir: string;
};

/** Gemini xatosini tushunarli maslahatga aylantirish */
function imageHint(msg: string): string {
  const m = msg.toLowerCase();
  if (/limit: ?0|free[_ ]tier|quota|resource_exhausted|billing/.test(m))
    return "Bu kalit bepul tarifda ishlayapti: Gemini rasm modellari bepul tarifda ishlamaydi. Google AI Studio → Billing (to‘lov) ni yoqing — har bir rasm bir necha sent turadi, barcha rasmlar bir marta chiziladi.";
  if (/api key not valid|api_key_invalid|permission|unauthenticated|401|403/.test(m)) return "Kalit noto‘g‘ri yoki ruxsati yo‘q: Dokploy → Environment’dagi GEMINI_API_KEY ni tekshiring.";
  if (/not found|404|is not supported for generatecontent/.test(m)) return "Rasm modeli topilmadi: Dokploy’da GEMINI_IMAGE_MODEL ga quyidagi ro‘yxatdagi modellardan birini yozing.";
  if (/location|region|country/.test(m)) return "Server joylashgan hududda Gemini rasm yaratishi ishlamaydi.";
  if (/kechikdi|timeout|504/.test(m)) return "Gemini javobi kechikdi — yana bir marta urinib ko‘ring.";
  return "";
}

/** Rasmlar holati va oldindan tayyorlash (birinchi o'quvchi kutib qolmasin) */
function ImageWarmup() {
  // Sayt ikonkalari 256 px, test rasmlari 512 px nusxasi bilan tayyorlanadi; ilova ikonkasi — alohida tugma bilan
  const urls = useMemo(
    () => [
      ...visualPrompts().map((p) => imageUrl(p, { style: "icon", w: 256 })),
      ...imagePromptsOf([TOPIK1, TOPIK2, EPS]).map((p) => imageUrl(p, { w: 512 })),
    ],
    []
  );
  const icons = useMemo(() => visualPrompts().length, []);
  const [st, setSt] = useState({ done: 0, failed: 0, running: false, error: "" });
  const [diag, setDiag] = useState<ImgDiag | null>(null);
  const [diagErr, setDiagErr] = useState("");
  const [icon, setIcon] = useState<{ busy: boolean; error: string; t: number }>({ busy: false, error: "", t: 0 });

  const refresh = async () => {
    try {
      setDiag(await getJson<ImgDiag>("/api/admin/images"));
      setDiagErr("");
    } catch (e) {
      setDiagErr(e instanceof Error ? e.message : String(e));
    }
  };
  useEffect(() => {
    void refresh();
  }, []);

  const drawIcon = async () => {
    setIcon((p) => ({ ...p, busy: true, error: "" }));
    try {
      const r = await fetch("/api/admin/images", { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setIcon({ busy: false, error: "", t: Date.now() });
    } catch (e) {
      setIcon({ busy: false, error: e instanceof Error ? e.message : String(e), t: 0 });
    }
    void refresh();
  };

  const run = async () => {
    let done = 0;
    let failed = 0;
    let error = "";
    let cursor = 0;
    setSt({ done, failed, running: true, error });
    const worker = async () => {
      while (cursor < urls.length) {
        const url = urls[cursor++];
        try {
          const r = await fetch(url);
          if (!r.ok) {
            failed++;
            const j = await r.json().catch(() => ({}));
            error = j?.error || `HTTP ${r.status}`;
          } else await r.arrayBuffer();
        } catch (e) {
          failed++;
          error = e instanceof Error ? e.message : String(e);
        }
        done++;
        setSt({ done, failed, running: true, error });
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    setSt({ done, failed, running: false, error });
    void refresh();
  };

  const lastError = icon.error || diag?.log.error?.message || "";
  const hint = !diag?.hasKey && diag ? "Dokploy → Environment’ga GEMINI_API_KEY qo‘yilmagan." : imageHint(lastError || diag?.model.error || "");

  return (
    <div className="card" style={{ marginTop: 18 }}>
      <h2 className="h3" style={{ marginBottom: 8 }}>🖼️ Rasmlar va ilova ikonkasi</h2>

      {diagErr && <div className="callout small">{diagErr}</div>}
      {diag && (
        <div className="stack small" style={{ gap: 4, marginBottom: 12 }}>
          <div>{diag.hasKey ? "✅" : "❌"} Gemini kaliti {diag.hasKey ? "bor" : "yo‘q"}</div>
          <div>
            {diag.model.model ? "✅" : "❌"} Rasm modeli: <b>{diag.model.model ?? "—"}</b>
            {diag.model.source === "auto" ? " (avtomatik tanlandi)" : diag.model.source === "env" ? " (GEMINI_IMAGE_MODEL)" : ""}
          </div>
          {diag.model.models.length > 0 && <div className="tiny muted">Kalitga ochiq rasm modellari: {diag.model.models.join(", ")}</div>}
          <div>
            {diag.appIcon.ready ? "✅ Ilova ikonkasi tayyor" : "⏳ Ilova ikonkasi hali chizilmagan — telefonlarda zaxira «한» ikonkasi turibdi"}
          </div>
          {diag.log.ok && <div className="tiny muted">Oxirgi chizilgan rasm: {new Date(diag.log.ok.at).toLocaleString("uz-UZ")}</div>}
        </div>
      )}

      <div className="row-wrap" style={{ alignItems: "center" }}>
        <button className="btn btn-primary btn-sm" onClick={drawIcon} disabled={icon.busy}>
          {icon.busy ? <span className="spinner white" /> : "✨"} Ilova ikonkasini chizish
        </button>
        {(icon.t > 0 || diag?.appIcon.ready) && (
          // eslint-disable-next-line @next/next/no-img-element -- ilova ikonkasi API'dan keladi
          <img src={`${appIconUrl(192)}&t=${icon.t}`} alt="Ilova ikonkasi" width={56} height={56} style={{ borderRadius: 14 }} />
        )}
      </div>
      {lastError && (
        <div className="callout small" style={{ marginTop: 10 }}>
          <b>Gemini xatosi:</b> {lastError}
          {hint && <div style={{ marginTop: 6 }}>💡 {hint}</div>}
        </div>
      )}
      {!lastError && hint && <div className="callout small" style={{ marginTop: 10 }}>💡 {hint}</div>}
      <p className="tiny muted" style={{ margin: "10px 0 0" }}>
        iPhone ikonkani «Ekranga qo‘shish» paytida saqlab qo‘yadi: Gemini ikonkasi tayyor bo‘lgach, ekrandagi HanUstoz ikonkasini o‘chirib, Safari’dan qayta «Ekranga qo‘shish» qiling. Android o‘zi yangilaydi (1–2 kun ichida).
      </p>

      <hr style={{ border: 0, borderTop: "1px dashed var(--line)", margin: "16px 0" }} />
      <p className="small muted" style={{ margin: "0 0 12px" }}>
        {`Saytda ${icons} ta ikonka va tayyor testlarda ${urls.length - icons} ta rasm bor. Gemini ularni bir marta chizadi va serverda saqlaydi (${diag?.dir ?? "/app/data/images"}).`}
      </p>
      <div className="row-wrap" style={{ alignItems: "center" }}>
        <button className="btn btn-soft btn-sm" onClick={run} disabled={st.running}>
          {st.running ? <span className="spinner" /> : "🖌️"} Barcha rasmlarni tayyorlash
        </button>
        {(st.running || st.done > 0) && (
          <span className="small">
            {`${st.done} / ${urls.length}`}
            {st.failed ? ` · xato: ${st.failed}` : ""}
          </span>
        )}
      </div>
      {st.error && st.error !== lastError && <div className="callout small" style={{ marginTop: 10 }}>{st.error}</div>}
    </div>
  );
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
    ["test_eps", "EPS-TOPIK mock test yakunlandi"],
    ["explain", "AI tushuntirish"],
    ["writing", "Yozma ishni AI baholash"],
    ["speak", "Gemini bilan suhbat (xabarlar)"],
    ["tutor", "AI Ustoz (savollar)"],
    ["generate", "AI variant so‘rovlari (1 variant ≈ 40–60)"],
    ["tts", "AI ovoz (yangi audio)"],
    ["image", "AI rasm (yangi test rasmi)"],
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

      <ImageWarmup />

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
