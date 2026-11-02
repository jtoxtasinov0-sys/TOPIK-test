import type { Metadata } from "next";
import { ExamRunner } from "@/components/exam/ExamRunner";

export const metadata: Metadata = { title: "TOPIK II 쓰기 — yozish imtihoni" };

export default function Page() {
  return <ExamRunner exam="topik2" preset="writing" />;
}
