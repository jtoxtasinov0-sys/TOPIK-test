import type { Metadata } from "next";
import { AccountView } from "@/components/account/AccountView";

export const metadata: Metadata = { title: "Profil", robots: { index: false } };

export default function Page() {
  return <AccountView />;
}
