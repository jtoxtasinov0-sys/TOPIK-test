import type { Metadata } from "next";
import { PayView } from "@/components/account/PayView";

export const metadata: Metadata = { title: "Obuna", description: "HanUstoz AI obunasi: AI Ustoz, ovozli suhbat, yozma ish tekshiruvi va AI variantlar" };

export default function Page() {
  return <PayView />;
}
