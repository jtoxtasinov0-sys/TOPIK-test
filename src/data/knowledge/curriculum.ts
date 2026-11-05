// O'quv dasturi: 0 dan 6급 gacha va EPS-TOPIK yo'li.
// Darajalar tuzilmasi 국립국어원 «국제 통용 한국어 표준 교육과정» va TOPIK darajalar tavsifiga tayanadi.
// Soat va so'z soni — taxminiy mo'ljal (har bir o'quvchida har xil).

export type Stage = {
  id: string; // "0", "1급", ..., "eps"
  title: string;
  exam: string; // qaysi imtihon va ball
  hours: string;
  words: string;
  goals: string[]; // o'quvchi nimalarni qila oladi
  topics: string[];
  grammarLevel?: number; // grammar.ts dagi daraja
  tips: string[];
};

export const STAGES: Stage[] = [
  {
    id: "0",
    title: "Hangul va talaffuz",
    exam: "—",
    hours: "10–20 soat",
    words: "≈ 50 so‘z",
    goals: ["40 harfni o‘qiy va yoza oladi", "Bo‘g‘in yasaydi, 받침 ni to‘g‘ri o‘qiydi", "Salomlashish va o‘zini tanishtirishni biladi"],
    topics: ["Unlilar va undoshlar", "Bo‘g‘in tuzilishi", "받침", "Asosiy talaffuz qoidalari (연음, 비음화)"],
    tips: ["Lotin harfida emas, darhol Hangulda o‘qing", "Har kuni 15 daqiqa ovoz chiqarib o‘qing", "HanUstoz → 0 dan o‘rganish → Hangul bo‘limi"],
  },
  {
    id: "1급",
    title: "Boshlang‘ich (1-daraja)",
    exam: "TOPIK I · 80+ ball (200 dan)",
    hours: "≈ 200 soat",
    words: "≈ 800 so‘z",
    goals: [
      "O‘zini tanishtiradi, oila, ish va vatani haqida gapiradi",
      "Do‘konda xarid qiladi, narx so‘raydi, ovqat buyuradi",
      "Vaqt, sana, raqamlarni tushunadi",
      "Oddiy e’lon va xabarlarni o‘qiydi",
    ],
    topics: ["Tanishuv", "Oila", "Kun tartibi", "Xarid", "Ovqat", "Ob-havo", "Transport", "Joylar"],
    grammarLevel: 1,
    tips: ["Har bir grammatikani 3 ta o‘z gapingiz bilan mashq qiling", "TOPIK I tinglashda savolni audio boshlanishidan oldin o‘qing"],
  },
  {
    id: "2급",
    title: "Boshlang‘ich (2-daraja)",
    exam: "TOPIK I · 140+ ball (200 dan)",
    hours: "≈ 400 soat (jami)",
    words: "≈ 1 500–2 000 so‘z",
    goals: [
      "Telefonda gaplasha oladi, uchrashuv belgilaydi",
      "Bank, pochta, kasalxona kabi joylarda o‘z ishini bajaradi",
      "Rasmiy va norasmiy uslubni farqlaydi",
      "Qisqa matn va e’lonlarning asosiy ma’nosini tushunadi",
    ],
    topics: ["Telefon", "Kasalxona", "Bank", "Sayohat", "Sevimli mashg‘ulot", "Ish joyi", "Tajriba va reja"],
    grammarLevel: 2,
    tips: ["Sifatdosh (-은/-는/-을) ni yaxshi o‘zlashtiring — TOPIK II ning asosi", "So‘zlarni mavzular bo‘yicha guruhlab yodlang"],
  },
  {
    id: "3급",
    title: "O‘rta (3-daraja)",
    exam: "TOPIK II · 120+ ball (300 dan)",
    hours: "≈ 600 soat (jami)",
    words: "≈ 3 000 so‘z",
    goals: [
      "Kundalik hayotda deyarli qiynalmaydi",
      "Ijtimoiy mavzularda (ish, ta’lim, madaniyat) fikr bildiradi",
      "Og‘zaki va yozma uslubni farqlaydi",
      "TOPIK II 51–53 yozish topshiriqlarini bajara oladi",
    ],
    topics: ["Ish va kasb", "Ta’lim", "Madaniyat farqlari", "Sog‘liq", "Iste’mol", "Muammo va shikoyat"],
    grammarLevel: 3,
    tips: ["Yozma uslubni (-ㄴ/는다) erta boshlang", "Har hafta bitta 53-topshiriq (grafik) yozing", "Yangiliklarni sekin tezlikda tinglang"],
  },
  {
    id: "4급",
    title: "O‘rta (4-daraja)",
    exam: "TOPIK II · 150+ ball (300 dan)",
    hours: "≈ 800 soat (jami)",
    words: "≈ 4 000–5 000 so‘z",
    goals: [
      "Yangiliklar va gazeta maqolalarining asosiy mazmunini tushunadi",
      "Ijtimoiy va mavhum mavzularda izchil gapiradi",
      "Ish joyida rasmiy hujjat va xatlarni tushunadi",
      "54-esse (600–700 belgi) yozishni boshlaydi",
    ],
    topics: ["Iqtisodiyot", "Atrof-muhit", "Texnologiya", "Jamiyat muammolari", "Mehnat", "OAV"],
    grammarLevel: 4,
    tips: ["Sinonim grammatikalarni farqi bilan o‘rganing (-느라고 / -는 바람에 / -기 때문에)", "54 uchun «서론–본론–결론» qolipini yodlang"],
  },
  {
    id: "5급",
    title: "Yuqori (5-daraja)",
    exam: "TOPIK II · 190+ ball (300 dan)",
    hours: "≈ 1 000 soat (jami)",
    words: "≈ 6 000 so‘z",
    goals: ["Kasbiy va ilmiy matnlarni tushunadi", "Rasmiy vaziyatlarda (taqdimot, majlis) gapiradi", "Iboralar va maqollarni ishlatadi"],
    topics: ["Siyosat va huquq", "Fan", "San’at", "Tarix", "Falsafa va qadriyatlar"],
    grammarLevel: 5,
    tips: ["Gazetaning tahririyat maqolalarini o‘qing", "Har kuni bitta maqol yoki 사자성어 o‘rganing"],
  },
  {
    id: "6급",
    title: "Yuqori (6-daraja)",
    exam: "TOPIK II · 230+ ball (300 dan)",
    hours: "1 200+ soat (jami)",
    words: "7 000+ so‘z",
    goals: ["Ona tili egasiga yaqin darajada tushunadi va gapiradi", "Murakkab, mavhum mavzularda erkin yozadi"],
    topics: ["Har qanday mavzu", "Akademik yozuv"],
    grammarLevel: 6,
    tips: ["54-esseni vaqt bilan (50 daqiqa) muntazam yozib, AI bilan tekshiring"],
  },
  {
    id: "eps",
    title: "EPS-TOPIK (Koreyaga ishga borish)",
    exam: "EPS-TOPIK · 100 ball: ishlab chiqarish 60+, boshqa sohalar 45+",
    hours: "≈ 150–250 soat",
    words: "≈ 1 500 so‘z (ish joyi va xavfsizlik so‘zlari bilan)",
    goals: [
      "Ish joyida buyruq va tushuntirishlarni tushunadi",
      "Asboblar, uskunalar va xavfsizlik belgilarini taniydi",
      "Ish vaqti, maosh, ta’til, shartnoma so‘zlarini biladi",
      "Yotoqxona, kasalxona, bank, transportda o‘z ishini bajaradi",
    ],
    topics: ["Salomlashish va ish joyi odobi", "Yotoqxona hayoti", "Asboblar va uskunalar", "Xavfsizlik belgilari", "Ish vaqti va maosh", "Kasalxona va jarohat", "Bank va pul o‘tkazish", "Koreya madaniyati"],
    grammarLevel: 2,
    tips: [
      "Xavfsizlik belgilarini 4 guruh bo‘yicha yodlang: 금지 (qizil), 경고 (sariq), 지시 (ko‘k), 안내 (yashil)",
      "Tinglashda o‘xshash tovushli so‘zlarni farqlang: 발/팔/빨, 자다/차다/짜다",
      "HanUstoz → Testlar → EPS-TOPIK mock testini imtihon rejimida yeching",
    ],
  },
];
