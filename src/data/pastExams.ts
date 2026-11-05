// TOPIK rasmiy saytida (topik.go.kr → 학습하기 → 토픽 기출문제 풀어보기) ochiq e’lon qilingan o‘tgan testlar.
// Savollar NIIED (국립국제교육원) mualliflik huquqi ostida, shuning uchun ilovaga ko‘chirilmagan:
// har bir tugma rasmiy saytdagi o‘sha testni (audio bilan) yangi oynada ochadi.
// Ma’lumot 2026-yil noyabr holatiga tekshirilgan.

export type PastRound = { no: number; year: number; note?: string };

export const PAST_ROUNDS: PastRound[] = [
  { no: 102, year: 2025, note: "Eng so‘nggi ochiq test" },
  { no: 96, year: 2024 },
  { no: 91, year: 2023 },
  { no: 83, year: 2022 },
  { no: 64, year: 2019 },
  { no: 60, year: 2018 },
  { no: 52, year: 2017 },
  { no: 47, year: 2016 },
  { no: 41, year: 2015 },
  { no: 37, year: 2014 },
  { no: 36, year: 2014 },
  { no: 35, year: 2014, note: "Yangi tuzilmadagi birinchi test (2014.07.20)" },
];

export type PastPart = { grade: 1 | 2; type: "h" | "r"; label: string; minutes: number; count: number };

export const PAST_PARTS: PastPart[] = [
  { grade: 1, type: "h", label: "TOPIK I · 듣기", minutes: 40, count: 30 },
  { grade: 1, type: "r", label: "TOPIK I · 읽기", minutes: 60, count: 40 },
  { grade: 2, type: "h", label: "TOPIK II · 듣기", minutes: 60, count: 50 },
  { grade: 2, type: "r", label: "TOPIK II · 읽기", minutes: 70, count: 50 },
];

export const pastUrl = (no: number, grade: 1 | 2, type: "h" | "r") =>
  `https://www.topik.go.kr/TWSTDY/TWSTDY0090.do?sNo=${no}&sGrade=${grade}&sType=${type}`;

export const OFFICIAL_LINKS = [
  { href: "https://www.topik.go.kr/TWSTDY/TWSTDY0080.do", t: "Barcha o‘tgan testlar (기출문제)", d: "Rasmiy sahifa: 12 ta sessiya, audio bilan" },
  { href: "https://www.topik.go.kr/TWSTDY/TWSTDY0110.do", t: "토픽 기초 풀어보기", d: "Rasmiy boshlang‘ich mashqlar" },
  { href: "https://www.topik.go.kr/TWSTDY/TWSTDY0210.do", t: "TOPIK IBT sinovi", d: "Kompyuterda topshiriladigan TOPIK’ni sinab ko‘rish" },
  { href: "https://www.topik.go.kr/TWSTDY/TWSTDY0310.do", t: "TOPIK Speaking sinovi", d: "Og‘zaki imtihon (말하기 평가) namunasi" },
  { href: "https://www.topik.go.kr/TWGUID/TWGUID0020.do", t: "Imtihon jadvali", d: "Ro‘yxatdan o‘tish va natija sanalari" },
];

// Rasmiy TOPIK tuzilmasidagi savol turlari (o‘tgan testlar tahlili asosida).
// Bu — format ma’lumoti, savollarning o‘zi emas.
export type QType = { range: string; ko: string; uz: string; tip: string };

