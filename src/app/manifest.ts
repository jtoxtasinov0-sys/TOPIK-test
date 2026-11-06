import type { MetadataRoute } from "next";
import { VISUALS } from "@/data/visuals";
import { appIconUrl, BRAND_VERSION, imageUrl } from "@/lib/images";

// PWA manifesti: telefonga «ilova» sifatida o'rnatish. Ikonka — vektor logodan (scripts/brand.mjs → public/brand),
// tezkor menyular (ikonkani bosib turganda) — sayt ikonkalari bilan.

const shortcut = (name: string, url: string, visual: keyof typeof VISUALS, description: string) => ({
  name,
  short_name: name,
  description,
  url,
  icons: [{ src: imageUrl(VISUALS[visual].prompt, { style: "icon", w: 128 }), sizes: "128x128", type: "image/png" }],
});

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "HanUstoz — TOPIK va koreys tili",
    short_name: "HanUstoz",
    description: "TOPIK I/II va EPS-TOPIK mock testlari, AI yozma ish tekshiruvi, Gemini bilan suhbat va koreys tilini 0 dan o‘rganish.",
    lang: "uz",
    dir: "ltr",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: "#f4f1ff",
    theme_color: "#6a11ff",
    categories: ["education", "productivity"],
    icons: [
      { src: appIconUrl(192), sizes: "192x192", type: "image/png", purpose: "any" },
      { src: appIconUrl(512), sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `/brand/icon-maskable-512.png?v=${BRAND_VERSION}`, sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: `/brand/logo-mark.svg?v=${BRAND_VERSION}`, sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
    shortcuts: [
      shortcut("Mock test", "/test", "home:test", "TOPIK I, TOPIK II va EPS-TOPIK"),
      shortcut("AI Ustoz", "/speak", "home:tutor", "Koreyscha gaplashish, ovozli va yozma ustoz"),
      shortcut("Erkin suhbat", "/speak/free", "home:speak", "Koreys do‘st bilan ovozli suhbat"),
      shortcut("So‘zlar", "/words", "home:words", "So‘z kartochkalari"),
    ],
  };
}
