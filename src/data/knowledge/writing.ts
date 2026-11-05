// TOPIK II 쓰기 (51–54) bo'yicha ustoz eslatmalari: 원고지 qoidalari, tuzilma va foydali iboralar.
// HanUstoz uchun original yozilgan; baholash mezonlari TOPIK rasmiy mezonlari asosida (api/writing).

export type WritingNote = { id: string; title: string; points: string[] };

export const WRITING_NOTES: WritingNote[] = [
  {
    id: "wongoji",
    title: "원고지 (katakli varaq) qoidalari",
    points: [
      "Har bir harf (bo‘g‘in) va bo‘sh joy — bitta katak.",
      "Xatboshi (abzats) boshida bitta katak bo‘sh qoldiriladi.",
      "Nuqta va vergul bitta katakka yoziladi; ulardan keyin katak bo‘sh qoldirilmaydi.",
      "Raqamlar va kichik lotin harflari — bir katakka ikkitadan (2026 → 「20」「26」), katta lotin harfi — bitta katakka bitta.",
      "Qator oxirida joy qolmasa, tinish belgisi oxirgi harf bilan bir katakka (yoki hoshiyaga) yoziladi.",
      "53: 200–300 belgi, 54: 600–700 belgi (bo‘sh joylar ham hisoblanadi).",
    ],
  },
  {
    id: "w51-52",
    title: "51–52: bo‘sh joyni to‘ldirish",
    points: [
      "Bo‘sh joydan oldingi va keyingi gapga qarang: ma’no (sabab, qarama-qarshilik, iltimos) va grammatika qanday bo‘lishi kerak?",
      "51 — amaliy matn (e’lon, xat, xabar): matn uslubiga moslang, odatda -(스)ㅂ니다 / -아/어 주시기 바랍니다.",
      "52 — tushuntirish matni: albatta yozma uslub -다 (예: -기 때문이다, -(으)ㄹ 수 있다).",
      "Faqat bitta gap yozing; matndagi so‘zlardan foydalanish mumkin, lekin boshqa gapni ko‘chirmang.",
    ],
  },
  {
    id: "w53",
    title: "53: grafik/so‘rovnoma tavsifi (200–300 belgi)",
    points: [
      "Tuzilma: 1) kim, qachon, nima haqida so‘ralgan; 2) asosiy natijalar (o‘sish/kamayish, 1-o‘rin, taqqoslash); 3) sabab yoki kelajak prognozi (berilgan bo‘lsa).",
      "Boshlanish: «○○이/가 ○○을/를 대상으로 ○○에 대해 조사한 결과, …(으)로 나타났다.»",
      "O‘zgarish: «○○년 ○○에서 ○○년 ○○(으)로 ○배 증가하였다 / 감소하였다.»",
      "Taqqoslash: «남성은 ○○%인 반면 여성은 ○○%로 …», «그 뒤를 이어 ○○이/가 ○○%를 차지하였다.»",
      "Xulosa: «이처럼 …», «이러한 변화의 원인으로는 …을/를 들 수 있다», «앞으로 …(으)ㄹ 것으로 전망된다.»",
      "Grafikda yo‘q ma’lumot yoki shaxsiy fikr qo‘shmang; sarlavha yozmang.",
    ],
  },
  {
    id: "w54",
    title: "54: fikr-mulohaza essesi (600–700 belgi)",
    points: [
      "Tuzilma: 서론 (mavzu va muammo) → 본론 (topshiriqdagi har bir savolga alohida xatboshi) → 결론 (xulosa va o‘z fikringiz).",
      "Boshlanish: «최근 …이/가 사회적 문제로 대두되고 있다.», «…에 대해서는 다양한 의견이 있다.»",
      "Bog‘lovchilar: 첫째/둘째, 또한, 게다가, 반면에, 그러므로, 따라서, 이러한 점에서, 결론적으로.",
      "Fikr bildirish: «…(이)라고 생각한다», «…아/어야 할 것이다», «…(으)ㄹ 필요가 있다».",
      "Topshiriq savollarini so‘zma-so‘z ko‘chirmang; -아요/-습니다 va 저 ishlatmang.",
      "Vaqt: reja 5 daqiqa, yozish 35 daqiqa, tekshirish 5 daqiqa.",
    ],
  },
];

/** AI baholash va ustoz uchun qisqa matn ko'rinishi */
export function writingNotesText(n?: number): string {
  const pick = n === 51 || n === 52 ? ["wongoji", "w51-52"] : n === 53 ? ["wongoji", "w53"] : n === 54 ? ["wongoji", "w54"] : WRITING_NOTES.map((w) => w.id);
  return WRITING_NOTES.filter((w) => pick.includes(w.id))
    .map((w) => `${w.title}\n${w.points.map((p) => `- ${p}`).join("\n")}`)
    .join("\n\n");
}
