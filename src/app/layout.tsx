import type { Metadata, Viewport } from "next";
import { Manrope, Noto_Sans_KR, Unbounded } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

const display = Unbounded({ variable: "--font-unbounded", subsets: ["latin"], weight: ["500", "600", "700"] });
const body = Manrope({ variable: "--font-manrope", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });
const kr = Noto_Sans_KR({ variable: "--font-noto-kr", weight: ["400", "500", "700", "800"], preload: false });

export const metadata: Metadata = {
  title: {
    default: "HanQadam — TOPIK mock test va koreys tili 0 dan",
    template: "%s · HanQadam",
  },
  description:
    "TOPIK I va TOPIK II bepul mock testlari, AI yozma ish tekshiruvi, Gemini bilan ovozli suhbat, Hangul va koreys tilini 0 dan o‘rganish.",
  applicationName: "HanQadam",
  keywords: ["TOPIK", "TOPIK mock test", "koreys tili", "TOPIK II", "EPS-TOPIK", "Hangul"],
};

export const viewport: Viewport = {
  themeColor: "#6a11ff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="uz" className={`${display.variable} ${body.variable} ${kr.variable}`}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
