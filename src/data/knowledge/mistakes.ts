// O'zbek tilida so'zlashuvchilarga xos xatolar va o'xshashliklar (talaffuz, grammatika, odob, imlo).
// HanUstoz uchun original yozilgan. AI Ustoz o'quvchining gapiga mos keladigan bandlarni shu yerdan oladi.

export type MistakeArea = "talaffuz" | "grammatika" | "odob" | "imlo" | "afzallik";

export type Mistake = {
  id: string;
  area: MistakeArea;
  title: string;
  wrong?: string;
  right?: string;
  why: string; // o'zbekcha izoh
  keys: string[]; // koreyscha qidiruv bo'laklari
  tags: string[]; // o'zbekcha qidiruv so'zlari
};

const m = (id: string, area: MistakeArea, title: string, why: string, opts: { wrong?: string; right?: string; keys?: string; tags?: string[] } = {}): Mistake => ({
  id,
  area,
  title,
  why,
  wrong: opts.wrong,
  right: opts.right,
  keys: (opts.keys ?? "").split(" ").filter(Boolean),
  tags: opts.tags ?? [],
});

export const MISTAKES: Mistake[] = [
  // ---------- Afzalliklar (o'quvchini ruhlantirish uchun) ----------
  m(
    "sov",
    "afzallik",
    "So‘z tartibi o‘zbek tiliga o‘xshaydi",
    "Ikkala tilda ham ega — to‘ldiruvchi — kesim (SOV): «Men non yeyman» = 저는 빵을 먹어요. Qo‘shimchalar so‘z oxiriga qo‘shiladi (을/를 ≈ -ni, 에 ≈ -ga, 에서 ≈ -da/-dan), aniqlovchi otdan oldin keladi. Bu o‘zbeklar uchun katta afzallik.",
    { tags: ["so‘z tartibi", "o‘xshash", "afzallik", "qo‘shimcha"] }
  ),
  m(
    "ng",
    "afzallik",
    "ㅇ 받침 = o‘zbekcha «ng»",
    "Bo‘g‘in oxiridagi ㅇ o‘zbekcha «tong», «ming» so‘zlaridagi «ng» kabi o‘qiladi: 강 [gang], 방 [bang]. Bo‘g‘in boshidagi ㅇ esa umuman o‘qilmaydi: 아 [a].",
    { keys: "ㅇ 받침", tags: ["ng", "talaffuz", "받침"] }
  ),

  // ---------- Talaffuz ----------
  m(
    "eo-o",
    "talaffuz",
    "ㅓ va ㅗ ni farqlash",
    "ㅗ — lablar yumaloq, o‘zbekcha «o» ga yaqin. ㅓ — lablar yumaloqlanmaydi, og‘iz kengroq ochiladi, «o» va «a» o‘rtasidagi tovush. 서울 [seoul] ni «so‘ul» deb aytmang. Mashq: 거기 / 고기, 어서 / 오세요.",
    { wrong: "서울 → «Soul»", right: "서울 → [sʌ-ul]", keys: "ㅓ ㅗ 어 오 서울 고기 거기", tags: ["talaffuz", "unli", "o", "eo"] }
  ),
  m(
    "eu",
    "talaffuz",
    "ㅡ tovushi",
    "O‘zbek tilida aniq juftligi yo‘q. Lablar cho‘zilib (tabassum kabi), til orqaga tortiladi; rus tilidagi «ы» ga yaqin, lekin yumshoqroq. 으, 음식, 크다. Xorijiy so‘zlarda ham ko‘p: 버스 [beoseu], 커피.",
    { keys: "ㅡ 으 음식", tags: ["talaffuz", "unli", "eu", "ы"] }
  ),
  m(
    "ae-e",
    "talaffuz",
    "ㅐ va ㅔ",
    "Hozirgi Seul talaffuzida ㅐ va ㅔ deyarli bir xil eshitiladi (o‘zbekcha «e»). Gapirishda xavotir olmang, lekin imloda farq muhim: 개 (it) / 게 (qisqichbaqa), 내 (mening) / 네 (sening).",
    { keys: "ㅐ ㅔ 개 게 내 네", tags: ["talaffuz", "imlo", "e"] }
  ),
  m(
    "three-way",
    "talaffuz",
    "ㄱ/ㅋ/ㄲ, ㄷ/ㅌ/ㄸ, ㅂ/ㅍ/ㅃ, ㅈ/ㅊ/ㅉ — uch xil undosh",
    "O‘zbek tilida jarangli/jarangsiz farqi bor, koreyschada esa: oddiy (ㄱ — so‘z boshida yarim jarangsiz), nafasli (ㅋ — kuchli havo bilan), tarang (ㄲ — havosiz, tomoq tarang). Mashq: 가다 / 카드 / 까다, 불 / 풀 / 뿔, 자다 / 차다 / 짜다. Qog‘ozni og‘izga yaqin tuting: ㅋ da qog‘oz qimirlaydi, ㄲ da qimirlamaydi.",
    { keys: "ㄲ ㄸ ㅃ ㅉ ㅆ ㅋ ㅌ ㅍ ㅊ 짜다 차다 자다 불 풀 뿔", tags: ["talaffuz", "undosh", "tarang", "nafasli"] }
  ),
  m(
    "rieul",
    "talaffuz",
    "ㄹ — «r» emas, yengil tovush",
    "O‘zbekcha «r» kuchli titraydi — koreyschada titratmang. Unlilar orasida ㄹ tilning bir marta yengil tegishi (나라 [nara]); bo‘g‘in oxirida va ㄹㄹ bo‘lganda «l» (말 [mal], 빨리 [ppalli]).",
    { keys: "ㄹ 나라 빨리 말", tags: ["talaffuz", "r", "l"] }
  ),
  m(
    "batchim7",
    "talaffuz",
    "받침 — faqat 7 xil tovush",
    "Bo‘g‘in oxirida faqat 7 tovush eshitiladi: ㄱ, ㄴ, ㄷ, ㄹ, ㅁ, ㅂ, ㅇ. Masalan 옷 [옫], 꽃 [꼳], 부엌 [부억], 앞 [압]. Oxirgi undoshni «otib» yubormang — og‘iz yopiladi, lekin havo chiqmaydi.",
    { keys: "받침 옷 꽃 앞 부엌", tags: ["talaffuz", "받침", "oxirgi undosh"] }
  ),
  m(
    "liaison",
    "talaffuz",
    "Bog‘lanish (연음): 받침 keyingi unliga o‘tadi",
    "받침 dan keyin unli kelsa, undosh keyingi bo‘g‘inga «ko‘chadi»: 한국어 [한구거], 음악 [으막], 옷이 [오시]. Bu qoidani bilmasangiz, tinglashda so‘zlarni tanimaysiz.",
    { keys: "한국어 음악 연음", tags: ["talaffuz", "bog‘lanish", "tinglash"] }
  ),
  m(
    "nasal",
    "talaffuz",
    "Burun tovushiga o‘tish (비음화)",
    "ㄱ/ㄷ/ㅂ dan keyin ㄴ yoki ㅁ kelsa, ular ㅇ/ㄴ/ㅁ bo‘lib o‘qiladi: 합니다 [함니다], 감사합니다 [감사함니다], 국물 [궁물], 거짓말 [거진말].",
    { keys: "합니다 습니다 국물 비음화", tags: ["talaffuz", "burun", "-ㅂ니다"] }
  ),
  m(
    "h-drop",
    "talaffuz",
    "ㅎ ning tushishi va qo‘shilishi",
    "Unlilar va ㄴ/ㄹ/ㅁ orasida ㅎ deyarli eshitilmaydi: 좋아요 [조아요], 많이 [마니]. ㄱ/ㄷ/ㅂ/ㅈ bilan qo‘shilsa nafasli bo‘ladi: 축하 [추카], 좋다 [조타].",
    { keys: "좋아요 많이 축하 좋다", tags: ["talaffuz", "h"] }
  ),

  // ---------- Grammatika ----------
  m(
    "e-eseo",
    "grammatika",
    "에 va 에서 ni adashtirish (o‘zbekcha «-da» ikkalasiga to‘g‘ri keladi)",
    "«Uyda bor» → 집에 있어요 (mavjudlik — 에). «Uyda o‘qiyman» → 집에서 공부해요 (harakat — 에서). O‘zbekchada ikkalasi «-da», shuning uchun xato ko‘p uchraydi.",
    { wrong: "공장에 일해요", right: "공장에서 일해요", keys: "에서 에 일해요 공부해요", tags: ["-da", "joy", "에 에서"] }
  ),
  m(
    "topic-subject",
    "grammatika",
    "은/는 va 이/가",
    "O‘zbek tilida bunday farq yo‘q. Oddiy qoida: o‘zingiz haqingizda yoki taqqoslashda — 은/는 (저는 …); yangi ma’lumot, «kim/nima?» savoliga javob va 있다/없다/아프다/좋다 bilan — 이/가 (누가 왔어요? 민수가 왔어요).",
    { keys: "은/는 이/가 저는 제가", tags: ["은/는", "이/가", "ega"] }
  ),
  m(
    "like",
    "grammatika",
    "좋다 va 좋아하다",
    "«Olmani yaxshi ko‘raman» → 사과를 좋아해요 (fe’l, -ni bilan) yoki 사과가 좋아요 (sifat, 이/가 bilan). Aralashtirib 사과를 좋아요 ✗ demang. 싫다/싫어하다 ham shunday.",
    { wrong: "사과를 좋아요", right: "사과를 좋아해요 / 사과가 좋아요", keys: "좋아요 좋아해요 싫어요 싫어해요", tags: ["yoqtirmoq", "yaxshi ko‘rmoq"] }
  ),
  m(
    "meet",
    "grammatika",
    "만나다 — «bilan» emas, 을/를",
    "O‘zbekcha «do‘st bilan uchrashmoq», lekin koreyschada 친구를 만나다. 친구와 만나다 ham to‘g‘ri, lekin 친구에게 만나다 ✗ — xato.",
    { wrong: "친구에게 만났어요", right: "친구를 만났어요", keys: "만나 만났", tags: ["uchrashmoq"] }
  ),
  m(
    "self-honorific",
    "grammatika",
    "-시- ni o‘zingizga ishlatmang",
    "Hurmat qo‘shimchasi -(으)시- faqat boshqa odamga (ayniqsa kattalarga) nisbatan: 사장님이 오세요. O‘zingiz haqingizda: 제가 갈게요 / 저는 가요. 제가 가세요 ✗, 저는 학생이세요 ✗.",
    { wrong: "제가 가세요", right: "제가 갈게요", keys: "세요 시 제가", tags: ["hurmat", "-시-"] }
  ),
  m(
    "counting",
    "grammatika",
    "Ikki sanoq tizimi",
    "Koreys sonlari (하나, 둘, 셋 …) — soat (세 시), dona (두 개), yosh (스무 살), odam (세 명) uchun. Xitoy-koreys sonlari (일, 이, 삼 …) — daqiqa (삼십 분), sana (5월 3일), pul (만 원), telefon raqami. 이십 살 ✗ → 스무 살 ✓; 세 시 삼십 분 ✓.",
    { wrong: "이십 살, 삼 시", right: "스무 살, 세 시", keys: "시 분 살 개 명 원 하나 둘 셋 일 이 삼", tags: ["sanoq", "son", "raqam", "soat", "yosh"] }
  ),
  m(
    "adjective-verb",
    "grammatika",
    "Sifatlar fe’l kabi tuslanadi",
    "Koreys sifatlari kesim bo‘lganda o‘zi tuslanadi, 이에요 qo‘shilmaydi: 예뻐요 ✓, 예쁘다예요 ✗; 바빠요 ✓. Aniqlovchi bo‘lsa -(으)ㄴ: 예쁜 꽃, 바쁜 사람.",
    { wrong: "날씨가 좋다예요", right: "날씨가 좋아요", keys: "예뻐요 좋아요 바빠요", tags: ["sifat", "tuslanish"] }
  ),
  m(
    "past-cause",
    "grammatika",
    "-아서/어서 oldidan o‘tgan zamon qo‘yilmaydi",
    "늦었어서 ✗ → 늦어서 ✓; 아팠어서 ✗ → 아파서 ✓. Zamon gap oxirida ko‘rsatiladi: 아파서 못 갔어요.",
    { wrong: "늦었어서 죄송해요", right: "늦어서 죄송해요", keys: "었어서 았어서 했어서", tags: ["sabab", "o‘tgan zamon", "-아서"] }
  ),

  // ---------- Odob va nutq uslubi ----------
  m(
    "dangsin",
    "odob",
    "«Siz» = 당신 emas!",
    "O‘zbekcha/ruscha «siz/вы» ni 당신 deb tarjima qilmang — kundalik nutqda 당신 qo‘pol yoki janjal ohangida eshitiladi. Odamni ismi + 씨 (민수 씨), lavozimi + 님 (반장님, 사장님, 선생님) bilan chaqiring yoki umuman olmoshsiz gapiring: 어디에 가세요?",
    { wrong: "당신은 어디에 가요?", right: "반장님, 어디에 가세요?", keys: "당신 씨 님", tags: ["siz", "murojaat", "hurmat", "odob", "boshliq"] }
  ),
  m(
    "banmal",
    "odob",
    "Seriallardagi 반말 ni ishda ishlatmang",
    "Dramalardagi 뭐 해? 밥 먹었어? kabi -요 siz shakllar (반말) faqat yaqin do‘stlar va kichiklarga. Ish joyida, do‘konda, notanishlar bilan doim -요 yoki -(스)ㅂ니다 bilan gapiring.",
    { wrong: "반장님, 이거 뭐야?", right: "반장님, 이거 뭐예요?", keys: "반말 뭐야 했어 먹었어", tags: ["hurmat", "uslub", "반말", "ish joyi", "boshliq"] }
  ),
  m(
    "siblings",
    "odob",
    "Aka-opa so‘zlari gapiruvchining jinsiga bog‘liq",
    "Erkak gapirsa: 형 (aka), 누나 (opa). Ayol gapirsa: 오빠 (aka), 언니 (opa). Kichiklar: 동생 (남동생, 여동생). Ish joyida yoshi kattaroq hamkasbni ham 형 deb chaqirish mumkin (yaqinlashgandan keyin).",
    { keys: "형 누나 오빠 언니 동생", tags: ["oila", "aka", "opa", "murojaat"] }
  ),
  m(
    "yes-no",
    "odob",
    "Inkor savolga «네/아니요»",
    "Koreyschada 네 «gapingiz to‘g‘ri» degani: 안 가요? — 네, 안 가요 (Ha, bormayman). Rus tili ta’sirida «아니요, 안 가요» deb javob bersangiz, suhbatdosh chalg‘ishi mumkin.",
    { keys: "네 아니요 안", tags: ["ha", "yo‘q", "javob"] }
  ),

  // ---------- Imlo (TOPIK yozish) ----------
  m(
    "doe-dwae",
    "imlo",
    "되 va 돼",
    "돼 = 되어 ning qisqasi. 되어 qo‘yib ko‘ring: mos kelsa 돼, mos kelmasa 되. 안 돼요 (= 안 되어요) ✓, 되요 ✗; 되다, 되고, 되는 ✓.",
    { wrong: "안 되요", right: "안 돼요", keys: "되요 돼요 됐 되", tags: ["imlo", "되 돼"] }
  ),
  m(
    "an-anh",
    "imlo",
    "안 va 않",
    "안 — inkor so‘z (안 가요), 않 — -지 않다 ning qismi (가지 않아요). Qoida: 아니 qo‘yib ko‘ring — mos kelsa 안.",
    { wrong: "가지 안아요", right: "가지 않아요", keys: "안 않", tags: ["imlo", "inkor"] }
  ),
  m(
    "spacing",
    "imlo",
    "Bo‘sh joy (띄어쓰기)",
    "Qo‘shimchalar otga qo‘shib yoziladi (학교에서), lekin yordamchi otlar ajratiladi: 할 수 있다, 먹을 것, 간 적이 있다, 3년 동안. TOPIK yozishda bo‘sh joy xatolari ham ball kesadi.",
    { keys: "수있 수 있 것 적 띄어쓰기", tags: ["imlo", "bo‘sh joy", "yozish"] }
  ),
  m(
    "essay-style",
    "imlo",
    "TOPIK 52–54 da -아요/-습니다 emas, -다",
    "Esse va grafik tavsifi yozma uslubda yoziladi: 증가했다, 필요하다, 생각한다. -아요/-습니다 bilan yozilsa yoki 저 ishlatilsa, «언어 사용» bahosi tushadi. 53 da sarlavha yozmang, 54 da topshiriq savollarini ko‘chirmang.",
    { wrong: "저는 환경이 중요하다고 생각해요.", right: "환경은 매우 중요하다고 생각한다.", keys: "쓰기", tags: ["yozish", "esse", "yozma uslub"] }
  ),
];
