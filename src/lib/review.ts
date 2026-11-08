// Natija sahifasidagi «Xatolar tahlili»: xatolar savol turi bo'yicha guruhlanadi va har bir tur uchun
// qanday to'g'ri yechish kerakligi (strategiya) ko'rsatiladi. AI'siz, darhol ishlaydi.

import type { Group, Question, Section, SectionId } from "./exam";
import { allQuestions, qKey } from "./exam";

export type QuestionKind =
  | "insert"
  | "blank"
  | "attitude"
  | "similar"
  | "reason"
  | "main"
  | "topic"
  | "place"
  | "reply"
  | "action"
  | "picture"
  | "same"
  | "detail"
  | "other";

export const KIND_INFO: Record<QuestionKind, { label: string; tip: string }> = {
  topic: {
    label: "Mavzuni topish (무엇에 대해)",
    tip: "Suhbat nima haqida ekanini ko‘pincha birinchi savol-javob aytadi (masalan, «이번 방학에 뭐 할 거예요?» → 방학 계획). Ko‘p takrorlangan so‘zga aldanmang: «요리» ko‘p eshitilsa ham, ular ovqat pishirish usuli (요리 방법) haqida gapirmayapti. Butun suhbatni qamraydigan umumiy variantni tanlang.",
  },
  main: {
    label: "Asosiy fikr (중심 생각 · 주제)",
    tip: "Asosiy fikr ko‘pincha oxirgi gaplarda, «-아/어야 해요, -는 게 좋겠어요, -(으)면 좋겠어요» kabi iboralar bilan aytiladi. Avval kimning fikri so‘ralayotganini (남자/여자) belgilang. Bitta detalga emas, gapiruvchining umumiy fikriga mos variantni tanlang.",
  },
  reason: {
    label: "Sabab va maqsad (왜 · 이유 · 목적)",
    tip: "Sabab «-아/어서, -기 때문에, -거든요», maqsad «-(으)려고, -기 위해» bilan aytiladi — shu qo‘shimchalar oldidagi gapni diqqat bilan tinglang. Savoldagi «왜» kimga tegishli ekanini (남자/여자) unutmang.",
  },
  same: {
    label: "Mazmunga mos variant (내용과 같은 것)",
    tip: "Audio yoki matndan oldin 4 ta variantni o‘qib, kalit so‘zlarni (kim, qachon, qayerda, nechta) belgilang. Noto‘g‘ri variantlarda odatda bitta detal almashtiriladi: 두 번 ↔ 세 번, 십만 원 ↔ 이십만 원, 남자 ↔ 여자. Har bir variantni eshitganingiz bilan bittalab solishtiring. «맞지 않는 것» so‘ralsa — matnga zid variantni qidiring.",
  },
  place: {
    label: "Joyni topish (어디입니까)",
    tip: "Joyni bildiruvchi kalit so‘zlarni ushlang: 편지·소포 → 우체국, 빌리다·학생증 → 도서관, 어디가 아프세요 → 병원. Bitta so‘zga emas, butun vaziyatga qarang.",
  },
  reply: {
    label: "Mos javob / davomi (이어지는 말)",
    tip: "Oxirgi gapni diqqat bilan tinglang: savol turi (네/아니요, 언제, 어디, 누구) javob shaklini belgilaydi. 네/아니요 savolida javobdagi fe’l savoldagi fe’l bilan bir xil bo‘ladi. Kechirim → 괜찮아요, minnatdorchilik → 아니에요 kabi odob iboralarini yodlang.",
  },
  picture: {
    label: "Rasm va grafik",
    tip: "Audio boshlanishidan oldin rasmlarni solishtirib, farqini toping: kim, nima qilyapti, qayerda. Grafikda «가장 많다/적다, 늘다/줄다, -위» so‘zlariga quloq soling.",
  },
  blank: {
    label: "Bo‘sh joyni to‘ldirish (빈칸)",
    tip: "Bo‘sh joydan oldingi va keyingi gapni o‘qing: bog‘lovchi (그래서, 하지만, 그런데) mantiqiy aloqani ko‘rsatadi. Har bir variantni o‘rniga qo‘yib, gap grammatika va ma’no jihatdan to‘g‘ri chiqishini tekshiring.",
  },
  insert: {
    label: "Gap o‘rni va tartib (순서 · 들어갈 곳)",
    tip: "Birinchi gap odatda umumiy fikr bo‘ladi; «그래서, 하지만, 이것, 그» bilan boshlanadigan gap birinchi bo‘lmaydi. Ko‘rsatish so‘zlari (이, 그) va bog‘lovchilar gaplar qaysi tartibda ulanishini ko‘rsatadi.",
  },
  attitude: {
    label: "Munosabat va his-tuyg‘u (태도 · 심정)",
    tip: "Baholovchi so‘zlar (걱정, 다행, 아쉽다, 비판, 기대) va ohangga e’tibor bering. Gapiruvchi rozimi, qarshimi yoki xavotirdami — shuni aniqlang.",
  },
  similar: {
    label: "Ma’nosi yaqin ifoda (의미가 비슷한 것)",
    tip: "Tagiga chizilgan qism yoki sarlavhani avval o‘z so‘zingiz bilan tushuntiring, keyin shu ma’noga eng yaqin variantni tanlang. Bir xil ma’noli shakllarni juft qilib yodlang (-아/어서 ≈ -기 때문에).",
  },
  action: {
    label: "Kim va nima qiladi (행동 · 누구)",
    tip: "Oxirgi gaplardagi «-(으)ㄹ게요, -아/어 주세요, -(으)러 가요» iboralari kim keyin nima qilishini ko‘rsatadi. Gapiruvchining kasbini so‘zlaridan aniqlang (환자 → 의사, 손님 → 점원).",
  },
  detail: {
    label: "Aniq ma’lumot (몇 시 · 얼마 · 방법)",
    tip: "Savoldagi so‘roq so‘zini (몇 시, 언제, 얼마, 어떻게) oldindan belgilang va audioda aynan shu ma’lumotni kuting. Raqam va vaqt o‘zgarishiga («다음 주부터 …») e’tibor bering.",
  },
  other: {
    label: "Boshqa savollar",
    tip: "Savolni audio yoki matndan oldin o‘qib, nima so‘ralayotganini aniqlang. Javobni matndagi aniq ibora bilan tasdiqlang — taxmin bilan emas.",
  },
};

