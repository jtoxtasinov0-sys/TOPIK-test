import type { Metadata } from "next";
import { PricingView } from "@/components/account/PricingView";
import { formatSum, MONTHLY_PRICE, TRIAL_DAYS } from "@/lib/plans";

export const metadata: Metadata = {
  title: `Tariflar — ${TRIAL_DAYS} kun bepul`,
  description: `HanQadam Premium: AI yozma ish tekshiruvi, Gemini bilan suhbat, AI Ustoz va cheksiz TOPIK variantlari. ${TRIAL_DAYS} kun bepul, keyin oyiga ${formatSum(MONTHLY_PRICE)} so‘m.`,
};

export default function Page() {
  return <PricingView />;
}
