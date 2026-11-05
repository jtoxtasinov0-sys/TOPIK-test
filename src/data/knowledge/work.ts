// EPS-TOPIK va Koreyada ishlash bo'yicha ustoz eslatmalari: xavfsizlik belgilari, asboblar, ish joyi iboralari,
// mehnat huquqlari va foydali raqamlar. HanUstoz uchun original yozilgan.
// Raqamlar (maosh, muddatlar) o'zgarishi mumkin — o'quvchiga doim rasmiy manbadan tekshirishni tavsiya qiling.

export type WorkNote = { id: string; title: string; points: string[]; keys: string[]; tags: string[] };

const w = (id: string, title: string, keys: string, tags: string[], points: string[]): WorkNote => ({
  id,
  title,
  points,
  keys: keys.split(" ").filter(Boolean),
  tags,
});

export const WORK_NOTES: WorkNote[] = [
  w("eps-exam", "EPS-TOPIK imtihoni haqida", "EPS 고용허가제", ["eps", "imtihon", "ishchi", "e-9", "viza"], [
    "EPS-TOPIK (고용허가제 한국어능력시험) — E-9 viza bilan Koreyaga ishga boruvchilar uchun HRD Korea (한국산업인력공단) imtihoni.",
    "Tuzilma: o‘qish (읽기) 20 savol + tinglash (듣기) 20 savol, jami 40 savol, 50 daqiqa, 100 ball.",
    "Daraja berilmaydi: sohalar bo‘yicha minimal ball (ishlab chiqarish 60, boshqa sohalar 45) dan o‘tganlar ball reytingi bo‘yicha tanlanadi.",
    "Mavzular: kundalik hayot, ish joyi, asboblar, xavfsizlik belgilari va qoidalari, mehnat qoidalari, Koreya madaniyati.",
    "Imtihon tartibi va ballar o‘zgarishi mumkin — har bir mavsum oldidan rasmiy e’lonni (epstopik.hrdkorea.or.kr) tekshiring.",
  ]),
  w("signs-prohibit", "Taqiqlovchi belgilar (금지표지) — qizil doira, chiziqli", "금지 금연 출입금지 화기금지 사용금지 탑승금지 보행금지", ["xavfsizlik", "belgi", "taqiq", "qizil"], [
    "출입 금지 — kirish taqiqlanadi; 보행 금지 — piyoda yurish taqiqlanadi; 차량 통행 금지 — transport o‘tishi taqiqlanadi.",
    "사용 금지 — ishlatish taqiqlanadi; 탑승 금지 — minish taqiqlanadi; 물체 이동 금지 — narsalarni ko‘chirish taqiqlanadi.",
    "금연 — chekish taqiqlanadi; 화기 금지 — ochiq olov taqiqlanadi.",
  ]),
  w("signs-warn", "Ogohlantiruvchi belgilar (경고표지) — sariq uchburchak", "경고 주의 고압전기 낙하물 인화성 폭발성 부식성 고온 저온", ["xavfsizlik", "belgi", "ogohlantirish", "sariq"], [
    "고압 전기 경고 — yuqori kuchlanish; 낙하물 경고 — yuqoridan narsa tushishi mumkin; 매달린 물체 경고 — osilgan yuk.",
    "인화성 물질 경고 — tez yonuvchi modda; 폭발성 물질 경고 — portlovchi modda; 부식성 물질 경고 — yemiruvchi (kislota va h.k.).",
    "급성 독성 물질 경고 — zaharli modda; 고온/저온 경고 — juda issiq/sovuq; 몸 균형 상실 경고 — yiqilish xavfi.",
  ]),
  w("signs-order", "Majburiy belgilar (지시표지) — ko‘k doira", "지시 착용 안전모 보안경 안전화 안전장갑 귀마개 마스크", ["xavfsizlik", "belgi", "majburiy", "ko‘k", "kiyish"], [
    "안전모 착용 — kaska kiying; 보안경 착용 — himoya ko‘zoynagi; 보안면 착용 — yuz niqobi.",
    "안전화 착용 — himoya poyabzali; 안전장갑 착용 — himoya qo‘lqopi; 귀마개 착용 — quloqchin; 안전복 착용 — himoya kiyimi.",
    "방진 마스크 — changdan, 방독 마스크 — zaharli gazdan himoya niqobi.",
    "Fe’llar: 모자·안전모를 쓰다, 장갑을 끼다, 안전화를 신다, 안전복을 입다, 마스크를 쓰다 — o‘zbekchadagi bitta «kiymoq» o‘rniga har xil fe’l!",
  ]),
  w("signs-guide", "Yo‘l ko‘rsatuvchi belgilar (안내표지) — yashil", "안내 비상구 응급구호 녹십자 세안장치 들것", ["xavfsizlik", "belgi", "yashil", "favqulodda"], [
    "비상구 — favqulodda chiqish; 좌측/우측 비상구 — chap/o‘ng tomondagi chiqish.",
    "응급구호 표지 — birinchi yordam; 들것 — zambil; 세안 장치 — ko‘z yuvish moslamasi; 녹십자 표지 — xavfsizlik (yashil xoch).",
  ]),
  w("tools", "Asboblar va uskunalar", "망치 드라이버 스패너 펜치 톱 줄자 사다리 삽 드릴 용접 지게차 공구", ["asbob", "uskuna", "tool"], [
    "망치 — bolg‘a, 드라이버 — otvyortka, 스패너 — kalit (gaykalar uchun), 펜치 — ombir, 니퍼 — kusachka, 톱 — arra.",
    "줄자 — ruletka, 사다리 — narvon, 삽 — belkurak, 드릴 — drel, 그라인더 — jilvir, 용접기 — payvandlash apparati.",
    "못 — mix, 나사 — vint, 볼트/너트 — bolt/gayka, 지게차 — yuk ko‘targich (pogruzchik), 손수레 — qo‘l arava.",
  ]),
  w("phrases", "Ish joyida kerakli iboralar", "반장님 다시한번 천천히 고장 다쳤어요 도와주세요", ["ibora", "ish joyi", "brigadir", "gapirish"], [
    "다시 한번 말씀해 주세요. — Yana bir bor aytib bering. / 천천히 말씀해 주세요. — Sekinroq gapiring.",
    "이건 어떻게 해요? — Buni qanday qilaman? / 이렇게 하면 돼요? — Shunday qilsam bo‘ladimi?",
    "반장님, 기계가 고장 났어요. — Brigadir, uskuna buzildi. / 손을 다쳤어요. 도와주세요. — Qo‘limni jarohatladim, yordam bering.",
    "몸이 안 좋아서 병원에 가고 싶어요. — Mazam yo‘q, kasalxonaga bormoqchiman.",
    "오늘 몇 시까지 일해요? — Bugun soat nechagacha ishlaymiz? / 월급날이 언제예요? — Maosh qachon beriladi?",
  ]),
  w("work-words", "Ish vaqti va maosh so‘zlari", "출근 퇴근 야근 특근 잔업 교대 주간 야간 월급 급여 수당 휴가", ["maosh", "ish vaqti", "smena", "ta’til"], [
    "출근/퇴근 — ishga kelish/ketish, 야근 — kechki ish, 잔업 — qo‘shimcha ish, 특근 — dam olish kunidagi ish, 교대 근무 — smenali ish (주간/야간 — kunduzgi/tungi).",
    "월급/급여 — maosh, 기본급 — asosiy maosh, 수당 — ustama, 공제 — ushlab qolinadigan summa, 실 지급액 — qo‘lga tegadigan summa, 급여 명세서 — maosh varaqasi.",
    "휴가 — ta’til, 연차 — yillik ta’til, 병가 — kasallik ta’tili, 휴일 — dam olish kuni.",
  ]),
  w("rights", "Mehnat huquqlari (asosiy)", "근로계약서 최저임금 주휴수당 연장근로 산재 퇴직금 출국만기보험", ["huquq", "shartnoma", "maosh", "sug‘urta", "ishchi"], [
    "Mehnat shartnomasi (근로계약서) nusxasini albatta qo‘lingizga oling.",
    "2026-yil minimal ish haqi — soatiga 10 320 von (oyiga 209 soat hisobida 2 156 880 von). Har yili yangilanadi.",
    "5 va undan ko‘p ishchili korxonalarda qo‘shimcha (연장), tungi (22:00–06:00) va dam olish kunidagi ish uchun kamida 50% ustama to‘lanadi.",
    "Haftasiga 15 soatdan ko‘p ishlab, belgilangan kunlarning barchasiga chiqsangiz, haftalik pullik dam olish kuni (주휴수당) beriladi.",
    "Ishda jarohatlansangiz, ish beruvchi sug‘urtaga a’zo bo‘lmagan bo‘lsa ham 산재보험 (근로복지공단) orqali tovon olish mumkin.",
    "E-9 ishchilar sug‘urtalari: 출국만기보험 (ish beruvchi to‘laydi, ketishda olasiz), 임금체불보증보험 (ish beruvchi), 귀국비용보험 va 상해보험 (ishchi).",
    "Bu umumiy ma’lumot: aniq holat uchun 1350 (mehnat vazirligi) yoki 1577-0071 (xorijiy ishchilar maslahat markazi) ga murojaat qiling.",
  ]),
  w("phones", "Foydali raqamlar", "112 119 1345 1350 1330", ["telefon", "raqam", "favqulodda", "yordam"], [
    "112 — politsiya, 119 — yong‘in va tez yordam.",
    "1345 — xorijliklar uchun ma’lumot markazi (viza, migratsiya, ko‘p tilli), 1350 — mehnat vazirligi (maosh, shartnoma muammolari).",
    "1577-0071 — xorijiy ishchilar maslahat markazi, 1330 — sayyohlar uchun tarjima va ma’lumot liniyasi.",
  ]),
  w("culture", "Ish joyi madaniyati", "인사 회식 반장 조장 과장 사장 예절", ["madaniyat", "odob", "ish joyi", "hurmat", "boshliq", "murojaat"], [
    "Salomlashganda biroz egilib ta’zim qiling (안녕하세요 / 수고하셨습니다 — ishdan ketayotganda).",
    "Kattalarga narsani ikki qo‘llab bering va oling; ovqatni katta odam boshlaganidan keyin boshlang.",
    "Lavozim bilan murojaat qiling: 반장님, 조장님, 과장님, 사장님. 당신 so‘zini ishlatmang.",
    "Vaqtga juda qattiq rioya qilinadi: kechiksangiz, oldindan qo‘ng‘iroq qilib ayting (늦어서 죄송합니다).",
    "회식 — jamoaviy kechki ovqat; ichishni xohlamasangiz, muloyim rad eting: 죄송하지만 술을 못 마셔요.",
  ]),
  w("arrival", "Koreyaga kelgandan keyin", "외국인등록증 출입국 통장 건강보험", ["hujjat", "id karta", "bank", "kelish"], [
    "Kelganingizdan keyin 90 kun ichida xorijlik ID kartasini (외국인 등록증) olish kerak (출입국·외국인청).",
    "Bank hisobi (통장) uchun pasport va 외국인 등록증 kerak bo‘ladi; vatanga pul o‘tkazish (해외 송금) uchun ham.",
    "Kasallansangiz, avval 의원/병원 ga boring; 건강보험 kartangiz bo‘lsa, xarajatning katta qismini sug‘urta qoplaydi.",
  ]),
];
