"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { compressImage, useAiErrorText } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { LOGO_BRIEF, MAX_LOGO_IMAGES, MAX_LOGO_VARIANTS } from "@/lib/logo";

type Ref = { data: string; mime: string; preview: string };
type Result = { data?: string; mime?: string; error?: string };

/** Admin: namuna rasmlar yuklab, Gemini'da logo variantlarini chizdirish */
export function LogoStudio() {
  const { me, loading } = useAuth();
  const errText = useAiErrorText();
  const [refs, setRefs] = useState<Ref[]>([]);
  const [brief, setBrief] = useState(LOGO_BRIEF);
  const [count, setCount] = useState(MAX_LOGO_VARIANTS);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [big, setBig] = useState<string | null>(null);

  if (loading) return <main className="container page"><span className="spinner" /></main>;
  if (!me?.admin)
    return (
      <main className="container page">
        <div className="card center">Bu sahifa faqat administratorlar uchun (ADMIN_EMAILS).</div>
      </main>
    );

  const add = async (files: FileList | null) => {
    if (!files) return;
    const list = Array.from(files).slice(0, MAX_LOGO_IMAGES - refs.length);
    const imgs = await Promise.all(list.map((f) => compressImage(f, 1024, 0.88)));
    setRefs((r) => [...r, ...imgs].slice(0, MAX_LOGO_IMAGES));
  };

  const run = async () => {
    setBusy(true);
    setErr("");
    setResults([]);
    try {
      const r = await fetch("/api/admin/logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief, count, images: refs.map(({ data, mime }) => ({ data, mime })) }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setResults(j.results ?? []);
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(false);
    }
  };

  const src = (x: Result) => `data:${x.mime};base64,${x.data}`;

  return (
    <main className="container page">
      <Link href="/admin" className="btn btn-ghost btn-sm" style={{ paddingLeft: 6, marginBottom: 10 }}>
        <Icon name="left" size={18} /> Admin
      </Link>
      <div className="section-head">
        <span className="eyebrow">🎨 Logo studiyasi</span>
        <h1 className="h1">
          Gemini bilan <span className="gradient-text">logo chizish</span>
        </h1>
        <p className="lead">
          Yoqqan logolaringiz rasmini (Pinterest skrinshotlari) yuklang — Gemini ulardan faqat uslubni olib, HanUstoz uchun bizning ranglarda o‘ziga xos variantlar chizadi. Har bir variant boshqa g‘oya bilan chiziladi.
        </p>
      </div>

      <div className="card stack">
        <b>1. Namuna rasmlar ({refs.length}/{MAX_LOGO_IMAGES})</b>
        <div className="row-wrap" style={{ gap: 10 }}>
          {refs.map((r, i) => (
            <div key={i} style={{ position: "relative" }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- yuklangan namuna */}
              <img src={r.preview} alt="" width={96} height={96} style={{ objectFit: "cover", borderRadius: 14, border: "1px solid var(--line)" }} />
              <button
                className="icon-btn sm"
                style={{ position: "absolute", top: -8, right: -8 }}
                onClick={() => setRefs((x) => x.filter((_, k) => k !== i))}
                aria-label="Olib tashlash"
              >
                <Icon name="x" size={14} />
              </button>
            </div>
          ))}
          {refs.length < MAX_LOGO_IMAGES && (
            <label className="btn btn-soft" style={{ cursor: "pointer" }}>
              📷 Rasm qo‘shish
              <input type="file" accept="image/*" multiple hidden onChange={(e) => void add(e.target.files)} />
            </label>
          )}
        </div>
        <span className="small muted">Rasmsiz ham ishlaydi — unda Gemini faqat topshiriq bo‘yicha chizadi.</span>
      </div>

      <div className="card stack" style={{ marginTop: 16 }}>
        <b>2. Topshiriq (inglizcha — Gemini shunday yaxshiroq tushunadi)</b>
        <textarea className="input" rows={9} value={brief} onChange={(e) => setBrief(e.target.value)} style={{ fontSize: "0.85rem", lineHeight: 1.45 }} />
        <div className="row-wrap" style={{ alignItems: "center" }}>
          <span className="small">Variantlar soni:</span>
          {[1, 2, 3, 4].map((n) => (
            <button key={n} className={`chip ${count === n ? "active" : ""}`} onClick={() => setCount(n)}>
              {n}
            </button>
          ))}
          <button className="btn btn-ghost btn-sm" onClick={() => setBrief(LOGO_BRIEF)}>
            Asl matnga qaytarish
          </button>
        </div>
      </div>

      <div className="row-wrap" style={{ marginTop: 16, alignItems: "center" }}>
        <button className="btn btn-primary btn-lg" onClick={run} disabled={busy}>
          {busy ? <span className="spinner white" /> : "✨"} Gemini bilan chizish
        </button>
        {busy && <span className="small muted">Gemini chizmoqda… 20–40 soniya</span>}
      </div>
      {err && <div className="callout" style={{ marginTop: 12 }}>{err}</div>}

      {results.length > 0 && (
        <div className="grid-2" style={{ marginTop: 20 }}>
          {results.map((x, i) => (
            <div key={i} className="card stack" style={{ gap: 10 }}>
              <b>Variant {i + 1}</b>
              {x.data ? (
                <>
                  <button onClick={() => setBig(src(x))} style={{ border: 0, padding: 0, background: "none", cursor: "zoom-in" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- Gemini natijasi */}
                    <img src={src(x)} alt={`Variant ${i + 1}`} style={{ width: "100%", borderRadius: 16, display: "block" }} />
                  </button>
                  <a className="btn btn-soft btn-sm" href={src(x)} download={`hanustoz-logo-${i + 1}.${x.mime === "image/jpeg" ? "jpg" : "png"}`} style={{ alignSelf: "flex-start" }}>
                    ⬇️ Yuklab olish
                  </a>
                </>
              ) : (
                <div className="callout small">{x.error}</div>
              )}
            </div>
          ))}
        </div>
      )}
      {results.some((x) => x.data) && (
        <p className="small muted" style={{ marginTop: 12 }}>
          Yoqqan variantni yuklab olib, Claude’ga yuboring — u uni vektor (SVG) logoga aylantirib, ilova ikonkasi va reklama fayllarini tayyorlaydi.
        </p>
      )}

      {big && (
        <div
          onClick={() => setBig(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(10,6,30,.8)", zIndex: 100, display: "grid", placeItems: "center", padding: 20, cursor: "zoom-out" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- kattalashtirilgan natija */}
          <img src={big} alt="" style={{ maxWidth: "100%", maxHeight: "90dvh", borderRadius: 18 }} />
        </div>
      )}
    </main>
  );
}
