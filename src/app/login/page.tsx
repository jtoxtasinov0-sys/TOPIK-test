import type { Metadata } from "next";
import { LoginView } from "@/components/account/LoginView";

export const metadata: Metadata = { title: "Kirish — Gmail orqali" };

export default function Page() {
  return <LoginView />;
}
