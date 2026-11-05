import type { Metadata } from "next";
import { ExamRunner } from "@/components/exam/ExamRunner";

export const metadata: Metadata = { title: "EPS-TOPIK mock test" };

export default function Page() {
  return <ExamRunner exam="eps" />;
}
