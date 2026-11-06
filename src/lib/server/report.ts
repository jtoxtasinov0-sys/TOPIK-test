import "server-only";
import { PLANS, PROMO_LIMIT, type Region } from "@/lib/plans";
import { krDepositName, revenueOf, type Payment } from "./payments";
import { A4, Pdf } from "./pdf";

// To'lovlar hisoboti (PDF): davr, jami tushum, tariflar, chegirma va har bir to'lov.
// Vaqtlar — Toshkent vaqti (UTC+5).

const TZ_MS = 5 * 3_600_000;
const pad = (n: number) => String(n).padStart(2, "0");
/** 06.11.2026 14:05 (Toshkent) */
export function fmtTime(ms: number, withTime = true) {
  const d = new Date(ms + TZ_MS);
  const day = `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`;
  return withTime ? `${day} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}` : day;
}

/** "2026-11-01" → Toshkent kuni boshlanishi (ms) */
export function dayStart(ymd: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return NaN;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) - TZ_MS;
}

/** PDF'da ₩ belgisi yo'q — KRW */
const money = (n: number, r: Region) => `${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} ${r === "uz" ? "so‘m" : "KRW"}`;
const planLabel = (p: Payment) => (p.manual ? `${p.days} kun` : (PLANS.find((x) => x.id === p.plan)?.label ?? p.plan));
const STATUS: Record<string, string> = { paid: "Tekshirilmoqda", new: "To‘lov kutilmoqda", rejected: "Rad etildi", cancelled: "Bekor qilindi", approved: "Tasdiqlandi" };

type Col = { title: string; w: number; align?: "right"; get: (p: Payment) => string };

