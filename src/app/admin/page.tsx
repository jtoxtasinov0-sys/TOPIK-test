import type { Metadata } from "next";
import { AdminView } from "@/components/account/AdminView";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default function Page() {
  return <AdminView />;
}
