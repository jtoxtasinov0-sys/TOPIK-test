// Bilim bazasi tayangan ochiq manbalar. Kitob va qo'llanmalardan matn ko'chirilmagan:
// ulardan faqat darajalar tuzilmasi, mavzular ro'yxati va rasmiy qoidalar (imtihon formati, baholash mezonlari,
// xavfsizlik belgilari turlari) uchun tayanch sifatida foydalanilgan. Barcha tushuntirish va misollar HanUstoz uchun yozilgan.

export type Source = { name: string; org: string; url: string; usedFor: string };

export const SOURCES: Source[] = [
  {
    name: "국제 통용 한국어 표준 교육과정",
    org: "국립국어원 (Milliy koreys tili instituti)",
    url: "https://www.korean.go.kr",
    usedFor: "1–6-darajalar tuzilmasi, har bir daraja uchun mavzular va maqsadlar",
  },
  {
    name: "한국어 학습용 어휘 목록 (2003)",
    org: "국립국어원 (Milliy koreys tili instituti) — KOGL 1-tur",
    url: "https://www.korean.go.kr/front/etcData/etcDataView.do?mn_id=46&etc_seq=71",
    usedFor: "«So‘zlar» bo‘limidagi TOPIK I (A) va TOPIK II (B) lug‘ati: so‘zlar, turkumi, darajasi va chastota tartibi",
  },
  {
    name: "토픽 기출문제 (ochiq o‘tgan testlar, 35–102-sessiyalar)",
    org: "국립국제교육원 (NIIED)",
    url: "https://www.topik.go.kr/TWSTDY/TWSTDY0080.do",
    usedFor: "«Rasmiy o‘tgan testlar» sahifasidagi havolalar va savol turlari xaritasi (savollar ko‘chirilmagan)",
  },
  {
    name: "한국어기초사전",
    org: "국립국어원",
    url: "https://krdict.korean.go.kr",
    usedFor: "So‘z ma’nolari va qo‘llanilishini tekshirish",
  },
  {
    name: "TOPIK rasmiy sayti: imtihon tuzilmasi va baholash mezonlari",
    org: "국립국제교육원 (NIIED)",
    url: "https://www.topik.go.kr",
    usedFor: "TOPIK I/II formati, darajalar balli, 쓰기 baholash mezonlari",
  },
  {
    name: "EPS-TOPIK: imtihon haqida va 출제기준",
    org: "한국산업인력공단 (HRD Korea)",
    url: "https://epstopik.hrdkorea.or.kr",
    usedFor: "EPS-TOPIK tuzilmasi (40 savol, 50 daqiqa, 100 ball) va savol mavzulari",
  },
  {
    name: "고용허가제 한국어 표준교재",
    org: "한국산업인력공단 (HRD Korea)",
    url: "https://epstopik.hrdkorea.or.kr",
    usedFor: "EPS mavzulari ro‘yxati: ish joyi, asboblar, xavfsizlik, kundalik hayot",
  },
  {
    name: "산업안전보건표지 (xavfsizlik belgilari)",
    org: "고용노동부 / 한국산업안전보건공단 (KOSHA)",
    url: "https://www.kosha.or.kr",
    usedFor: "Taqiqlovchi, ogohlantiruvchi, majburiy va yo‘l ko‘rsatuvchi belgilar turlari",
  },
  {
    name: "최저임금 (minimal ish haqi)",
    org: "최저임금위원회",
    url: "https://www.minimumwage.go.kr",
    usedFor: "2026-yil minimal ish haqi (soatiga 10 320 von)",
  },
];
