// AI Ustoz uchun bilim bazasi: rasmiy TOPIK faktlari + grammatika va lug‘atdan kerakli qismlarni topish.
// Faktlar topik.go.kr va korean.go.kr dan 2026-yil noyabrda tekshirilgan.
import { findGrammarIn, GRAMMAR } from "@/data/grammar";
import { PAST_ROUNDS, QTYPES } from "@/data/pastExams";
import { findWordsIn, POS_NAME } from "@/data/vocab";

const SCHEDULE_2026 = [
  ["104", "2026-01-11", "2026-02-12"],
  ["105", "2026-04-12", "2026-05-29"],
  ["106", "2026-05-17", "2026-06-25"],
  ["107", "2026-07-05", "2026-08-13"],
  ["108", "2026-10-18", "2026-12-10"],
  ["109", "2026-11-15", "2026-12-22"],
];

const qtypeText = () =>
  Object.values(QTYPES)
    .map((s) => `${s.title}:\n` + s.items.map((i) => `  ${i.range}: ${i.ko} — ${i.uz}. Maslahat: ${i.tip}`).join("\n"))
    .join("\n");

export const TOPIK_FACTS = `## TOPIK rasmiy faktlari (topik.go.kr, 2026-yil noyabr holati)
- Tashkilotchi: 국립국제교육원 (NIIED), Ta’lim vazirligi. Natija e’lon qilingan kundan 2 yil amal qiladi.
- Qo‘llanilishi: Koreya oliygohlariga kirish/bitirish, ishga kirish, viza va doimiy yashash (영주권), GKS stipendiyasi.
- Tarix: 1997-yildan; 2014-07-20 (35-sessiya) dan hozirgi tuzilma; 2022 — TOPIK Speaking (말하기 평가), 2023 — TOPIK IBT (kompyuterda); 2025-yildan yiliga 15 ta imtihon (PBT 6, IBT 6, Speaking 3).
- TOPIK I: 듣기 30 savol/40 daqiqa + 읽기 40 savol/60 daqiqa = 200 ball. 80+ → 1급, 140+ → 2급.
- TOPIK II: 1교시 듣기 50 savol/60 daqiqa + 쓰기 4 topshiriq/50 daqiqa; 2교시 읽기 50 savol/70 daqiqa = 300 ball. 120+ → 3급, 150+ → 4급, 190+ → 5급, 230+ → 6급.
- Tinglash: TOPIK I da audio 2 marta; TOPIK II da 1–20 savol 1 marta, 21–50 savol 2 marta o‘qiladi.
- 쓰기 baholash mezonlari: 51–52 — mazmun/topshiriq va til to‘g‘riligi; 53–54 — 내용 및 과제 수행 (mazmun va topshiriqni bajarish), 글의 전개 구조 (tuzilma, bog‘lovchilar), 언어 사용 (grammatika va lug‘at boyligi, yozma uslub -ㄴ/는다). 53: 200–300 belgi, 54: 600–700 belgi.
- 2026-yil PBT jadvali (Koreya ichida; sessiya: imtihon sanasi → natija): ${SCHEDULE_2026.map(([n, d, r]) => `${n}-sessiya ${d} → ${r}`).join("; ")}. Chet elda (jumladan O‘zbekistonda) sanalar va ro‘yxat davri mamlakatga qarab farq qiladi — topik.go.kr → 시험일정. 110-sessiya bo‘yicha e’lonlar 2026-yil noyabrda chiqa boshlagan.
- Ochiq o‘tgan testlar (기출문제, rasmiy saytda audio bilan bepul): ${PAST_ROUNDS.map((r) => `${r.no}(${r.year})`).join(", ")}. Havola: https://www.topik.go.kr/TWSTDY/TWSTDY0080.do — ilovada «Testlar → Rasmiy o‘tgan testlar» bo‘limi. Bu savollarni so‘zma-so‘z keltirma (NIIED mualliflik huquqi); format va strategiyasini tushuntir.
- Lug‘at manbasi: 국립국어원 «한국어 학습용 어휘 목록» (5 965 so‘z: A 982 — boshlang‘ich, B 2 111 — o‘rta, C 2 872 — yuqori). Ilovadagi «So‘zlar» bo‘limida A va B darajadagi so‘zlar o‘zbekcha tarjima bilan bor.

## Savol turlari xaritasi (har bir raqamda doim shu turdagi topshiriq)
${qtypeText()}`;

export function retrieve(text: string): string {
  const parts: string[] = [];
  const gr = findGrammarIn(text);
  if (gr.length) {
    parts.push(
      "## Bazadagi mos grammatika (shu ma’lumotga tayan, misollarni o‘zing ham qo‘sh)\n" +
        gr.map((x) => `- ${x.p} (${x.lv}급): ${x.uz}. Misol: ${x.ex} — ${x.exUz}${x.note ? ` Eslatma: ${x.note}` : ""}`).join("\n"),
    );
  }
  const ws = findWordsIn(text, 20);
  if (ws.length) {
    parts.push(
      "## Bazadagi so‘zlar (ilova lug‘ati tarjimasi)\n" +
        ws.map((w) => `- ${w.ko} [${w.rom}] (${POS_NAME[w.pos] ?? w.pos}, ${w.lv === "A" ? "TOPIK I" : "TOPIK II"}): ${w.uz}`).join("\n"),
    );
  }
  return parts.join("\n\n");
}

// O‘quvchi so‘rasa — bazadagi grammatika ro‘yxati (faqat nomlari, darajasi bilan)
export const GRAMMAR_INDEX = GRAMMAR.map((x) => `${x.p}(${x.lv})`).join(", ");
