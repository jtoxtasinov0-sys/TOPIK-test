"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { ApiError, notifyAccess, useAiErrorText } from "@/components/ui";
import { GoogleButton, useAuth } from "@/lib/auth";
import type { Access } from "@/lib/access";
import { fmtMoney, PLANS, PRICES, REGIONS, type PlanId, type Region } from "@/lib/plans";
import { fmtDate } from "./shared";

// Obuna: hudud (O'zbekiston / Koreya) va tarif tanlanadi → shaxsiy kodli to'lov ma'lumotlari →
// kartaga o'tkazib, chek rasmini yuklab «To'ladim» bosiladi → admin tasdiqlagach AI ochiladi.

type Open = { id: string; region: Region; plan: PlanId; days: number; amount: number; promo: boolean; code: string; status: "new" | "paid"; createdAt: number; paidAt?: number; receipt: boolean };
type Card = { number: string; name: string } | null;
type PayInfo = {
  authEnabled: boolean;
  promo: { left: number; limit: number };
  available: Record<Region, boolean>;
  contact: string;
  user: { email: string } | null;
  cards?: Record<Region, Card>;
  eligible?: boolean;
  access?: Access;
  open?: Open | null;
};

async function call<T>(body: unknown): Promise<T> {
  let r: Response;
  try {
    r = await fetch("/api/pay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new ApiError("network", 0);
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    notifyAccess(r.status, j?.code);
    throw new ApiError(j?.error || `HTTP ${r.status}`, r.status, j?.code);
  }
  return j as T;
}

/** Chek rasmini kichraytiradi (eng uzun tomoni 1600 px, JPEG) — mobil internetda tez yuboriladi */
async function shrink(file: File): Promise<{ data: string; mime: string; preview: string }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, fail) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => fail(new Error("img"));
      i.src = url;
    });
    const k = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(img.naturalWidth * k));
    c.height = Math.max(1, Math.round(img.naturalHeight * k));
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    const preview = c.toDataURL("image/jpeg", 0.82);
    return { data: preview.split(",")[1] ?? "", mime: "image/jpeg", preview };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Vaqt mintaqasi Koreya bo'lsa — Koreya narxlari */
const guessRegion = (): Region => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone === "Asia/Seoul" ? "kr" : "uz";
  } catch {
    return "uz";
  }
};

function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-sm btn-soft"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        });
      }}
    >
      {done ? "✓ Nusxalandi" : "Nusxa olish"}
    </button>
  );
}

/** Chek rasmini tanlash (galereya yoki kamera) */
function ReceiptPicker({ has, onFile }: { has: boolean; onFile: (f: File | undefined) => void }) {
  return (
    <label className="btn btn-soft" style={{ alignSelf: "flex-start", cursor: "pointer", marginTop: 4 }}>
      <input type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      🧾 {has ? "Boshqa rasm tanlash" : "Chek rasmini tanlash"}
    </label>
  );
}

