// Ilovadagi barcha tayyor (internet AI’siz ishlaydigan) original variantlar — bitta ro‘yxat.
// Test sahifasi, rasm marshruti (/api/image) va admin panelidagi rasmlarni oldindan tayyorlash shu yerdan o‘qiydi.
import type { ExamId, Test } from "@/lib/exam";
import { EPS } from "./eps";
import { TOPIK1 } from "./topik1";
import { TOPIK1_V2 } from "./topik1v2";
import { TOPIK2 } from "./topik2";
import { TOPIK2_V2 } from "./topik2v2";

export const BUILTIN_TESTS: Record<ExamId, Test[]> = {
  topik1: [TOPIK1, TOPIK1_V2],
  topik2: [TOPIK2, TOPIK2_V2],
  eps: [EPS],
};

export const ALL_BUILTIN_TESTS: Test[] = Object.values(BUILTIN_TESTS).flat();
