import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HanQadam — TOPIK va koreys tili",
    short_name: "HanQadam",
    description: "TOPIK I/II mock testlari, AI yozma ish tekshiruvi, Gemini bilan suhbat va koreys tilini 0 dan o‘rganish.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f1ff",
    theme_color: "#6a11ff",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