export const QTYPES: Record<"t1l" | "t1r" | "t2l" | "t2r" | "t2w", { title: string; items: QType[] }> = {
  t1l: {
    title: "TOPIK I · 듣기 (30 savol, 40 daqiqa, 100 ball)",
    items: [
      { range: "1–4", ko: "알맞은 대답 고르기", uz: "Savolga mos javob", tip: "네/아니요 savolida fe’l va inkorga e’tibor bering; 뭐·언제·어디 savolida aynan shu ma’lumotni toping" },
      { range: "5–6", ko: "이어지는 말 고르기", uz: "Davom etadigan javob (odob iboralari)", tip: "축하해요, 괜찮아요, 잘 먹겠습니다 kabi tayyor iboralarni yodlang" },
      { range: "7–10", ko: "장소 고르기", uz: "Bu qayer?", tip: "Kalit so‘z: 빌리다 → 도서관, 보내다 → 우체국, 바꾸다(돈) → 은행" },
      { range: "11–14", ko: "화제 고르기", uz: "Nima haqida gapirilyapti?", tip: "Bitta umumiy so‘z: 날씨, 가족, 취미, 계절, 가격, 직업" },
      { range: "15–16", ko: "알맞은 그림 고르기", uz: "Mos rasm", tip: "Kim nima qilyapti va qayerda — ikkalasini birga tekshiring" },
      { range: "17–21", ko: "내용과 같은 것 고르기", uz: "Matnga mos variant", tip: "Variantlarda erkak/ayol almashtirilgan bo‘ladi — kim aytganini belgilang" },
      { range: "22–24", ko: "여자의 중심 생각", uz: "Ayolning asosiy fikri", tip: "Odatda oxirgi gapda: -는 게 좋겠어요, -아야 해요" },
      { range: "25–26", ko: "안내 방송 (2문항)", uz: "E’lon: maqsad va mazmun", tip: "Birinchi gapda kim gapirayotgani va nima uchun — maqsad shu" },
      { range: "27–28", ko: "대화 (2문항)", uz: "Suhbat: mavzu va mazmun", tip: "27 — nima haqida, 28 — mos tafsilot" },
      { range: "29–30", ko: "인터뷰 (2문항)", uz: "Intervyu: sabab va mazmun", tip: "왜 savoli bo‘lsa -아서/-기 때문에 qismini kuting" },
    ],
  },
  t1r: {
    title: "TOPIK I · 읽기 (40 savol, 60 daqiqa, 100 ball)",
    items: [
      { range: "31–33", ko: "무엇에 대한 내용", uz: "Nima haqida? (2 gap)", tip: "Ikkala gapni birlashtiruvchi umumiy so‘z: 나이, 가족, 날씨…" },
      { range: "34–39", ko: "빈칸 채우기 (조사·어휘)", uz: "Bo‘sh joyga so‘z/qo‘shimcha", tip: "Qo‘shimchalar (을/를, 에서, 도, 만) va fe’l–ot moslashuvi" },
      { range: "40–42", ko: "안내문 — 맞지 않는 것", uz: "E’lon/afisha — mos KELMAYDIGANI", tip: "Diqqat: bu yerda noto‘g‘risi so‘raladi! Sana, vaqt, narxni solishtiring" },
      { range: "43–45", ko: "내용과 같은 것", uz: "Qisqa matnga mos variant", tip: "Variantdagi har bir so‘zni matn bilan tekshiring" },
      { range: "46–48", ko: "중심 생각", uz: "Muallifning asosiy fikri", tip: "Ko‘pincha oxirgi gap: -고 싶어요, -(으)려고 해요" },
      { range: "49–56", ko: "긴 글 (2문항씩)", uz: "Uzunroq matn: bo‘sh joy + mazmun", tip: "Avval savollarni o‘qing, keyin matnni" },
      { range: "57–58", ko: "순서 배열", uz: "Gaplarni tartiblash", tip: "Birinchi gap 이/그/그래서 bilan boshlanmaydi" },
      { range: "59–70", ko: "긴 글 (2문항씩)", uz: "Gap joylashtirish, sabab, maqsad, mazmun", tip: "<보기> gapini qo‘yganda oldingi va keyingi gapning mantiqiy bog‘lanishini tekshiring" },
    ],
  },
  t2l: {
    title: "TOPIK II · 듣기 (50 savol, 60 daqiqa, 100 ball)",
    items: [
      { range: "1–3", ko: "그림·그래프 고르기", uz: "Rasm va grafik", tip: "3-savol — grafik: eng ko‘p/kam va o‘sish/kamayish tartibi" },
      { range: "4–8", ko: "이어질 수 있는 말", uz: "Davom etadigan gap", tip: "Oxirgi replika kimniki — javob unga mos bo‘lishi kerak" },
      { range: "9–12", ko: "이어서 할 행동", uz: "Ayol keyin nima qiladi?", tip: "Oxirida 그럼 제가 -(으)ㄹ게요 deganini tinglang" },
      { range: "13–16", ko: "내용과 같은 것", uz: "Matnga mos variant (suhbat, e’lon, yangilik)", tip: "Raqam va sanalarni yozib boring" },
      { range: "17–20", ko: "남자의 중심 생각", uz: "Erkakning asosiy fikri", tip: "-는 게 좋다, -아야 한다, -(으)면 좋겠다 — fikr shu yerda" },
      { range: "21–50", ko: "2문항씩 (대화·강연·토론·다큐)", uz: "Juft savollar: fikr, maqsad, munosabat, mazmun", tip: "Audio 2 marta o‘qiladi: birinchisida umumiy fikrni, ikkinchisida tafsilotni tinglang; savollarni oldindan o‘qing" },
    ],
  },
  t2r: {
    title: "TOPIK II · 읽기 (50 savol, 70 daqiqa, 100 ball)",
    items: [
      { range: "1–2", ko: "빈칸 (문법)", uz: "Bo‘sh joyga grammatika", tip: "-느라고, -다가, -(으)ㄹ 텐데 kabi bog‘lovchilar" },
      { range: "3–4", ko: "의미가 비슷한 것", uz: "Ma’nosi yaqin grammatika", tip: "-는 바람에 = -아서 (salbiy sabab), -(으)ㄹ 뿐만 아니라 = -고 또" },
      { range: "5–8", ko: "무엇에 대한 글", uz: "Reklama/e’lon nima haqida?", tip: "Kalit so‘z: 화면, 배터리 → telefon; 예약, 객실 → mehmonxona" },
      { range: "9–12", ko: "내용과 같은 것", uz: "E’lon, grafik va matnga mos variant", tip: "Grafikda foiz va yillarni solishtiring" },
      { range: "13–15", ko: "순서 배열", uz: "Gaplarni tartiblash", tip: "그러나/그래서/이 bilan boshlangan gap birinchi bo‘lmaydi" },
      { range: "16–18", ko: "빈칸 (내용)", uz: "Bo‘sh joyga mazmun", tip: "Bo‘sh joydan oldingi va keyingi gapga mos ibora" },
      { range: "19–24", ko: "2문항씩", uz: "Bog‘lovchi so‘z, ibora, muallif hissi, mazmun", tip: "Iboralarni (관용 표현) o‘rganing: 발이 넓다, 손이 크다" },
      { range: "25–27", ko: "신문 기사 제목", uz: "Gazeta sarlavhasini tushuntirish", tip: "Sarlavhadagi qisqa so‘zlar: 껑충 = keskin oshdi, 주춤 = to‘xtab qoldi" },
      { range: "28–31", ko: "빈칸 (긴 글)", uz: "Uzun matnda bo‘sh joy", tip: "Bo‘sh joy odatda matnning asosiy g‘oyasini to‘ldiradi" },
      { range: "32–34", ko: "내용과 같은 것", uz: "Ilmiy-ommabop matnga mos variant", tip: "Variantlardagi 항상, 모든, 반드시 kabi so‘zlar ko‘pincha noto‘g‘ri" },
      { range: "35–38", ko: "주제 고르기", uz: "Matn mavzusi", tip: "Muallif nimani da’vo qilyapti — misollar emas, xulosa" },
      { range: "39–41", ko: "문장 넣기", uz: "<보기> gapini joylashtirish", tip: "Gapdagi 이러한, 그 결과, 하지만 so‘zlari qayerga bog‘lanishini ko‘rsatadi" },
      { range: "42–50", ko: "2문항씩 (소설·논설)", uz: "Hikoya, publitsistika: his, mazmun, maqsad", tip: "Hikoyada qahramonning hissini (서운하다, 담담하다) bilish kerak" },
    ],
  },
  t2w: {
    title: "TOPIK II · 쓰기 (4 topshiriq, 50 daqiqa, 100 ball)",
    items: [
      { range: "51", ko: "실용문 빈칸 (10점)", uz: "E’lon/xatdagi 2 ta bo‘sh joy", tip: "Rasmiy uslub (-습니다/-(으)ㅂ시오) va oldingi gapga moslik" },
      { range: "52", ko: "설명문 빈칸 (10점)", uz: "Ilmiy matndagi 2 ta bo‘sh joy", tip: "-(으)ㄴ/는다 uslubida yozing; 그러나/따라서 mantig‘iga qarang" },
      { range: "53", ko: "그래프 설명 (30점, 200~300자)", uz: "Grafik/jadvalni tasvirlash", tip: "Kirish → o‘zgarish (증가/감소) → sabab → kelajak; o‘z fikringizni qo‘shmang" },
      { range: "54", ko: "논술문 (50점, 600~700자)", uz: "Mavzu bo‘yicha esse", tip: "Kirish–asosiy qism–xulosa; savoldagi 3 ta topshiriqning har biriga javob bering; -(으)ㄴ/는다 uslubi" },
    ],
  },
};