export function paymentsReport(o: { from: number; to: number; payments: Payment[]; paidUsers: number; now?: number }): Buffer {
  const now = o.now ?? Date.now();
  const pdf = new Pdf();
  const M = 40; // chet
  const right = A4.w - M;
  let y = 48;

  const approved = o.payments.filter((p) => p.status === "approved");
  const real = approved.filter((p) => !p.manual);
  const others = o.payments.filter((p) => p.status === "paid" || p.status === "rejected");
  const rev = revenueOf(o.payments);

  // ---------- Sarlavha ----------
  pdf.rect(0, 0, A4.w, 6, [0.31, 0.02, 0.86]);
  pdf.text(M, y, "HanUstoz — to‘lovlar hisoboti", { size: 18, bold: true, color: [0.12, 0.06, 0.32] });
  y += 20;
  pdf.text(M, y, `Davr: ${fmtTime(o.from, false)} – ${fmtTime(o.to, false)}   ·   Yaratildi: ${fmtTime(now)} (Toshkent vaqti)`, { size: 9, gray: 0.4 });
  y += 22;

  // ---------- Qisqacha ----------
  const boxH = 104;
  pdf.rect(M, y, right - M, boxH, [0.96, 0.95, 1]);
  const cellW = (right - M) / 3 - 18;
  const cell = (x: number, yy: number, label: string, value: string) => {
    pdf.text(x, yy, pdf.fit(label, cellW, 8.5), { size: 8.5, gray: 0.42 });
    pdf.text(x, yy + 15, pdf.fit(value, cellW, 13, true), { size: 13, bold: true, color: [0.12, 0.06, 0.32] });
  };
  const c1 = M + 14;
  const c2 = M + 14 + (right - M) / 3;
  const c3 = M + 14 + ((right - M) * 2) / 3;
  const uz = real.filter((p) => p.region === "uz").length;
  const kr = real.filter((p) => p.region === "kr").length;
  cell(c1, y + 16, "Tushum — O‘zbekiston", money(rev.uz, "uz"));
  cell(c2, y + 16, "Tushum — Koreya", money(rev.kr, "kr"));
  cell(c3, y + 16, "Tasdiqlangan to‘lovlar", `${real.length}  (UZ ${uz} · KR ${kr})`);
  const byPlan = PLANS.map((pl) => String(real.filter((p) => p.plan === pl.id).length)).join("  ·  ");
  const promo = real.filter((p) => p.promo).length;
  cell(c1, y + 58, `Tariflar: ${PLANS.map((pl) => pl.label).join(" · ")}`, byPlan);
  cell(c2, y + 58, `Chegirma bilan (jami ${Math.min(o.paidUsers, PROMO_LIMIT)} / ${PROMO_LIMIT} band)`, String(promo));
  cell(c3, y + 58, "Kutilmoqda · rad · qo‘lda", `${others.filter((p) => p.status === "paid").length} · ${others.filter((p) => p.status === "rejected").length} · ${approved.length - real.length}`);
  y += boxH + 26;

  // ---------- Jadval ----------
  const table = (title: string, rows: Payment[], cols: Col[]) => {
    const head = () => {
      pdf.rect(M, y - 11, right - M, 17, [0.93, 0.92, 0.98]);
      let x = M + 6;
      for (const c of cols) {
        pdf.text(c.align === "right" ? x + c.w - 8 : x, y, c.title, { size: 8, bold: true, gray: 0.3, align: c.align });
        x += c.w;
      }
      y += 16;
    };
    if (y > A4.h - 120) {
      pdf.addPage();
      y = 48;
    }
    pdf.text(M, y, title, { size: 12, bold: true, color: [0.12, 0.06, 0.32] });
    y += 18;
    head();
    if (!rows.length) {
      pdf.text(M + 6, y, "Bu davrda yo‘q", { size: 9, gray: 0.5 });
      y += 22;
      return;
    }
    for (const p of rows) {
      if (y > A4.h - 56) {
        pdf.addPage();
        y = 48;
        head();
      }
      let x = M + 6;
      for (const c of cols) {
        const v = pdf.fit(c.get(p), c.w - 10, 8.5);
        pdf.text(c.align === "right" ? x + c.w - 8 : x, y, v, { size: 8.5, align: c.align });
        x += c.w;
      }
      pdf.line(M, y + 5, right, y + 5, 0.4, 0.88);
      y += 15;
    }
    y += 16;
  };

  const region = (p: Payment) => (p.region === "uz" ? "UZ" : "KR");
  const code = (p: Payment) => (!p.code ? "—" : p.region === "uz" ? p.code : krDepositName(p.code));
  table("Tasdiqlangan to‘lovlar", approved, [
    { title: "Sana", w: 78, get: (p) => fmtTime(p.doneAt ?? p.createdAt) },
    { title: "Gmail", w: 160, get: (p) => p.email },
    { title: "Hudud", w: 40, get: region },
    { title: "Tarif", w: 52, get: (p) => planLabel(p) + (p.promo ? " *" : "") },
    { title: "Summa", w: 84, align: "right", get: (p) => (p.manual ? "qo‘lda" : money(p.amount, p.region)) },
    { title: "Kod", w: 44, get: code },
    { title: "Muddat", w: 57, get: (p) => (p.until ? fmtTime(p.until, false) : "—") },
  ]);
  table("Tekshirilayotgan va rad etilgan so‘rovlar", others, [
    { title: "Sana", w: 78, get: (p) => fmtTime(p.paidAt ?? p.createdAt) },
    { title: "Gmail", w: 160, get: (p) => p.email },
    { title: "Hudud", w: 40, get: region },
    { title: "Tarif", w: 52, get: planLabel },
    { title: "Summa", w: 84, align: "right", get: (p) => money(p.amount, p.region) },
    { title: "Holat", w: 101, get: (p) => STATUS[p.status] + (p.receipt ? " · chek" : "") },
  ]);
  pdf.text(M, y, "* — ilk 100 obunachi uchun chegirmali narx. «qo‘lda» — admin bergan (sovg‘a yoki tuzatish), tushumga kirmaydi.", { size: 7.5, gray: 0.5 });

  return pdf.toBuffer("HanUstoz — to‘lovlar hisoboti", (n, total) => `HanUstoz · ${n} / ${total}`);
}
