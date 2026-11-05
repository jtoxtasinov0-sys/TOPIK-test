import type { Metadata } from "next";
import { LogoStudio } from "@/components/account/LogoStudio";

export const metadata: Metadata = { title: "Logo studiyasi", robots: { index: false, follow: false } };

export default function Page() {
  return <LogoStudio />;
}
