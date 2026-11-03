import type { Metadata, Viewport } from "next";
import { Manrope, Noto_Sans_KR, Unbounded } from "next/font/google";
import "./globals.css";
import { LangProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { TRIAL_DAYS } from "@/lib/access";

const display = Unbounded({ variable: "--font-unbounded", subsets: ["latin", "cyrillic"], weight: ["500", "600", "700"] });
const body = Manrope({ variable: "--font-manrope", subsets: ["latin", "cyrillic"], weight: ["400", "500", "600", "700", "800"] });
const kr = Noto_Sans_KR({ variable: "--font-noto-kr", weight: ["400", "500", "700", "800"], preload: false });

export const metadata: Metadata = {
  title: {
    default: "HanUstoz — TOPIK mock test va koreys tili 0 dan",
    template: "%s · HanUstoz",
  },
  description: `TOPIK I va TOPIK II mock testlari (bepul), AI yozma ish tekshiruvi, Gemini bilan ovozli suhbat, Hangul va koreys tilini 0 dan o‘rganish. Gmail orqali kiring — AI ${TRIAL_DAYS} kun bepul. Пробные тесты TOPIK, AI-проверка и корейский с нуля.`,
  applicationName: "HanUstoz",
  keywords: ["TOPIK", "TOPIK mock test", "koreys tili", "корейский язык", "TOPIK II", "EPS-TOPIK", "Hangul"],
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
        <LangProvider>
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </LangProvider>
      </body>
    </html>
  );
}