/** Savol matni (yoki guruh ko'rsatmasi) bo'yicha savol turi. Tartib muhim: aniqrog'i oldin tekshiriladi */
const RULES: [QuestionKind, RegExp][] = [
  ["insert", /들어갈 곳|순서대로|배열|나열/],
  ["attitude", /태도|심정/],
  ["blank", /들어갈|빈칸/],
  ["similar", /의미가 (?:비슷|같)|밑줄 친 부분과|제목/],
  ["reason", /왜|이유|목적|의도/],
  ["main", /중심|주제/],
  ["topic", /무엇에 대(?:해|한)/],
  ["place", /어디/],
  ["reply", /대답|이어지는 말|이어질 수 있는 말/],
  ["action", /행동|무엇을 하고|무엇을 해야|먼저|누구/],
  ["picture", /알맞은 그림|그림을 보고|그래프를 고르|표지/],
  ["same", /같은 것|일치|맞는 것|맞지 않는|알 수 있는|들은 것/],
  ["detail", /몇|언제|얼마|어떻게|방법|무엇입니까/],
];

export function questionKind(q: Pick<Question, "prompt">, g: Pick<Group, "instruction">): QuestionKind {
  const text = q.prompt?.trim() || g.instruction || "";
  for (const [kind, re] of RULES) if (re.test(text)) return kind;
  return "other";
}

export type MistakeRef = { section: SectionId; n: number; unanswered: boolean };

export type MistakeSummary = {
  total: number;
  unanswered: number;
  bySection: { section: SectionId; count: number }[];
  kinds: { kind: QuestionKind; label: string; tip: string; items: MistakeRef[] }[];
};

/** Xatolar (va javobsiz savollar) — bo'limlar va savol turlari bo'yicha; ko'p xato qilingan tur birinchi */
export function mistakeSummary(sections: Section[], answers: Record<string, number>): MistakeSummary {
  const byKind = new Map<QuestionKind, MistakeRef[]>();
  const bySection: MistakeSummary["bySection"] = [];
  let total = 0;
  let unanswered = 0;
  for (const s of sections) {
    if (!s.groups) continue;
    let count = 0;
    for (const { q, g } of allQuestions(s)) {
      const a = answers[qKey(s.id, q.n)];
      if (a === q.answer) continue;
      count++;
      if (!a) unanswered++;
      const kind = questionKind(q, g);
      const list = byKind.get(kind) ?? [];
      list.push({ section: s.id, n: q.n, unanswered: !a });
      byKind.set(kind, list);
    }
    total += count;
    if (count) bySection.push({ section: s.id, count });
  }
  const kinds = [...byKind.entries()]
    .map(([kind, items]) => ({ kind, ...KIND_INFO[kind], items }))
    .sort((a, b) => b.items.length - a.items.length);
  return { total, unanswered, bySection, kinds };
}
