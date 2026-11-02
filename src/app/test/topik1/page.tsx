import type { Metadata } from "next";
import { ExamRunner } from "@/components/exam/ExamRunner";

export const metadata: Metadata = { title: "TOPIK I mock test" };

export default function Page() {
  return <ExamRunner exam="topik1" />;
}