const contactHref = (c: string) => (c.startsWith("@") ? `https://t.me/${c.slice(1)}` : /^https?:\/\//.test(c) ? c : `https://t.me/${c}`);

export function PayView() {
  const { me, refresh } = useAuth();
  const errText = useAiErrorText();
  const [info, setInfo] = useState<PayInfo | null>(null);
  const [region, setRegion] = useState<Region>("uz");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [receipt, setReceipt] = useState<{ data: string; mime: string; preview: string } | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/pay", { cache: "no-store" })
      .then((r) => r.json() as Promise<PayInfo>)
      .then((j) => {
        if (!alive) return;
        setInfo(j);
        setRegion(j.open?.region ?? guessRegion());
      })
      .catch(() => alive && setErr("Internet aloqasini tekshiring."));
    return () => {
      alive = false;
    };
  }, []);

  const run = async (body: unknown) => {
    setBusy(true);
    setErr("");
    try {
      const r = await call<{ open: Open | null }>(body);
      setInfo((i) => (i ? { ...i, open: r.open } : i));
      return r.open;
    } catch (e) {
      setErr(errText(e));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const pick = async (plan: PlanId) => {
    if (await run({ action: "start", region, plan })) window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const submit = async () => {
    if (!info?.open) return;
    const ok = await run({ action: "submit", id: info.open.id, receipt: receipt ? { data: receipt.data, mime: receipt.mime } : undefined });
    if (ok) setReceipt(null);
    void refresh();
  };
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setErr("");
    try {
      setReceipt(await shrink(f));
    } catch {
      setErr("Rasmni ochib bo‘lmadi. Bank ilovasidagi chekning skrinshotini yuklang.");
    }
  };

  const loggedIn = !!info?.user;
  const promoOn = (info?.promo.left ?? 0) > 0 && (!loggedIn || !!info?.eligible);
  const open = info?.open ?? null;
  const a = info?.access ?? me?.access;
  const card = open ? info?.cards?.[open.region] : null;

  return (
    <main className="container page" style={{ maxWidth: 940 }}>
      <Link href="/" className="back-link">
        <Icon name="left" size={16} /> Bosh sahifa
      </Link>
      <div className="section-head">
        <span className="eyebrow">⭐ Obuna</span>
        <h1 className="h1">
          AI <span className="gradient-text">to‘liq kirish</span>
        </h1>
        <p className="lead">AI Ustoz, koreys do‘st bilan ovozli suhbat, yozma ishni AI tekshiruvi va cheksiz AI test variantlari — barchasi ochiq.</p>
      </div>

      {info && !info.authEnabled && <div className="callout info">Hisob tizimi hali sozlanmagan — hamma bo‘limlar bepul ishlaydi.</div>}

      {loggedIn && a && (
        <div className={`callout ${a.status === "expired" ? "" : "info"}`} style={{ marginBottom: 16 }}>
          {a.status === "paid"
            ? `⭐ Obunangiz faol: ${fmtDate(a.until)} gacha (${a.daysLeft} kun). Uzaytirsangiz — kunlar shu sanadan keyin qo‘shiladi.`
            : a.status === "trial"
              ? `🎁 Bepul sinov: yana ${a.daysLeft} kun. Hozir to‘lasangiz — obuna sinov tugagach boshlanadi, kunlar yo‘qolmaydi.`
              : "⏳ Bepul sinov tugagan. Obuna bo‘lsangiz, AI funksiyalari darhol (tasdiqlangach) ochiladi."}
        </div>
      )}

      {err && <div className="callout" style={{ marginBottom: 16 }}>{err}</div>}

      {/* ---------- To'lov ma'lumotlari ---------- */}
      {open && (
        <div className="card stack" style={{ gap: 14, marginBottom: 22, border: "2px solid rgba(139,61,255,.35)" }}>
          <div className="row between" style={{ flexWrap: "wrap", gap: 8 }}>
            <b className="h3">
              {REGIONS.find((r) => r.id === open.region)?.flag} {PLANS.find((p) => p.id === open.plan)?.label} — {fmtMoney(open.amount, open.region)}
            </b>
            {open.promo && <span className="badge amber">🔥 Chegirma</span>}
          </div>

          {open.status === "paid" ? (
            <>
              <div className="callout info">
                ✅ To‘lovingiz tekshirilmoqda. Odatda bir necha soat ichida ochiladi (kechasi yuborilgan bo‘lsa — ertalab). Ochilgach, bu sahifada va profilda «Obuna faol»
                yoziladi.
              </div>
              {!open.receipt && (
                <div className="stack" style={{ gap: 8 }}>
                  <b className="small">Chek rasmini qo‘shing — tezroq tasdiqlanadi</b>
                  <ReceiptPicker has={!!receipt} onFile={(f) => void onFile(f)} />
                  {receipt && (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element -- foydalanuvchi tanlagan rasm */}
                      <img src={receipt.preview} alt="Chek" style={{ maxWidth: 220, borderRadius: 12, border: "1px solid var(--line)" }} />
                      <button className="btn btn-primary" disabled={busy} onClick={() => void submit()}>
                        Chekni yuborish
                      </button>
                    </>
                  )}
                </div>
              )}
              {open.receipt && <div className="small muted">🧾 Chek rasmi yuborilgan.</div>}
            </>
          ) : !card ? (
            <div className="callout">Bu hudud uchun to‘lov hali sozlanmagan. {info?.contact ? `Admin bilan bog‘laning: ${info.contact}` : ""}</div>
          ) : (
            <>
              <ol className="pay-steps">
                <li>
                  <div className="small muted">{open.region === "uz" ? "Shu kartaga o‘tkazing (Humo / Uzcard — Click, Payme, Uzum yoki bank ilovasi):" : "Shu hisobga o‘tkazing (계좌이체 / Toss):"}</div>
                  <div className="row pay-field">
                    <b className="grow mono">{card.number}</b>
                    <CopyBtn text={card.number.replace(open.region === "uz" ? /\s/g : /^$/, "")} />
                  </div>
                  {card.name && <div className="small muted">{open.region === "uz" ? "Karta egasi" : "예금주"}: {card.name}</div>}
                </li>
                <li>
                  <div className="small muted">Aynan shu summani yuboring:</div>
                  <div className="row pay-field">
                    <b className="grow" style={{ fontSize: "1.35rem" }}>{fmtMoney(open.amount, open.region)}</b>
                    <CopyBtn text={String(open.amount)} />
                  </div>
                  {open.region === "uz" ? (
                    <div className="small">
                      Oxirgi 3 raqam <b>{open.code}</b> — sizning shaxsiy kodingiz: to‘lovingizni shu bo‘yicha topamiz. Summani yaxlitlamang.
                    </div>
                  ) : (
                    <div className="small">
                      <b>입금자명</b> (jo‘natuvchi nomi) maydoniga <b className="mono">HU{open.code}</b> deb yozing — to‘lovingizni shu bo‘yicha topamiz.
                    </div>
                  )}
                </li>
                <li>
                  <div className="small muted">To‘lov chekining rasmini (skrinshot) yuklang:</div>
                  <ReceiptPicker has={!!receipt} onFile={(f) => void onFile(f)} />
                  {receipt && (
                    // eslint-disable-next-line @next/next/no-img-element -- foydalanuvchi tanlagan rasm
                    <img src={receipt.preview} alt="Chek" style={{ maxWidth: 220, borderRadius: 12, border: "1px solid var(--line)", marginTop: 8 }} />
                  )}
                </li>
              </ol>
              <button className="btn btn-primary btn-lg btn-block" disabled={busy} onClick={() => void submit()}>
                {busy ? <span className="spinner white" style={{ width: 18, height: 18 }} /> : <Icon name="send" size={18} />} To‘ladim — tekshirishga yuborish
              </button>
              <button className="btn btn-sm" disabled={busy} onClick={() => void run({ action: "cancel", id: open.id })} style={{ alignSelf: "center" }}>
                Boshqa tarif tanlash
              </button>
            </>
          )}
          {info?.contact && (
            <div className="tiny muted" style={{ textAlign: "center" }}>
              Savol yoki muammo bo‘lsa:{" "}
              <a href={contactHref(info.contact)} target="_blank" rel="noreferrer" style={{ fontWeight: 700 }}>
                {info.contact}
              </a>
            </div>
          )}
        </div>
      )}

      {/* ---------- Tariflar ---------- */}
      <div className="row between" style={{ flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
        <div className="seg" role="group" aria-label="Hudud">
          {REGIONS.map((r) => (
            <button key={r.id} className={region === r.id ? "on" : ""} onClick={() => setRegion(r.id)} disabled={!!open}>
              {r.flag} {r.label}
            </button>
          ))}
        </div>
        {promoOn && (
          <span className="badge amber" style={{ padding: "8px 12px" }}>
            🔥 Ilk {info?.promo.limit} obunachiga chegirma — yana {info?.promo.left} ta joy
          </span>
        )}
      </div>

      <div className="grid-3">
        {PLANS.map((p) => {
          const pr = PRICES[region][p.id];
          const price = promoOn ? pr.promo : pr.price;
          const months = p.days / 30;
          return (
            <div key={p.id} className={`card stack plan-card ${p.id === "m3" ? "hot" : ""}`} style={{ gap: 10 }}>
              <div className="row between">
                <b className="h3">{p.label}</b>
                {p.badge && <span className="badge">{p.badge}</span>}
              </div>
              <div>
                <div className="display" style={{ fontSize: "1.9rem", fontWeight: 800 }}>{fmtMoney(price, region)}</div>
                {promoOn && <div className="small muted" style={{ textDecoration: "line-through" }}>{fmtMoney(pr.price, region)}</div>}
                {months > 1 && <div className="small muted">oyiga ≈ {fmtMoney(Math.round(price / months / 100) * 100, region)}</div>}
              </div>
              {loggedIn ? (
                <button className="btn btn-primary btn-block" disabled={busy || !!open || !info?.available[region]} onClick={() => void pick(p.id)}>
                  {info?.available[region] ? "Tanlash" : "Tez orada"}
                </button>
              ) : info?.authEnabled ? (
                <GoogleButton next="/pay" block label="Kirib, tanlash" />
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="grid-2" style={{ marginTop: 22 }}>
        <div className="card">
          <b>Obunaga kiradi</b>
          <ul className="check-list" style={{ marginTop: 12 }}>
            <li>AI Ustoz — yozma va ovozli (o‘zbekcha so‘rang)</li>
            <li>Koreys do‘st bilan erkin ovozli suhbat (kuniga ~20 daqiqa)</li>
            <li>Yozma ishni (쓰기) AI baholashi va tuzatishlari</li>
            <li>Cheksiz AI test variantlari, AI tushuntirishlar</li>
            <li>Tabiiy Gemini ovozi, natijalar barcha qurilmalarda</li>
          </ul>
        </div>
        <div className="card">
          <b>Qanday to‘lanadi?</b>
          <ol className="small" style={{ margin: "12px 0 0", paddingLeft: 18, display: "grid", gap: 6 }}>
            <li>Tarifni tanlang — sizga shaxsiy to‘lov kodi beriladi.</li>
            <li>Kartaga (O‘zbekiston) yoki hisobga (Koreya) o‘tkazing.</li>
            <li>Chek rasmini yuklab, «To‘ladim» ni bosing.</li>
            <li>Tekshirilgach (odatda bir necha soatda) AI ochiladi.</li>
          </ol>
          <p className="tiny muted" style={{ margin: "10px 0 0" }}>Avtomatik yechib olinmaydi: muddat tugagach, xohlasangiz o‘zingiz uzaytirasiz.</p>
        </div>
      </div>
    </main>
  );
}
