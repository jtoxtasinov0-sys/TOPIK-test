import type { Metadata } from "next";

export const metadata: Metadata = { title: "Logo va brend", description: "HanUstoz logotipi, ilova ikonkasi va ranglari — reklama uchun fayllar." };

// Reklama va dizayn uchun: logo fayllari (SVG — har qanday o'lchamda tiniq, PNG — tayyor rasm) va brend ranglari.
const FILES: { title: string; desc: string; preview: string; dark?: boolean; files: [string, string][] }[] = [
  {
    title: "Gorizontal logo",
    desc: "Sayt, banner, video oxiri, hujjatlar — oq yoki och fonda.",
    preview: "/brand/logo-horizontal.svg",
    files: [
      ["SVG", "/brand/logo-horizontal.svg"],
      ["PNG", "/brand/logo-horizontal.png"],
    ],
  },
  {
    title: "Logo va shior",
    desc: "Reklama, banner, prezentatsiya — nima ekanimiz darhol tushunarli.",
    preview: "/brand/logo-tagline.svg",
    files: [
      ["SVG", "/brand/logo-tagline.svg"],
      ["PNG", "/brand/logo-tagline.png"],
      ["Oq SVG", "/brand/logo-tagline-white.svg"],
      ["Oq PNG", "/brand/logo-tagline-white.png"],
    ],
  },
  {
    title: "Vertikal logo",
    desc: "Instagram/Telegram posti, afisha, kvadrat joylar.",
    preview: "/brand/logo-stacked.svg",
    files: [
      ["SVG", "/brand/logo-stacked.svg"],
      ["PNG", "/brand/logo-stacked.png"],
    ],
  },
  {
    title: "Gorizontal logo — oq",
    desc: "To‘q yoki rangli fonda (rasm, video, binafsha banner).",
    preview: "/brand/logo-horizontal-white.svg",
    dark: true,
    files: [
      ["SVG", "/brand/logo-horizontal-white.svg"],
      ["PNG", "/brand/logo-horizontal-white.png"],
    ],
  },
  {
    title: "Belgi — fonsiz",
    desc: "Oq fonli reklama, hujjat, futbolka va sovg‘alar uchun — binafsha gradientdagi belgi.",
    preview: "/brand/logo-symbol.svg",
    files: [
      ["SVG", "/brand/logo-symbol.svg"],
      ["PNG 1024", "/brand/logo-symbol-1024.png"],
    ],
  },
  {
    title: "Belgi (ikonka)",
    desc: "Profil rasmi (Telegram, Instagram, YouTube), ilova ikonkasi, kichik joylar.",
    preview: "/brand/logo-mark.svg",
    files: [
      ["SVG", "/brand/logo-mark.svg"],
      ["PNG 1024", "/brand/logo-1024.png"],
      ["PNG 512", "/brand/icon-512.png"],
    ],
  },
];

const COLORS: [string, string][] = [
  ["Logo foni (to‘q binafsha)", "#5004dc"],
  ["Och binafsha (nur)", "#9b1fff"],
  ["Binafsha", "#6a11ff"],
  ["Siyohrang", "#8b3dff"],
  ["Ko‘k", "#3a86ff"],
  ["Quyosh", "#ffc04a"],
  ["Pushti", "#ff5c9a"],
  ["Siyoh (matn)", "#160f3b"],
];

export default function BrandPage() {
  return (
    <main className="container page">
      <div className="section-head">
        <span className="eyebrow">🎨 Brend</span>
        <h1 className="h1">
          HanUstoz <span className="gradient-text">logotipi</span>
        </h1>
        <p className="lead">
          Belgi — «H» (HanUstoz): ikki ustun diagonal to‘lqinli lenta bilan bog‘langan, yon bo‘laklar lentaga parallel kesilgan — o‘quvchidan ustozga oqim va harakat. Fon — to‘q binafsha, burchaklarda och binafsha nur. Yozuv — Inter Display Bold. Reklamada logoni cho‘zmang, qiyshaytirmang, rangini o‘zgartirmang va atrofida kamida belgi balandligining yarmicha bo‘sh joy qoldiring.
        </p>
      </div>

      <div className="stack">
        {FILES.map((f) => (
          <div key={f.title} className="card stack" style={{ gap: 12 }}>
            <div
              style={{
                display: "grid",
                placeItems: "center",
                padding: 28,
                borderRadius: 18,
                background: f.dark ? "linear-gradient(135deg,#1c0f4f,#10306e)" : "#f6f3ff",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- vektor logo */}
              <img src={f.preview} alt={f.title} style={{ maxWidth: "100%", height: f.preview.includes("stacked") ? 220 : f.preview.includes("mark") ? 140 : 80, width: "auto" }} />
            </div>
            <div className="row between" style={{ flexWrap: "wrap", gap: 10 }}>
              <div>
                <b>{f.title}</b>
                <div className="small muted">{f.desc}</div>
              </div>
              <div className="row-wrap">
                {f.files.map(([label, href]) => (
                  <a key={href} href={href} download className="btn btn-soft btn-sm">
                    ⬇️ {label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        ))}

        <div className="card">
          <b>Ranglar</b>
          <div className="grid-3" style={{ marginTop: 12 }}>
            {COLORS.map(([name, hex]) => (
              <div key={hex} className="row" style={{ gap: 10 }}>
                <span style={{ width: 44, height: 44, borderRadius: 12, background: hex, border: "1px solid var(--line)", flexShrink: 0 }} />
                <div>
                  <b className="small">{name}</b>
                  <div className="tiny muted">{hex}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="small muted" style={{ margin: "12px 0 0" }}>Logo foni: to‘q binafsha #5004DC, burchaklarda och binafsha #9B1FFF nur. Sayt tugmalari: binafsha → ko‘k gradient. Urg‘u: quyosh → pushti gradient.</p>
        </div>
      </div>
    </main>
  );
}
