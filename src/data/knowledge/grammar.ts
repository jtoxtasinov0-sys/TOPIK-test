// HanUstoz bilim bazasi — grammatika kartochkalari (1급 → 6급).
// Matnlar HanUstoz uchun original yozilgan. Tuzilma va darajalar ochiq manbalarga tayanadi:
// 국립국어원 «국제 통용 한국어 표준 교육과정» va TOPIK rasmiy darajalar tavsifi (manbalar: sources.ts).
// AI Ustoz savolga mos kartochkalarni shu yerdan oladi (src/lib/knowledge.ts).

export type Level = 1 | 2 | 3 | 4 | 5 | 6;

export type GrammarPoint = {
  id: string;
  level: Level;
  form: string; // masalan "-(으)려고"
  keys: string[]; // matndan qidirish uchun koreyscha bo'laklar
  uz: string; // ma'nosi
  rule: string; // yasalishi
  examples: [string, string][]; // [koreyscha, o'zbekcha]
  note?: string; // o'zbek tili bilan solishtirish, tipik xato
  tags: string[]; // o'zbekcha qidiruv so'zlari
};

const g = (
  id: string,
  level: Level,
  form: string,
  keys: string,
  uz: string,
  rule: string,
  examples: [string, string][],
  note?: string,
  tags: string[] = []
): GrammarPoint => ({ id, level, form, keys: keys.split(" ").filter(Boolean), uz, rule, examples, note, tags });

export const GRAMMAR: GrammarPoint[] = [
  // ======================= 1급 =======================
  g(
    "eun-neun",
    1,
    "은/는",
    "은/는 저는",
    "Mavzu (topic) qo‘shimchasi: «… esa», «… haqida aytsak».",
    "Undosh bilan tugasa 은, unli bilan tugasa 는: 책은, 저는.",
    [
      ["저는 학생이에요.", "Men talabaman."],
      ["사과는 좋아해요. 그런데 배는 안 좋아해요.", "Olmani yaxshi ko‘raman, nokni esa yoqtirmayman."],
    ],
    "O‘zbek tilida maxsus mavzu qo‘shimchasi yo‘q — «esa» so‘ziga yaqin. Gap mavzusini ochishda va taqqoslashda ishlatiladi.",
    ["mavzu", "topic", "esa", "particle"]
  ),
  g(
    "i-ga",
    1,
    "이/가",
    "이/가 제가 누가",
    "Ega (subject) qo‘shimchasi: yangi ma’lumot, «kim? nima?» savoliga javob.",
    "Undosh: 이 (책이), unli: 가 (친구가). 저/나/누구 + 가 → 제가, 내가, 누가.",
    [
      ["누가 왔어요? — 민수 씨가 왔어요.", "Kim keldi? — Minsu keldi."],
      ["머리가 아파요.", "Boshim og‘riyapti."],
    ],
    "있다/없다, 아프다, 좋다, 필요하다, 되다 bilan ko‘pincha 이/가 keladi. 은/는 dan farqi: 이/가 — yangi ma’lumot va ta’kid, 은/는 — mavzu va taqqoslash.",
    ["ega", "subject"]
  ),
  g(
    "eul-reul",
    1,
    "을/를",
    "을/를",
    "Vositasiz to‘ldiruvchi qo‘shimchasi — o‘zbekcha «-ni».",
    "Undosh: 을 (밥을), unli: 를 (커피를).",
    [
      ["저는 커피를 마셔요.", "Men qahva ichaman."],
      ["친구를 만났어요.", "Do‘stim bilan uchrashdim."],
    ],
    "O‘zbekcha «do‘st bilan uchrashmoq», lekin koreyschada 친구를 만나다 (-ni bilan). 좋아하다 → 을/를, 좋다 → 이/가: 사과를 좋아해요 / 사과가 좋아요.",
    ["-ni", "tushum", "object"]
  ),
  g(
    "e",
    1,
    "에 (joy, vaqt)",
    "에가 에와 에있 에없 시에",
    "Yo‘nalish (qayerga?), vaqt (qachon?) va mavjudlik joyi (qayerda bor?) qo‘shimchasi.",
    "N + 에: 학교에 가요, 세 시에, 집에 있어요.",
    [
      ["내일 서울에 가요.", "Ertaga Seulga boraman."],
      ["아침 7시에 일어나요.", "Ertalab soat 7 da turaman."],
    ],
    "O‘zbekcha «-ga» (yo‘nalish) va «-da» (vaqt, biror joyda bor) ikkalasiga to‘g‘ri keladi. Lekin harakat bajariladigan joy uchun 에서 kerak!",
    ["-ga", "-da", "joy", "vaqt", "qayerga"]
  ),
  g(
    "eseo",
    1,
    "에서",
    "에서",
    "Harakat bajariladigan joy («-da») va boshlang‘ich nuqta («-dan»).",
    "N + 에서: 공장에서 일해요, 서울에서 왔어요.",
    [
      ["저는 공장에서 일해요.", "Men zavodda ishlayman."],
      ["우즈베키스탄에서 왔어요.", "O‘zbekistondan keldim."],
    ],
    "O‘zbeklar ko‘p xato qiladi: 집에 공부해요 ✗ → 집에서 공부해요 ✓. Qoida: 있다/없다 — 에; boshqa harakat — 에서. (살다 bilan ikkalasi ham bo‘ladi: 서울에/서울에서 살아요.)",
    ["-da", "-dan", "joy"]
  ),
  g(
    "hago",
    1,
    "와/과, 하고, (이)랑",
    "하고 와/과 이랑",
    "Otlarni bog‘lash: «va», «bilan».",
    "와 — unlidan keyin, 과 — undoshdan keyin (rasmiy); 하고 — og‘zaki; (이)랑 — juda og‘zaki.",
    [
      ["빵하고 우유를 샀어요.", "Non va sut sotib oldim."],
      ["친구랑 같이 영화를 봤어요.", "Do‘stim bilan birga kino ko‘rdim."],
    ],
    undefined,
    ["va"]
  ),
  g(
    "do",
    1,
    "도",
    "저도",
    "«ham».",
    "N + 도 — 은/는, 이/가, 을/를 o‘rniga keladi: 저도, 커피도.",
    [
      ["저도 학생이에요.", "Men ham talabaman."],
      ["오늘도 야근해요.", "Bugun ham kechgacha ishlayman."],
    ],
    "도 dan keyin 이/가 yoki 을/를 qo‘shilmaydi: 저도가 ✗.",
    ["ham", "also"]
  ),
  g(
    "ui",
    1,
    "의",
    "저의",
    "Qaratqich qo‘shimchasi — o‘zbekcha «-ning».",
    "N + 의 (ko‘pincha [에] deb o‘qiladi): 친구의 책. 저의 → 제, 나의 → 내, 너의 → 네.",
    [
      ["이것은 제 가방이에요.", "Bu mening sumkam."],
      ["회사의 규칙을 지켜야 해요.", "Kompaniya qoidalariga rioya qilish kerak."],
    ],
    "Og‘zaki nutqda 의 tez-tez tushib qoladi: 친구 책, 회사 규칙.",
    ["-ning", "egalik", "qaratqich"]
  ),
  g(
    "ieyo",
    1,
    "이에요/예요, 입니다",
    "이에요 예요 입니다 입니까",
    "Ot kesimi: «… man / … san / … dir» (to be).",
    "Undosh: 이에요 (학생이에요), unli: 예요 (의사예요). Rasmiy: 입니다 / 입니까?",
    [
      ["저는 우즈베키스탄 사람이에요.", "Men o‘zbekistonlikman."],
      ["여기는 공장입니다.", "Bu yer — zavod."],
    ],
    "O‘zbekchadagi kabi kesim qo‘shimchasi otga qo‘shiladi: «talaba + man» = 학생 + 이에요.",
    ["-man", "-dir", "bo‘lmoq", "to be"]
  ),
  g(
    "anida",
    1,
    "이/가 아니다",
    "아니에요 아닙니다 아니야",
    "«… emas».",
    "N + 이/가 아니에요 / 아닙니다.",
    [
      ["저는 한국 사람이 아니에요.", "Men koreys emasman."],
      ["이건 제 것이 아니에요.", "Bu meniki emas."],
    ],
    undefined,
    ["emas", "inkor"]
  ),
  g(
    "itda",
    1,
    "있다/없다",
    "있어요 없어요 있습니다 없습니다",
    "«bor / yo‘q» va «… da (joylashgan)».",
    "N이/가 있어요/없어요; joy: N에 있어요.",
    [
      ["저는 동생이 두 명 있어요.", "Mening ikkita ukam bor."],
      ["화장실이 어디에 있어요?", "Hojatxona qayerda?"],
    ],
    "O‘zbekcha «menda pul bor» → 저는 돈이 있어요 (egasi 은/는, narsa 이/가).",
    ["bor", "yo‘q", "mavjud"]
  ),
  g(
    "ayo",
    1,
    "-아요/어요",
    "아요 어요 해요",
    "Hurmatli og‘zaki uslub (hozirgi zamon) — kundalik nutqda eng ko‘p ishlatiladi.",
    "Negizning oxirgi unlisi ㅏ/ㅗ → -아요 (가요, 와요); boshqa unli → -어요 (먹어요); 하다 → 해요.",
    [
      ["저는 매일 한국어를 공부해요.", "Men har kuni koreys tilini o‘qiyman."],
      ["지금 어디에 가요?", "Hozir qayerga ketyapsiz?"],
    ],
    "Bitta shakl darak, so‘roq va buyruq bo‘la oladi — ohang bilan ajraladi: 가요. / 가요? / 가요!",
    ["hurmat", "hozirgi zamon", "polite", "yasalishi"]
  ),
  g(
    "seumnida",
    1,
    "-(스)ㅂ니다 / -(스)ㅂ니까?",
    "습니다 습니까 합니다 합니까",
    "Rasmiy hurmat uslubi: ish joyi, yangiliklar, e’lonlar, rasmiy nutq.",
    "Unli bilan tugasa -ㅂ니다 (갑니다), undosh bilan -습니다 (먹습니다). So‘roq: -ㅂ니까/-습니까?",
    [
      ["처음 뵙겠습니다. 알리라고 합니다.", "Tanishganimdan xursandman. Ismim Ali."],
      ["몇 시에 출근합니까?", "Ishga soat nechada kelasiz?"],
    ],
    "Ish joyida boshliq bilan -습니다 yoki -아요 bilan gapiring; -요 siz (반말) gapirmang.",
    ["rasmiy", "hurmat", "formal"]
  ),
  g(
    "past",
    1,
    "-았/었-",
    "았어요 었어요 했어요 였어요 았습니다 었습니다 했습니다",
    "O‘tgan zamon.",
    "ㅏ/ㅗ → -았어요 (갔어요), boshqa → -었어요 (먹었어요), 하다 → 했어요.",
    [
      ["어제 친구를 만났어요.", "Kecha do‘stim bilan uchrashdim."],
      ["점심을 먹었어요?", "Tushlik qildingizmi?"],
    ],
    "결혼했어요 = «uylanganman / turmush qurganman»: holat ham o‘tgan zamonda aytiladi.",
    ["o‘tgan zamon", "past"]
  ),
  g(
    "future",
    1,
    "-(으)ㄹ 거예요",
    "거예요 겁니다",
    "Kelasi zamon, reja va taxmin.",
    "Unli/ㄹ: -ㄹ 거예요 (갈 거예요), undosh: -을 거예요 (먹을 거예요).",
    [
      ["주말에 고향에 전화할 거예요.", "Dam olish kuni vatanimga qo‘ng‘iroq qilaman."],
      ["내일은 비가 올 거예요.", "Ertaga yomg‘ir yog‘sa kerak."],
    ],
    undefined,
    ["kelasi zamon", "reja", "future"]
  ),
  g(
    "an",
    1,
    "안 / -지 않다",
    "지않",
    "Inkor: «… ma-», «… emas».",
    "안 + fe’l (안 가요) yoki negiz + -지 않아요 (가지 않아요). 하다 fe’llarida: 공부 안 해요.",
    [
      ["저는 술을 안 마셔요.", "Men ichkilik ichmayman."],
      ["오늘은 춥지 않아요.", "Bugun sovuq emas."],
    ],
    "안 공부해요 ✗ → 공부 안 해요 ✓. Imlo: 안 (inkor so‘z) va 않 (-지 않다) ni adashtirmang.",
    ["inkor", "-ma", "emas", "안 않"]
  ),
  g(
    "mot",
    1,
    "못 / -지 못하다",
    "지못 못해요",
    "«… a olmayman» — imkoniyat yo‘qligi.",
    "못 + fe’l (못 가요) yoki -지 못해요 (가지 못해요).",
    [
      ["바빠서 못 갔어요.", "Band bo‘lganim uchun bora olmadim."],
      ["저는 운전을 못 해요.", "Men mashina hayday olmayman."],
    ],
    "안 — qilmaslik (xohish), 못 — qila olmaslik (imkoniyat).",
    ["qila olmaslik", "imkoniyat"]
  ),
  g(
    "go",
    1,
    "-고",
    "",
    "Gaplarni bog‘lash va ketma-ketlik: «va», «-ib».",
    "Negiz + -고: 밥을 먹고 일해요.",
    [
      ["저는 일을 하고 친구는 공부해요.", "Men ishlayman, do‘stim esa o‘qiydi."],
      ["손을 씻고 밥을 먹어요.", "Qo‘limni yuvib, ovqat yeyman."],
    ],
    undefined,
    ["va", "-ib", "ketma-ketlik"]
  ),
  g(
    "seyo",
    1,
    "-(으)세요 / -(으)십시오",
    "세요 으세요 십시오",
    "Hurmatli iltimos/buyruq va hurmat qo‘shimchasi -시-.",
    "Unli/ㄹ: -세요 (가세요), undosh: -으세요 (앉으세요). Rasmiy: -(으)십시오.",
    [
      ["여기에 이름을 쓰세요.", "Bu yerga ismingizni yozing."],
      ["안전모를 쓰십시오.", "Xavfsizlik kaskasini kiying."],
    ],
    "-시- faqat boshqalarni hurmat qilish uchun: 제가 가세요 ✗ → 제가 갈게요 ✓.",
    ["iltimos", "buyruq", "hurmat"]
  ),
  g(
    "jimaseyo",
    1,
    "-지 마세요",
    "지마세요 지마십시오",
    "«… mang» — taqiq.",
    "Negiz + -지 마세요 / -지 마십시오.",
    [
      ["여기에서 담배를 피우지 마세요.", "Bu yerda chekmang."],
      ["기계를 만지지 마십시오.", "Uskunaga tegmang."],
    ],
    undefined,
    ["taqiq", "-mang", "mumkin emas"]
  ),
  g(
    "go-sipda",
    1,
    "-고 싶다",
    "고싶",
    "«… xohlayman», «… gim keladi».",
    "Negiz + -고 싶어요; uchinchi shaxs uchun: -고 싶어해요.",
    [
      ["한국에서 일하고 싶어요.", "Koreyada ishlamoqchiman."],
      ["동생은 한국에 오고 싶어해요.", "Ukam Koreyaga kelishni xohlaydi."],
    ],
    undefined,
    ["xohlash", "istak", "-moqchi"]
  ),
  g(
    "reo",
    1,
    "-(으)러 가다/오다",
    "러가 러와 러갔 러왔 으러",
    "«… gani bormoq/kelmoq» — maqsad (faqat 가다/오다/다니다 bilan).",
    "Unli/ㄹ: -러 (사러), undosh: -으러 (먹으러).",
    [
      ["점심 먹으러 식당에 가요.", "Tushlik qilgani oshxonaga boraman."],
      ["돈을 찾으러 은행에 왔어요.", "Pul yechgani bankka keldim."],
    ],
    "-(으)려고 dan farqi: -(으)러 faqat harakat fe’llari (가다/오다) bilan keladi.",
    ["maqsad", "-gani"]
  ),
  g(
    "lkkayo",
    1,
    "-(으)ㄹ까요?",
    "까요",
    "«… aylikmi?», «… aymi?» — taklif yoki fikr so‘rash.",
    "Unli/ㄹ: -ㄹ까요 (갈까요), undosh: -을까요 (먹을까요).",
    [
      ["같이 점심 먹을까요?", "Birga tushlik qilamizmi?"],
      ["이 상자를 어디에 놓을까요?", "Bu qutini qayerga qo‘yay?"],
    ],
    undefined,
    ["taklif", "maslahat so‘rash"]
  ),
  g(
    "psida",
    1,
    "-(으)ㅂ시다",
    "합시다 읍시다 갑시다 봅시다",
    "«… aylik» — taklif.",
    "Unli: -ㅂ시다 (갑시다), undosh: -읍시다 (먹읍시다).",
    [
      ["잠깐 쉽시다.", "Biroz dam olaylik."],
      ["다 같이 청소합시다.", "Hammamiz birga tozalaylik."],
    ],
    "Kattalarga va boshliqqa -ㅂ시다 demang — -(으)ㄹ까요? yoki -(으)시지요 deng.",
    ["taklif", "-aylik"]
  ),
  g(
    "ege",
    1,
    "에게/한테, 께",
    "에게 한테 에게서 한테서",
    "Shaxsga yo‘nalish «-ga» (에게서/한테서 — «-dan»).",
    "Shaxs + 에게 (yozma), 한테 (og‘zaki), 께 (hurmat).",
    [
      ["친구에게 선물을 줬어요.", "Do‘stimga sovg‘a berdim."],
      ["반장님께 말씀드렸어요.", "Brigadirga aytdim."],
    ],
    "Narsa va joy uchun 에, shaxs uchun 에게: 회사에 전화했어요 / 친구에게 전화했어요.",
    ["-ga", "shaxs", "kimga"]
  ),
  g(
    "buteo",
    1,
    "부터 ~ 까지, 에서 ~ 까지",
    "부터 까지",
    "«… dan … gacha».",
    "Vaqt: 부터 ~ 까지 (9시부터 6시까지); joy: 에서 ~ 까지 (집에서 회사까지).",
    [
      ["9시부터 6시까지 일해요.", "Soat 9 dan 6 gacha ishlayman."],
      ["집에서 공장까지 30분 걸려요.", "Uydan zavodgacha 30 daqiqa ketadi."],
    ],
    undefined,
    ["-dan", "-gacha", "vaqt"]
  ),
  g(
    "euro",
    1,
    "(으)로",
    "으로",
    "Yo‘nalish («… tomonga»), vosita («… bilan / … da»), o‘zgarish.",
    "Unli va ㄹ: 로 (버스로, 서울로), undosh: 으로 (손으로).",
    [
      ["버스로 출근해요.", "Ishga avtobusda boraman."],
      ["오른쪽으로 가세요.", "O‘ng tomonga boring."],
    ],
    undefined,
    ["vosita", "yo‘nalish", "tomon"]
  ),
  g(
    "go-itda",
    1,
    "-고 있다",
    "고있 고계",
    "Davom etayotgan harakat: «… yapman».",
    "Negiz + -고 있어요; hurmat: -고 계세요.",
    [
      ["지금 밥을 먹고 있어요.", "Hozir ovqat yeyapman."],
      ["사장님은 회의하고 계세요.", "Direktor majlisda."],
    ],
    undefined,
    ["-yapman", "davomli"]
  ),
  g(
    "jiman",
    1,
    "-지만",
    "지만",
    "«… lekin», «… ammo».",
    "Negiz + -지만; o‘tgan zamon: -았/었지만.",
    [
      ["한국어는 어렵지만 재미있어요.", "Koreys tili qiyin, lekin qiziq."],
      ["일이 힘들지만 월급이 많아요.", "Ish og‘ir, lekin maosh yaxshi."],
    ],
    undefined,
    ["lekin", "ammo", "biroq"]
  ),
  g(
    "aseo",
    1,
    "-아서/어서",
    "아서 어서 해서",
    "1) sabab: «… gani uchun»; 2) ketma-ketlik: «… ib (keyin)».",
    "ㅏ/ㅗ → -아서, boshqa → -어서, 하다 → 해서. Sabab ma’nosida o‘tgan zamon qo‘shilmaydi: 늦었어서 ✗ → 늦어서 ✓.",
    [
      ["늦어서 죄송합니다.", "Kechikkanim uchun uzr."],
      ["시장에 가서 과일을 샀어요.", "Bozorga borib, meva oldim."],
    ],
    "Sabab ma’nosida buyruq/taklif bilan kelmaydi: 비가 와서 우산을 가져가세요 ✗ → 비가 오니까 … ✓.",
    ["sabab", "chunki", "-ib"]
  ),
  g(
    "nikka",
    1,
    "-(으)니까",
    "니까 으니까",
    "Sabab «… gani uchun» (buyruq va taklif bilan ham ishlaydi); «… sam, (ma’lum bo‘ldi)».",
    "Unli/ㄹ: -니까 (가니까), undosh: -으니까 (먹으니까).",
    [
      ["위험하니까 조심하세요.", "Xavfli, shuning uchun ehtiyot bo‘ling."],
      ["밖에 나가니까 비가 오고 있었어요.", "Tashqariga chiqsam, yomg‘ir yog‘ayotgan ekan."],
    ],
    "-아서/어서 dan farqi: -(으)니까 dan keyin -세요, -ㅂ시다, -(으)ㄹ까요 kela oladi.",
    ["sabab", "chunki"]
  ),
  g(
    "su-itda",
    1,
    "-(으)ㄹ 수 있다/없다",
    "수있 수없",
    "«… a olaman / … a olmayman» — imkoniyat, qobiliyat.",
    "Unli/ㄹ: -ㄹ 수 있어요 (갈 수 있어요), undosh: -을 수 있어요 (먹을 수 있어요).",
    [
      ["저는 한국어를 조금 할 수 있어요.", "Men ozgina koreyscha gapira olaman."],
      ["오늘은 야근할 수 없어요.", "Bugun kechgacha qola olmayman."],
    ],
    undefined,
    ["qila olmoq", "imkoniyat", "can"]
  ),
  g(
    "aya",
    1,
    "-아야/어야 하다(되다)",
    "아야 어야 해야",
    "«… ishim kerak», «… shart».",
    "ㅏ/ㅗ → -아야 해요, boshqa → -어야 해요, 하다 → 해야 해요. Og‘zaki: -아야/어야 돼요.",
    [
      ["작업할 때 장갑을 껴야 해요.", "Ishlaganda qo‘lqop kiyish kerak."],
      ["내일까지 서류를 내야 돼요.", "Ertagacha hujjat topshirishim kerak."],
    ],
    undefined,
    ["shart", "majburiyat", "must"]
  ),
  g(
    "myeon",
    1,
    "-(으)면",
    "으면",
    "«… sa» — shart.",
    "Unli/ㄹ: -면 (가면), undosh: -으면 (먹으면).",
    [
      ["시간이 있으면 같이 가요.", "Vaqtingiz bo‘lsa, birga boraylik."],
      ["다치면 바로 반장님께 말하세요.", "Jarohatlansangiz, darhol brigadirga ayting."],
    ],
    undefined,
    ["agar", "shart", "-sa"]
  ),
  g(
    "boda",
    1,
    "보다, 제일/가장",
    "보다 제일 가장",
    "Qiyoslash: «… dan ko‘ra», «eng …».",
    "N + 보다 (더) + sifat: 서울이 부산보다 커요. 제일/가장 + sifat.",
    [
      ["오늘이 어제보다 더 추워요.", "Bugun kechagidan sovuqroq."],
      ["저는 김치찌개를 제일 좋아해요.", "Men kimchi sho‘rvasini eng yaxshi ko‘raman."],
    ],
    undefined,
    ["qiyos", "-dan ko‘ra", "eng"]
  ),
  g(
    "get",
    1,
    "-겠-",
    "겠어요 겠습니다 겠네요",
    "1) niyat «… aman»; 2) taxmin «… sa kerak»; 3) odobli iboralar (알겠습니다).",
    "Negiz + -겠어요 / -겠습니다.",
    [
      ["다시 한번 말씀해 주시겠어요?", "Yana bir bor aytib bera olasizmi?"],
      ["알겠습니다. 바로 하겠습니다.", "Tushundim. Hoziroq qilaman."],
    ],
    undefined,
    ["niyat", "taxmin", "tushundim"]
  ),
  g(
    "man",
    1,
    "만",
    "",
    "«faqat», «… gina».",
    "N + 만: 물만, 한 시간만.",
    [
      ["저는 물만 마셨어요.", "Men faqat suv ichdim."],
      ["한 시간만 기다려 주세요.", "Bir soatgina kutib turing."],
    ],
    undefined,
    ["faqat", "-gina"]
  ),
  g(
    "juseyo",
    1,
    "N 주세요 / -아/어 주세요",
    "주세요 줘요 드릴게요 드리겠습니다",
    "«… bering», «… ib bering» — iltimos.",
    "N + 주세요 (물 주세요); fe’l + -아/어 주세요 (도와주세요). Hurmat bilan: -아/어 드리다.",
    [
      ["물 좀 주세요.", "Iltimos, suv bering."],
      ["천천히 말해 주세요.", "Sekinroq gapirib bering."],
    ],
    "좀 qo‘shsangiz, iltimos yumshoqroq eshitiladi.",
    ["iltimos", "bering", "-ib bering"]
  ),

  // ======================= 2급 =======================
  g(
    "modifier",
    2,
    "-(으)ㄴ / -는 / -(으)ㄹ (sifatdosh)",
    "는사람 는것 은사람 할일",
    "Aniqlovchi (sifatdosh): o‘tgan -(으)ㄴ, hozirgi -는, kelasi -(으)ㄹ — o‘zbekcha «-gan, -yotgan, -adigan».",
    "Fe’l: 먹은 (yegan), 먹는 (yeyotgan), 먹을 (yeydigan). Sifat: 큰 가방, 좋은 사람.",
    [
      ["어제 만난 사람이 반장님이에요.", "Kecha uchrashgan odam — brigadir."],
      ["내일 할 일이 많아요.", "Ertaga qiladigan ishim ko‘p."],
    ],
    "O‘zbek tiliga juda o‘xshaydi: aniqlovchi otdan oldin keladi (kecha kelgan odam = 어제 온 사람).",
    ["sifatdosh", "aniqlovchi", "-gan", "-yotgan", "-adigan"]
  ),
  g(
    "ryeogo",
    2,
    "-(으)려고 (하다)",
    "려고 으려고",
    "«… moqchi», «… ish uchun» — niyat va maqsad.",
    "Unli/ㄹ: -려고 (가려고), undosh: -으려고 (먹으려고).",
    [
      ["한국에서 일하려고 한국어를 배워요.", "Koreyada ishlash uchun koreys tilini o‘rganyapman."],
      ["내일 은행에 가려고 해요.", "Ertaga bankka bormoqchiman."],
    ],
    "-(으)러 dan farqi: -(으)려고 har qanday fe’l bilan keladi, lekin undan keyin buyruq (-세요) kelmaydi.",
    ["maqsad", "niyat", "-moqchi"]
  ),
  g(
    "wihae",
    2,
    "-기 위해(서) / N을/를 위해(서)",
    "위해 위하여 위한",
    "«… ish uchun», «… maqsadida».",
    "Fe’l + -기 위해(서); ot + 을/를 위해(서).",
    [
      ["건강을 위해 매일 운동해요.", "Sog‘lig‘im uchun har kuni sport qilaman."],
      ["한국 회사에 취업하기 위해서 한국어를 공부해요.", "Koreys kompaniyasiga ishga kirish uchun koreys tilini o‘qiyapman."],
    ],
    undefined,
    ["maqsad"]
  ),
  g(
    "jeone-hue",
    2,
    "-기 전에 / -(으)ㄴ 후에",
    "기전에 은후에 후에 다음에",
    "«… dan oldin» / «… dan keyin».",
    "Negiz + -기 전에 (먹기 전에); -(으)ㄴ 후에 / 다음에 (먹은 후에, 간 다음에). Ot bilan: 식사 전에, 일 후에.",
    [
      ["기계를 쓰기 전에 설명서를 읽으세요.", "Uskunani ishlatishdan oldin yo‘riqnomani o‘qing."],
      ["일이 끝난 후에 운동해요.", "Ish tugagandan keyin sport bilan shug‘ullanaman."],
    ],
    undefined,
    ["oldin", "ketma-ketlik"]
  ),
  g(
    "myeonseo",
    2,
    "-(으)면서",
    "면서",
    "«… -ib turib», «… gan holda» — bir vaqtdagi ikki harakat (bitta ega).",
    "Unli/ㄹ: -면서, undosh: -으면서.",
    [
      ["음악을 들으면서 운동해요.", "Musiqa tinglab, sport qilaman."],
      ["일하면서 한국어를 공부해요.", "Ishlab turib koreys tilini o‘rganaman."],
    ],
    undefined,
    ["bir vaqtda", "-ib turib"]
  ),
  g(
    "neunde",
    2,
    "-는데 / -(으)ㄴ데",
    "는데 은데 인데",
    "Fon/vaziyat («… edi, …»), qarama-qarshilik («… lekin»), muloyim savol oldidan izoh.",
    "Fe’l: -는데 (가는데); sifat: -(으)ㄴ데 (바쁜데, 좋은데); ot: 인데 (학생인데).",
    [
      ["지금 비가 오는데 우산 있어요?", "Hozir yomg‘ir yog‘yapti, soyabon bormi?"],
      ["이 옷은 예쁜데 좀 비싸요.", "Bu kiyim chiroyli, lekin biroz qimmat."],
    ],
    "Gap oxirida -는데요 — muloyim, tugallanmagan javob: 지금 없는데요… (Hozir yo‘q edi…).",
    ["lekin", "fon", "vaziyat", "holat"]
  ),
  g(
    "a-boda",
    2,
    "-아/어 보다",
    "아보 어보 해보 봤어요 보세요",
    "«… ib ko‘rmoq» — sinab ko‘rish, tajriba.",
    "ㅏ/ㅗ → -아 보다, boshqa → -어 보다, 하다 → 해 보다.",
    [
      ["이 김치 한번 먹어 보세요.", "Bu kimchini bir tatib ko‘ring."],
      ["한국에서 스키를 타 봤어요.", "Koreyada chang‘i uchib ko‘rdim."],
    ],
    undefined,
    ["sinab ko‘rish", "tajriba", "-ib ko‘r"]
  ),
  g(
    "jeogi-itda",
    2,
    "-(으)ㄴ 적이 있다/없다",
    "적이있 적이없 적있 적없",
    "«… gan(im) bor / yo‘q» — hayotiy tajriba.",
    "Unli: -ㄴ 적이 있어요 (간 적이), undosh: -은 적이 있어요 (먹은 적이). Ko‘pincha -아/어 본 적이 있다.",
    [
      ["한국 병원에 가 본 적이 있어요?", "Koreya kasalxonasiga borganmisiz?"],
      ["저는 지게차를 운전한 적이 없어요.", "Men hech qachon yuk ko‘targich haydamaganman."],
    ],
    undefined,
    ["tajriba", "-gan", "hech qachon"]
  ),
  g(
    "ttaemune",
    2,
    "-기 때문에 / N 때문에",
    "때문에",
    "«… gani sababli», «… tufayli» (rasmiyroq sabab).",
    "Negiz + -기 때문에 (바쁘기 때문에); ot + 때문에 (비 때문에); ot kesim: 학생이기 때문에.",
    [
      ["눈이 많이 왔기 때문에 길이 막혔어요.", "Qor ko‘p yoqqani sababli yo‘l tirband bo‘ldi."],
      ["감기 때문에 회사에 못 갔어요.", "Shamollash tufayli ishga bora olmadim."],
    ],
    "Buyruq/taklif bilan kelmaydi (u holda -(으)니까).",
    ["sabab", "tufayli", "chunki"]
  ),
  g(
    "ttae",
    2,
    "-(으)ㄹ 때",
    "할때 을때 갈때 올때 았을때 었을때",
    "«… ganda», «… vaqtida».",
    "Unli/ㄹ: -ㄹ 때 (갈 때), undosh: -을 때 (먹을 때); o‘tgan: -았/었을 때. Ot bilan: 휴가 때.",
    [
      ["일할 때 휴대폰을 보지 마세요.", "Ishlayotganda telefonga qaramang."],
      ["한국에 처음 왔을 때 많이 힘들었어요.", "Koreyaga ilk kelganimda juda qiynalganman."],
    ],
    undefined,
    ["-ganda", "vaqtida", "qachon"]
  ),
  g(
    "geot-gi",
    2,
    "-는 것 / -기 (otlashtirish)",
    "는것 는게 기가 기를",
    "Fe’lni otga aylantirish: «… ish», «… moq».",
    "-는 것 (umumiy): 운동하는 것을 좋아해요; -기: 듣기, 말하기, 한국어 배우기가 재미있어요.",
    [
      ["제 취미는 요리하는 것이에요.", "Mening sevimli mashg‘ulotim — ovqat pishirish."],
      ["한국어는 말하기가 어려워요.", "Koreys tilida gapirish qiyin."],
    ],
    undefined,
    ["otlashtirish", "-ish", "harakat nomi"]
  ),
  g(
    "lgeyo",
    2,
    "-(으)ㄹ게요",
    "ㄹ게요 을게요 할게요 갈게요 올게요",
    "«… aman» — va’da, so‘zlovchining tinglovchiga aytgan niyati.",
    "Unli/ㄹ: -ㄹ게요 (갈게요), undosh: -을게요 (먹을게요). Faqat 1-shaxs.",
    [
      ["내일 일찍 올게요.", "Ertaga erta kelaman."],
      ["제가 도와 드릴게요.", "Men yordam beraman."],
    ],
    "-(으)ㄹ 거예요 dan farqi: -(으)ㄹ게요 — tinglovchiga va’da yoki javob.",
    ["va’da", "niyat", "-aman"]
  ),
  g(
    "neyo",
    2,
    "-네요",
    "네요",
    "Hayrat yoki yangi bilgan narsaga munosabat: «… ekan-ku!».",
    "Negiz + -네요; o‘tgan: -았/었네요.",
    [
      ["한국어를 정말 잘하시네요!", "Koreyschani juda yaxshi gapirar ekansiz!"],
      ["오늘 날씨가 춥네요.", "Bugun havo sovuq ekan."],
    ],
    undefined,
    ["hayrat", "ekan"]
  ),
  g(
    "jiyo",
    2,
    "-지요(죠)?",
    "지요",
    "«… -ku, to‘g‘rimi?» — tasdiq so‘rash yoki ma’lum narsani eslatish.",
    "Negiz + -지요 / -죠.",
    [
      ["내일 쉬는 날이지요?", "Ertaga dam olish kuni, to‘g‘rimi?"],
      ["힘들죠? 조금 쉬세요.", "Charchadingiz-a? Biroz dam oling."],
    ],
    undefined,
    ["tasdiq", "-ku", "to‘g‘rimi"]
  ),
  g(
    "ado-doeda",
    2,
    "-아/어도 되다",
    "도돼 도되 도될",
    "«… sa bo‘ladimi?» — ruxsat.",
    "ㅏ/ㅗ → -아도 돼요, boshqa → -어도 돼요, 하다 → 해도 돼요.",
    [
      ["여기에 앉아도 돼요?", "Bu yerga o‘tirsam bo‘ladimi?"],
      ["화장실에 잠깐 가도 될까요?", "Hojatxonaga chiqib kelsam maylimi?"],
    ],
    undefined,
    ["ruxsat", "mumkinmi", "maylimi"]
  ),
  g(
    "myeon-an-doeda",
    2,
    "-(으)면 안 되다",
    "면안돼 면안됩 면안되",
    "«… mumkin emas» — taqiq.",
    "Unli/ㄹ: -면 안 돼요, undosh: -으면 안 돼요.",
    [
      ["작업장에서 뛰면 안 돼요.", "Ish joyida yugurish mumkin emas."],
      ["허락 없이 기계를 고치면 안 됩니다.", "Ruxsatsiz uskunani tuzatish mumkin emas."],
    ],
    undefined,
    ["taqiq", "mumkin emas"]
  ),
  g(
    "ajida",
    2,
    "-아/어지다",
    "아지 어지 해지 워지",
    "«… bo‘lib qolmoq» — holat o‘zgarishi (sifat bilan).",
    "Sifat negizi + -아/어지다: 따뜻해지다, 좋아지다.",
    [
      ["날씨가 따뜻해졌어요.", "Havo iliq bo‘lib qoldi."],
      ["한국어 실력이 좋아졌어요.", "Koreys tili darajam yaxshilandi."],
    ],
    undefined,
    ["o‘zgarish", "bo‘lib qolmoq"]
  ),
  g(
    "ge-doeda",
    2,
    "-게 되다",
    "게되 게됐 게돼",
    "«… adigan bo‘lmoq» — vaziyat tufayli o‘zgarish.",
    "Fe’l negizi + -게 되다.",
    [
      ["회사 때문에 부산에 살게 됐어요.", "Ish sababli Pusanda yashaydigan bo‘ldim."],
      ["처음에는 몰랐는데 이제 알게 됐어요.", "Avval bilmasdim, endi bilib oldim."],
    ],
    undefined,
    ["bo‘lib qolmoq", "natija"]
  ),
  g(
    "geot-gatda",
    2,
    "-(으)ㄴ/는/(으)ㄹ 것 같다",
    "것같 거같",
    "«… ga o‘xshaydi», «… shekilli» — taxmin, muloyim fikr.",
    "O‘tgan: -(으)ㄴ 것 같다, hozirgi: -는 것 같다, kelasi/taxmin: -(으)ㄹ 것 같다.",
    [
      ["비가 올 것 같아요.", "Yomg‘ir yog‘adiganga o‘xshaydi."],
      ["이 기계가 고장 난 것 같아요.", "Bu uskuna buzilganga o‘xshaydi."],
    ],
    undefined,
    ["taxmin", "shekilli", "o‘xshaydi"]
  ),
  g(
    "giro-hada",
    2,
    "-기로 하다",
    "기로",
    "«… ishga qaror qildim / kelishdik».",
    "Negiz + -기로 하다.",
    [
      ["올해부터 담배를 끊기로 했어요.", "Shu yildan chekishni tashlashga qaror qildim."],
      ["친구하고 주말에 만나기로 했어요.", "Do‘stim bilan dam olish kuni uchrashishga kelishdik."],
    ],
    undefined,
    ["qaror", "kelishmoq", "va’da"]
  ),
  g(
    "neunji",
    2,
    "-(으)ㄴ지 / -는지",
    "는지 은지 인지 을지",
    "Ichki so‘roq: «… -mi (yo‘qmi)», «qanday … ekanini».",
    "Fe’l: -는지, sifat: -(으)ㄴ지, ot: 인지, kelasi: -(으)ㄹ지.",
    [
      ["회의가 몇 시에 시작하는지 알아요?", "Majlis soat nechada boshlanishini bilasizmi?"],
      ["이 방법이 맞는지 확인해 주세요.", "Bu usul to‘g‘rimi, tekshirib bering."],
    ],
    undefined,
    ["ichki so‘roq", "bilmoq", "-mi"]
  ),
  g(
    "geona",
    2,
    "-거나",
    "거나",
    "«… yoki …».",
    "Negiz + -거나; ot bilan: N(이)나.",
    [
      ["주말에는 청소하거나 빨래를 해요.", "Dam olish kunlari uy tozalayman yoki kir yuvaman."],
      ["질문이 있거나 문제가 생기면 연락하세요.", "Savol bo‘lsa yoki muammo chiqsa, bog‘laning."],
    ],
    undefined,
    ["yoki"]
  ),
  g(
    "a-itda",
    2,
    "-아/어 있다",
    "아있 어있 져있 워있",
    "Harakatdan keyingi holat: «… ib turibdi».",
    "Asosan o‘timsiz/majhul fe’l + -아/어 있다: 앉아 있다, 켜져 있다, 열려 있다.",
    [
      ["문이 열려 있어요.", "Eshik ochiq turibdi."],
      ["벽에 안전 수칙이 붙어 있어요.", "Devorga xavfsizlik qoidalari yopishtirilgan."],
    ],
    "-고 있다 dan farqi: 입고 있어요 (kiyib yuribdi), 열려 있어요 (ochiq holatda).",
    ["holat", "-ib turibdi"]
  ),
  g(
    "llaeyo",
    2,
    "-(으)ㄹ래요",
    "ㄹ래요 을래요 할래요",
    "«… aman (xohlayman)», «… asizmi?» — norasmiy istak va taklif.",
    "Unli/ㄹ: -ㄹ래요, undosh: -을래요.",
    [
      ["저는 커피 마실래요.", "Men qahva ichaman."],
      ["같이 갈래요?", "Birga borasizmi?"],
    ],
    "Boshliqqa ishlatmang — u holda -(으)시겠어요? deng.",
    ["istak", "taklif"]
  ),
  g(
    "ge-adverb",
    2,
    "-게 (ravish)",
    "하게",
    "Sifatdan ravish yasash: «… cha», «… qilib».",
    "Sifat negizi + -게: 크게, 빠르게, 안전하게.",
    [
      ["크게 말해 주세요.", "Balandroq gapirib bering."],
      ["작업장을 깨끗하게 청소하세요.", "Ish joyini toza qilib tozalang."],
    ],
    undefined,
    ["ravish", "qilib"]
  ),
  g(
    "gi-sijak",
    2,
    "-기 시작하다",
    "기시작",
    "«… a boshlamoq».",
    "Negiz + -기 시작하다.",
    [
      ["작년부터 한국어를 배우기 시작했어요.", "O‘tgan yildan koreys tilini o‘rgana boshladim."],
      ["비가 오기 시작했어요.", "Yomg‘ir yog‘a boshladi."],
    ],
    undefined,
    ["boshlamoq"]
  ),
  g(
    "eunji-doeda",
    2,
    "-(으)ㄴ 지 (vaqt) 되다",
    "온지 된지 한지 산지",
    "«… ganiga … bo‘ldi».",
    "Fe’l + -(으)ㄴ 지 + vaqt + 되다/지나다.",
    [
      ["한국에 온 지 1년이 됐어요.", "Koreyaga kelganimga 1 yil bo‘ldi."],
      ["이 회사에서 일한 지 6개월 됐어요.", "Bu kompaniyada ishlaganimga 6 oy bo‘ldi."],
    ],
    undefined,
    ["-ganiga", "vaqt o‘tdi"]
  ),
  g(
    "jul-alda",
    2,
    "-(으)ㄹ 줄 알다/모르다",
    "줄알 줄몰",
    "«… ni bilaman / bilmayman» (ko‘nikma).",
    "Unli/ㄹ: -ㄹ 줄 알다, undosh: -을 줄 알다.",
    [
      ["한국 음식을 만들 줄 알아요?", "Koreys ovqatini pishirishni bilasizmi?"],
      ["저는 운전할 줄 몰라요.", "Men mashina haydashni bilmayman."],
    ],
    undefined,
    ["bilmoq", "ko‘nikma"]
  ),
  g(
    "bakke",
    2,
    "밖에 + inkor",
    "밖에",
    "«… dan boshqa (yo‘q)», «atigi … , xolos».",
    "N + 밖에 + inkor fe’l (없다, 안, 못, 모르다).",
    [
      ["지갑에 천 원밖에 없어요.", "Hamyonimda atigi ming von bor, xolos."],
      ["한국어를 조금밖에 못 해요.", "Koreyschani ozgina gapira olaman, xolos."],
    ],
    "밖에 dan keyin albatta inkor keladi: 천 원밖에 있어요 ✗ → 천 원밖에 없어요 ✓.",
    ["faqat", "xolos", "inkor"]
  ),

  // ======================= 3급 =======================
  g(
    "written-style",
    3,
    "-ㄴ/는다 (yozma uslub, 문어체)",
    "는다 한다 하였다",
    "Yozma uslub (TOPIK 쓰기 52–54, gazeta, ilmiy matn): -ㄴ/는다, -다.",
    "Fe’l: unli → -ㄴ다 (간다), undosh → -는다 (먹는다); sifat → -다 (좋다); ot → 이다; o‘tgan → -았/었다; kelasi → -(으)ㄹ 것이다.",
    [
      ["최근 외국인 근로자가 증가하고 있다.", "So‘nggi paytda xorijlik ishchilar ko‘paymoqda."],
      ["이 문제를 해결하기 위해서는 노력이 필요하다.", "Bu muammoni hal qilish uchun sa’y-harakat kerak."],
    ],
    "쓰기 53–54 da -아요/-습니다 ishlatilsa, ball kesiladi! 저 o‘rniga 나 deb yozing yoki shaxssiz yozing.",
    ["yozma uslub", "쓰기", "written style", "esse", "yozish"]
  ),
  g(
    "barame",
    3,
    "-는 바람에",
    "바람에",
    "«… gani sababli» — kutilmagan, ko‘pincha salbiy natija.",
    "Fe’l + -는 바람에 (natija o‘tgan zamonda).",
    [
      ["늦잠을 자는 바람에 지각했어요.", "Uxlab qolganim sababli ishga kechikdim."],
      ["기계가 멈추는 바람에 일을 못 했어요.", "Uskuna to‘xtab qolgani uchun ishlay olmadim."],
    ],
    undefined,
    ["sabab", "kutilmagan", "salbiy"]
  ),
  g(
    "ppeon",
    3,
    "-(으)ㄹ 뻔하다",
    "뻔했 뻔하",
    "«… ay dedim», «… ishimga oz qoldi».",
    "Unli/ㄹ: -ㄹ 뻔했다, undosh: -을 뻔했다.",
    [
      ["계단에서 넘어질 뻔했어요.", "Zinapoyada yiqilishimga oz qoldi."],
      ["버스를 놓칠 뻔했어요.", "Avtobusdan qolib ketay dedim."],
    ],
    undefined,
    ["oz qoldi", "-ay dedim"]
  ),
  g(
    "deoragoyo",
    3,
    "-더라고요",
    "더라고요 더라고",
    "«… ekan» — o‘zi ko‘rib, boshidan o‘tkazib bilgan narsasini aytish.",
    "Negiz + -더라고요; o‘tgan: -았/었더라고요.",
    [
      ["한국 사람들이 정말 친절하더라고요.", "Koreyslar juda xushmuomala ekan."],
      ["어제 가 보니까 가게가 문을 닫았더라고요.", "Kecha borsam, do‘kon yopiq ekan."],
    ],
    undefined,
    ["ekan", "shaxsiy tajriba", "ko‘rdim"]
  ),
  g(
    "daga",
    3,
    "-다가",
    "다가",
    "«… ayotib», «… ib turib (to‘xtatib, boshqasiga o‘tish)».",
    "Negiz + -다가; -았/었다가 — «… ib (keyin qaytib)»: 갔다가 왔어요 (borib keldim).",
    [
      ["일하다가 손을 다쳤어요.", "Ishlayotib qo‘limni jarohatladim."],
      ["집에 가다가 친구를 만났어요.", "Uyga ketayotib do‘stimni uchratdim."],
    ],
    undefined,
    ["-ayotib", "to‘xtash", "jarayonda"]
  ),
  g(
    "neun-daero",
    3,
    "-는 대로",
    "대로",
    "1) «… gan zahoti»; 2) «… gandek, … bo‘yicha».",
    "Fe’l + -는 대로; o‘tgan: -(으)ㄴ 대로; ot + 대로 (계획대로).",
    [
      ["일이 끝나는 대로 연락드릴게요.", "Ish tugashi bilanoq bog‘lanaman."],
      ["제가 말하는 대로 따라 하세요.", "Men aytgandek takrorlang."],
    ],
    undefined,
    ["zahoti", "-gandek", "bo‘yicha"]
  ),
  g(
    "pyeonida",
    3,
    "-(으)ㄴ/는 편이다",
    "편이에요 편이다 편입니다",
    "«nisbatan …», «… lar toifasiga kiradi» — umumiy moyillik.",
    "Fe’l: -는 편이다; sifat: -(으)ㄴ 편이다.",
    [
      ["저는 매운 음식을 잘 먹는 편이에요.", "Men achchiq ovqatni yaxshi yeydiganlardanman."],
      ["이 공장은 월급이 많은 편이에요.", "Bu zavodda maosh nisbatan yuqori."],
    ],
    undefined,
    ["moyillik", "nisbatan"]
  ),
  g(
    "dorok",
    3,
    "-도록",
    "도록",
    "«… sin deb», «… guncha», «… gan darajada» — maqsad va chegara.",
    "Negiz + -도록.",
    [
      ["다치지 않도록 조심하세요.", "Jarohatlanmaslik uchun ehtiyot bo‘ling."],
      ["밤늦도록 일했어요.", "Tun yarmigacha ishladim."],
    ],
    undefined,
    ["maqsad", "-sin deb", "-guncha"]
  ),
  g(
    "jamaja",
    3,
    "-자마자",
    "자마자",
    "«… ishi bilanoq», «… gan zahoti».",
    "Fe’l negizi + -자마자.",
    [
      ["집에 도착하자마자 잠이 들었어요.", "Uyga yetib kelishim bilanoq uxlab qoldim."],
      ["경보가 울리자마자 밖으로 나가세요.", "Signal chalinishi bilanoq tashqariga chiqing."],
    ],
    undefined,
    ["zahoti", "bilanoq"]
  ),
  g(
    "dongan",
    3,
    "-는 동안",
    "동안",
    "«… gan paytda», «… davomida».",
    "Fe’l + -는 동안; ot + 동안 (휴가 동안).",
    [
      ["제가 없는 동안 이 일을 부탁해요.", "Men yo‘qligimda bu ishni sizga topshiraman."],
      ["한국에 있는 동안 많은 것을 배웠어요.", "Koreyada bo‘lgan vaqtimda ko‘p narsa o‘rgandim."],
    ],
    undefined,
    ["davomida", "paytda"]
  ),
  g(
    "surok",
    3,
    "-(으)ㄹ수록",
    "수록",
    "«… gan sari», «qancha … bo‘lsa, shuncha …».",
    "Unli/ㄹ: -ㄹ수록, undosh: -을수록; ko‘pincha -(으)면 -(으)ㄹ수록: 많으면 많을수록.",
    [
      ["한국어는 배울수록 재미있어요.", "Koreys tilini o‘rgangan sari qiziqroq bo‘ladi."],
      ["빠를수록 좋아요.", "Qancha tez bo‘lsa, shuncha yaxshi."],
    ],
    undefined,
    ["sari", "qancha … shuncha"]
  ),
  g(
    "ppunman",
    3,
    "-(으)ㄹ 뿐만 아니라",
    "뿐만",
    "«nafaqat …, balki …».",
    "Fe’l/sifat + -(으)ㄹ 뿐만 아니라; ot + 뿐만 아니라.",
    [
      ["이 일은 힘들 뿐만 아니라 위험해요.", "Bu ish nafaqat og‘ir, balki xavfli ham."],
      ["그는 한국어뿐만 아니라 영어도 잘해요.", "U nafaqat koreyscha, inglizchani ham yaxshi biladi."],
    ],
    "TOPIK 53–54 yozishda fikrlarni bog‘lash uchun juda qulay.",
    ["nafaqat", "balki"]
  ),
  g(
    "indirect",
    3,
    "-다고/-냐고/-자고/-(으)라고 하다 (o‘zlashtirma gap)",
    "다고 냐고 라고 대요 래요",
    "Boshqaning gapini yetkazish: «… dedi», «… deb so‘radi», «… aylik dedi», «… gin dedi».",
    "Darak: fe’l -ㄴ/는다고, sifat -다고, ot (이)라고; so‘roq -냐고; taklif -자고; buyruq -(으)라고. Qisqa shakllar: -대요, -냬요, -재요, -래요.",
    [
      ["반장님이 내일 쉰다고 했어요.", "Brigadir ertaga dam olamiz dedi."],
      ["친구가 같이 밥 먹자고 했어요.", "Do‘stim birga ovqatlanaylik dedi."],
    ],
    undefined,
    ["o‘zlashtirma gap", "dedi", "indirect speech"]
  ),
  g(
    "daesin",
    3,
    "-는 대신(에)",
    "대신",
    "«… o‘rniga», «… evaziga».",
    "Fe’l + -는 대신(에); ot + 대신(에).",
    [
      ["주말에 일하는 대신 월요일에 쉬어요.", "Dam olish kuni ishlaganim evaziga dushanba dam olaman."],
      ["커피 대신 차를 마셔요.", "Qahva o‘rniga choy ichaman."],
    ],
    undefined,
    ["o‘rniga", "evaziga"]
  ),
  g(
    "neurago",
    3,
    "-느라고",
    "느라고 느라",
    "«… bilan band bo‘lib (… qila olmadim)» — salbiy natija sababi.",
    "Fe’l + -느라고; ikki qismning egasi bir xil bo‘ladi.",
    [
      ["일하느라고 전화를 못 받았어요.", "Ish bilan band bo‘lib, telefonni ko‘tara olmadim."],
      ["숙제하느라고 늦게 잤어요.", "Uy vazifasini qilib, kech yotdim."],
    ],
    undefined,
    ["band bo‘lib", "sabab"]
  ),
  g(
    "deon",
    3,
    "-던",
    "",
    "O‘tmishda takrorlangan yoki tugallanmagan harakat: «… adigan (edim)», «… ib turgan».",
    "Fe’l + -던 + ot: 가던 식당, 마시던 커피.",
    [
      ["제가 자주 가던 식당이 없어졌어요.", "Men tez-tez boradigan oshxona yopilibdi."],
      ["마시던 커피가 식었어요.", "Ichib turgan qahvam sovib qoldi."],
    ],
    undefined,
    ["o‘tmish", "-gan edi"]
  ),
  g(
    "teni",
    3,
    "-(으)ㄹ 테니까",
    "테니까 테니",
    "«… aman, shuning uchun …» yoki «… sa kerak, shuning uchun …».",
    "Unli/ㄹ: -ㄹ 테니까, undosh: -을 테니까.",
    [
      ["제가 청소할 테니까 쉬세요.", "Men tozalayman, siz dam oling."],
      ["길이 막힐 테니까 일찍 출발하세요.", "Yo‘l tirband bo‘lsa kerak, erta yo‘lga chiqing."],
    ],
    undefined,
    ["niyat", "taxmin", "shuning uchun"]
  ),
  g(
    "beorida",
    3,
    "-아/어 버리다",
    "버렸 버려",
    "«… ib qo‘ydi», «… ib yubordi» — to‘liq tugash (afsus yoki yengillik).",
    "ㅏ/ㅗ → -아 버리다, boshqa → -어 버리다.",
    [
      ["버스가 벌써 떠나 버렸어요.", "Avtobus allaqachon ketib qolibdi."],
      ["숙제를 다 해 버렸어요.", "Uy vazifasini butunlay qilib qo‘ydim."],
    ],
    undefined,
    ["-ib qo‘ydi", "-ib yubordi"]
  ),
  g(
    "go-naseo",
    3,
    "-고 나서",
    "고나서",
    "«… ib bo‘lgach», «… dan keyin».",
    "Fe’l + -고 나서.",
    [
      ["손을 씻고 나서 식사하세요.", "Qo‘lingizni yuvib bo‘lgach ovqatlaning."],
      ["회의가 끝나고 나서 이야기해요.", "Majlis tugagandan keyin gaplashamiz."],
    ],
    undefined,
    ["-ib bo‘lgach"]
  ),
  g(
    "deunji",
    3,
    "-든지",
    "든지 든가",
    "«xoh …, xoh …», «… mi, farqi yo‘q».",
    "Negiz + -든지; so‘roq so‘z + -든지: 언제든지, 누구든지.",
    [
      ["언제든지 연락하세요.", "Istagan vaqtingiz bog‘laning."],
      ["버스를 타든지 지하철을 타든지 빨리 오세요.", "Avtobusdami, metrodami — tezroq keling."],
    ],
    undefined,
    ["farqi yo‘q", "xoh"]
  ),
  g(
    "ado",
    3,
    "-아/어도",
    "아도 어도 해도",
    "«… sa ham».",
    "ㅏ/ㅗ → -아도, boshqa → -어도, 하다 → 해도. Ko‘pincha 아무리 bilan: 아무리 바빠도.",
    [
      ["아무리 바빠도 밥은 꼭 드세요.", "Qanchalik band bo‘lsangiz ham, albatta ovqatlaning."],
      ["비가 와도 일은 해야 해요.", "Yomg‘ir yog‘sa ham ishlash kerak."],
    ],
    undefined,
    ["-sa ham", "garchi"]
  ),
  g(
    "neundedo",
    3,
    "-는데도",
    "는데도 은데도 인데도",
    "«… ga qaramay», «… sa ham (haqiqatda)».",
    "Fe’l: -는데도, sifat: -(으)ㄴ데도, o‘tgan: -았/었는데도.",
    [
      ["약을 먹었는데도 머리가 아파요.", "Dori ichganimga qaramay boshim og‘riyapti."],
      ["열심히 일하는데도 월급이 적어요.", "Astoydil ishlasam ham maosh kam."],
    ],
    undefined,
    ["qaramay", "-sa ham"]
  ),
  g(
    "manhada",
    3,
    "-(으)ㄹ 만하다",
    "만하 만해 만한",
    "«… ishga arziydi», «… sa bo‘ladi».",
    "Unli/ㄹ: -ㄹ 만하다, undosh: -을 만하다.",
    [
      ["그 영화는 볼 만해요.", "U kino ko‘rishga arziydi."],
      ["이 일은 할 만해요.", "Bu ishni qilsa bo‘ladi (unchalik og‘ir emas)."],
    ],
    undefined,
    ["arziydi"]
  ),
  g(
    "da-boni",
    3,
    "-다 보니(까)",
    "다보니",
    "«… averib, (oqibatda) …».",
    "Fe’l + -다 보니(까).",
    [
      ["매일 한국 드라마를 보다 보니 한국어가 늘었어요.", "Har kuni koreys serialini ko‘raverib, koreyschamiz yaxshilandi."],
      ["일하다 보니 시간 가는 줄 몰랐어요.", "Ishlayverib, vaqt o‘tganini sezmay qoldim."],
    ],
    undefined,
    ["takror", "oqibat", "-averib"]
  ),
  g(
    "deokbun",
    3,
    "-(으)ㄴ 덕분에 / N 덕분에",
    "덕분",
    "«… sharofati bilan» (ijobiy sabab).",
    "Fe’l + -(으)ㄴ 덕분에; ot + 덕분에.",
    [
      ["동료들이 도와준 덕분에 일을 빨리 끝냈어요.", "Hamkasblar yordam bergani sharofati bilan ishni tez tugatdim."],
      ["선생님 덕분에 시험에 합격했어요.", "Ustozim sharofati bilan imtihondan o‘tdim."],
    ],
    undefined,
    ["sharofati", "ijobiy sabab"]
  ),
  g(
    "cheok",
    3,
    "-(으)ㄴ/는 척하다",
    "척하 척했",
    "«… gandek bo‘lmoq», «o‘zini … ga solmoq».",
    "Fe’l: -는 척하다 (hozir), -(으)ㄴ 척하다 (o‘tgan); sifat: -(으)ㄴ 척하다.",
    [
      ["모르는데 아는 척했어요.", "Bilmasam ham bilgandek bo‘ldim."],
      ["자는 척하지 마세요.", "Uxlagandek bo‘lmang."],
    ],
    undefined,
    ["o‘zini … ga solmoq"]
  ),
  g(
    "kkabwa",
    3,
    "-(으)ㄹ까 봐(서)",
    "까봐",
    "«… mi deb qo‘rqib / xavotirlanib».",
    "Unli/ㄹ: -ㄹ까 봐, undosh: -을까 봐.",
    [
      ["늦을까 봐 택시를 탔어요.", "Kechikib qolamanmi deb taksiga o‘tirdim."],
      ["잊어버릴까 봐 메모했어요.", "Esdan chiqarib qo‘yamanmi deb yozib qo‘ydim."],
    ],
    undefined,
    ["xavotir", "qo‘rqib"]
  ),
  g(
    "ayagetda",
    3,
    "-아/어야겠다",
    "야겠",
    "«… ishim kerak (ekan)» — qaror yoki zaruriyatni anglash.",
    "-아/어야 + -겠다.",
    [
      ["피곤해서 오늘은 일찍 자야겠어요.", "Charchadim, bugun erta yotishim kerak."],
      ["한국어를 더 열심히 공부해야겠어요.", "Koreys tilini yanada astoydil o‘qishim kerak ekan."],
    ],
    undefined,
    ["qaror", "kerak ekan"]
  ),
  g(
    "ttareumyeon",
    3,
    "N에 따르면 / N에 따라",
    "따르면 따라",
    "«… ga ko‘ra» (manba), «… ga qarab / muvofiq».",
    "N + 에 따르면 (manba), N + 에 따라(서) (bog‘liqlik, muvofiqlik).",
    [
      ["일기 예보에 따르면 내일 눈이 온대요.", "Ob-havo ma’lumotiga ko‘ra, ertaga qor yog‘armish."],
      ["회사 규정에 따라 처리하겠습니다.", "Kompaniya qoidalariga muvofiq hal qilamiz."],
    ],
    "TOPIK 53 (grafik tasviri) boshlanishi: «…에 따르면 …» — juda ko‘p ishlatiladi.",
    ["ko‘ra", "muvofiq", "grafik"]
  ),
  g(
    "jeongdoro",
    3,
    "-(으)ㄹ 정도로",
    "정도로",
    "«… darajada».",
    "Unli/ㄹ: -ㄹ 정도로, undosh: -을 정도로.",
    [
      ["눈을 뜰 수 없을 정도로 바람이 불었어요.", "Ko‘z ochib bo‘lmaydigan darajada shamol esdi."],
      ["말을 못 할 정도로 피곤해요.", "Gapira olmaydigan darajada charchadim."],
    ],
    undefined,
    ["darajada"]
  ),

  // ======================= 4급 =======================
  g(
    "banmyeon",
    4,
    "-(으)ㄴ/는 반면(에)",
    "반면",
    "«…, aksincha …» — qarama-qarshilik (yozma uslub).",
    "Fe’l: -는 반면에, sifat: -(으)ㄴ 반면에, o‘tgan: -(으)ㄴ 반면에.",
    [
      ["도시는 편리한 반면에 물가가 비싸다.", "Shahar qulay, aksincha narxlar qimmat."],
      ["수출은 증가한 반면 수입은 감소했다.", "Eksport oshgan, import esa kamaygan."],
    ],
    "TOPIK 53 (grafik) va 54 (esse) uchun juda foydali.",
    ["aksincha", "qarama-qarshilik", "yozish"]
  ),
  g(
    "riga-eopda",
    4,
    "-(으)ㄹ 리가 없다",
    "리가없",
    "«… ishi mumkin emas», «bo‘lishi aql bovar qilmaydi».",
    "Unli/ㄹ: -ㄹ 리가 없다, undosh: -을 리가 없다.",
    [
      ["그 사람이 거짓말을 할 리가 없어요.", "U odam yolg‘on gapirishi mumkin emas."],
      ["벌써 끝났을 리가 없어요.", "Allaqachon tugagan bo‘lishi mumkin emas."],
    ],
    undefined,
    ["mumkin emas", "ishonchsizlik"]
  ),
  g(
    "gi-maryeon",
    4,
    "-기 마련이다",
    "마련이",
    "«tabiiyki …», «albatta … bo‘ladi».",
    "Negiz + -기 마련이다.",
    [
      ["처음에는 누구나 실수하기 마련이에요.", "Avvaliga har kim xato qilishi tabiiy."],
      ["열심히 하면 좋은 결과가 있기 마련이다.", "Astoydil harakat qilsang, albatta yaxshi natija bo‘ladi."],
    ],
    undefined,
    ["tabiiy", "albatta"]
  ),
  g(
    "sem",
    4,
    "-는 셈이다",
    "셈이",
    "«amalda … degani», «… hisob».",
    "Fe’l: -는 셈이다, o‘tgan: -(으)ㄴ 셈이다.",
    [
      ["한 달에 하루만 쉬니까 거의 매일 일하는 셈이에요.", "Oyiga bir kun dam olaman — deyarli har kuni ishlayman degani."],
      ["10명 중 9명이 찬성했으니까 모두 찬성한 셈이다.", "10 kishidan 9 tasi rozi — demak, deyarli hamma rozi."],
    ],
    undefined,
    ["hisob", "degani"]
  ),
  g(
    "tase",
    4,
    "-(으)ㄴ/는 탓에",
    "탓에",
    "«… aybi bilan», «… gani tufayli» (salbiy sabab).",
    "Fe’l: -는 탓에 / -(으)ㄴ 탓에; ot + 탓에.",
    [
      ["준비를 안 한 탓에 시험에 떨어졌어요.", "Tayyorlanmaganim tufayli imtihondan yiqildim."],
      ["날씨가 추운 탓에 감기에 걸렸어요.", "Havo sovuq bo‘lgani uchun shamolladim."],
    ],
    undefined,
    ["sabab", "salbiy", "ayb"]
  ),
  g(
    "deorado",
    4,
    "-더라도",
    "더라도",
    "«… sa ham» (taxminiy holat, kuchli ta’kid).",
    "Negiz + -더라도.",
    [
      ["힘들더라도 포기하지 마세요.", "Qiyin bo‘lsa ham taslim bo‘lmang."],
      ["늦더라도 꼭 오세요.", "Kechiksangiz ham albatta keling."],
    ],
    undefined,
    ["-sa ham", "garchi"]
  ),
  g(
    "gime",
    4,
    "-는 김에",
    "김에",
    "«… ganda, shu bahona …», «yo‘l-yo‘lakay».",
    "Fe’l + -는 김에 / -(으)ㄴ 김에.",
    [
      ["시장에 가는 김에 과일도 사 올게요.", "Bozorga borganimda meva ham olib kelaman."],
      ["말이 나온 김에 하나 물어볼게요.", "Gap ochilganda bir narsa so‘rab qo‘yay."],
    ],
    undefined,
    ["bahona", "yo‘l-yo‘lakay"]
  ),
  g(
    "dasipi",
    4,
    "-다시피",
    "다시피",
    "«… ganingizdek»; «deyarli …».",
    "알다/보다/듣다 + -(으)시다시피; fe’l + -다시피 하다 (deyarli).",
    [
      ["아시다시피 내일은 공장이 쉽니다.", "Bilganingizdek, ertaga zavod ishlamaydi."],
      ["요즘 회사에서 살다시피 해요.", "Hozir deyarli ishxonada yashayapman."],
    ],
    undefined,
    ["-ganingizdek", "deyarli"]
  ),
  g(
    "gyeom",
    4,
    "-(으)ㄹ 겸",
    "",
    "«ham …, ham … uchun» — ikki maqsad.",
    "-(으)ㄹ 겸 -(으)ㄹ 겸; ot + 겸 + ot (아침 겸 점심).",
    [
      ["운동도 할 겸 산책도 할 겸 공원에 가요.", "Ham sport, ham sayr uchun bog‘ga boraman."],
      ["친구도 만날 겸 서울에 갔어요.", "Do‘stimni ham ko‘rish uchun Seulga bordim."],
    ],
    undefined,
    ["ikki maqsad"]
  ),
  g(
    "gineunkeonyeong",
    4,
    "-기는커녕",
    "커녕",
    "«… u yoqda tursin, hatto …».",
    "Negiz + -기는커녕; ot + 은/는커녕.",
    [
      ["돈을 모으기는커녕 빚만 늘었어요.", "Pul yig‘ish u yoqda tursin, qarz ko‘paydi."],
      ["쉬기는커녕 밥 먹을 시간도 없어요.", "Dam olish u yoqda tursin, ovqatlanishga ham vaqt yo‘q."],
    ],
    undefined,
    ["u yoqda tursin"]
  ),
  g(
    "dedaga",
    4,
    "-는 데다(가)",
    "데다가",
    "«ustiga-ustak», «… ham, buning ustiga …».",
    "Fe’l: -는 데다가, sifat: -(으)ㄴ 데다가.",
    [
      ["비가 오는 데다가 바람도 불어요.", "Yomg‘ir yog‘yapti, ustiga shamol ham esyapti."],
      ["이 집은 넓은 데다가 싸요.", "Bu uy keng, buning ustiga arzon."],
    ],
    undefined,
    ["ustiga-ustak", "qo‘shimcha"]
  ),
  g(
    "jido-moreuda",
    4,
    "-(으)ㄹ지도 모르다",
    "지도모르 지도몰라",
    "«… ishi ham mumkin».",
    "Unli/ㄹ: -ㄹ지도 모르다, undosh: -을지도 모르다; o‘tgan: -았/었을지도.",
    [
      ["내일 비가 올지도 몰라요.", "Ertaga yomg‘ir yog‘ishi ham mumkin."],
      ["그 사람은 벌써 퇴근했을지도 몰라요.", "U allaqachon ishdan ketgan bo‘lishi mumkin."],
    ],
    undefined,
    ["ehtimol", "mumkin"]
  ),
  g(
    "gon-hada",
    4,
    "-곤 하다",
    "곤하 곤했",
    "«… ib turardim», «odatda …».",
    "Fe’l + -곤 하다.",
    [
      ["어렸을 때 강에서 수영하곤 했어요.", "Bolaligimda daryoda suzib turardim."],
      ["주말이면 고향 음식을 만들곤 해요.", "Dam olish kunlari ko‘pincha vatan taomini pishiraman."],
    ],
    undefined,
    ["odat", "-ib turardim"]
  ),
  g(
    "bwatja",
    4,
    "-아/어 봤자",
    "봤자",
    "«… ganing bilan foydasi yo‘q».",
    "ㅏ/ㅗ → -아 봤자, boshqa → -어 봤자.",
    [
      ["지금 가 봤자 이미 늦었어요.", "Hozir borganing bilan baribir kech."],
      ["화내 봤자 소용없어요.", "Jahl qilganing bilan foyda yo‘q."],
    ],
    undefined,
    ["foydasi yo‘q"]
  ),
  g(
    "neun-han",
    4,
    "-는 한",
    "",
    "«… ekan (shart)», «… sa bas».",
    "Fe’l + -는 한.",
    [
      ["포기하지 않는 한 기회는 있어요.", "Taslim bo‘lmas ekansiz, imkoniyat bor."],
      ["규칙을 지키는 한 위험하지 않아요.", "Qoidaga rioya qilinar ekan, xavfli emas."],
    ],
    undefined,
    ["ekan", "sharti bilan"]
  ),
  g(
    "beobida",
    4,
    "-는 법이다",
    "법이",
    "«… ishi tabiiy qonuniyat».",
    "Fe’l + -는 법이다; sifat + -(으)ㄴ 법이다.",
    [
      ["노력하면 결과가 있는 법이다.", "Mehnat qilsang, natija bo‘ladi — bu qonuniyat."],
      ["누구나 실수를 하는 법이에요.", "Har kim xato qiladi, bu tabiiy."],
    ],
    undefined,
    ["qonuniyat", "tabiiy"]
  ),

  // ======================= 5–6급 =======================
  g(
    "nameoji",
    5,
    "-(으)ㄴ 나머지",
    "나머지",
    "«… ganidan (haddan ortiq), oqibatda …».",
    "Fe’l/sifat + -(으)ㄴ 나머지.",
    [
      ["너무 긴장한 나머지 실수를 했어요.", "Haddan ziyod hayajonlanganimdan xato qildim."],
      ["일에 집중한 나머지 점심을 잊었다.", "Ishga berilib ketib, tushlikni unutdim."],
    ],
    undefined,
    ["haddan ortiq", "oqibat"]
  ),
  g(
    "sipsang",
    5,
    "-기 십상이다",
    "십상",
    "«… ishi oson / ehtimoli katta» (salbiy).",
    "Negiz + -기 십상이다.",
    [
      ["안전 수칙을 무시하면 사고가 나기 십상이다.", "Xavfsizlik qoidalariga e’tibor bermasang, baxtsiz hodisa ro‘y berishi oson."],
      ["서두르면 실수하기 십상이에요.", "Shoshilsangiz, xato qilish ehtimoli katta."],
    ],
    undefined,
    ["ehtimol", "salbiy"]
  ),
  g(
    "neun-ba",
    5,
    "-(으)ㄴ/는 바",
    "바와같이 바에따르면",
    "«… ganidek», «… ga ko‘ra» (rasmiy yozma).",
    "Fe’l + -(으)ㄴ/는 바와 같이, -(으)ㄴ 바에 따르면.",
    [
      ["앞에서 살펴본 바와 같이 인구가 줄고 있다.", "Yuqorida ko‘rib chiqqanimizdek, aholi kamaymoqda."],
      ["조사한 바에 따르면 만족도가 높았다.", "O‘rganishlarga ko‘ra, qoniqish darajasi yuqori bo‘lgan."],
    ],
    "TOPIK 54 esse va 53 grafik uchun foydali.",
    ["rasmiy", "yozma", "ko‘ra"]
  ),
  g(
    "bulguhago",
    5,
    "-(으)ㅁ에도 불구하고",
    "불구하고",
    "«… ga qaramasdan» (rasmiy).",
    "Negiz + -(으)ㅁ에도 불구하고; ot + 에도 불구하고.",
    [
      ["어려운 상황에도 불구하고 목표를 이루었다.", "Qiyin vaziyatga qaramasdan maqsadga erishdi."],
      ["비가 왔음에도 불구하고 많은 사람이 왔다.", "Yomg‘ir yog‘ganiga qaramay ko‘p odam keldi."],
    ],
    undefined,
    ["qaramasdan", "rasmiy"]
  ),
  g(
    "gie",
    5,
    "-기에",
    "",
    "«… gani uchun» (yozma, sabab).",
    "Negiz + -기에; o‘tgan: -았/었기에.",
    [
      ["날씨가 좋기에 산책을 나갔다.", "Havo yaxshi bo‘lgani uchun sayrga chiqdim."],
      ["값이 싸기에 많이 샀어요.", "Narxi arzon bo‘lgani uchun ko‘p oldim."],
    ],
    undefined,
    ["sabab", "yozma"]
  ),
  g(
    "eumeuro",
    5,
    "-(으)므로",
    "므로",
    "«… gani sababli» (rasmiy yozma).",
    "Unli/ㄹ: -므로, undosh: -으므로.",
    [
      ["이곳은 위험하므로 출입을 금지합니다.", "Bu joy xavfli bo‘lgani sababli kirish taqiqlanadi."],
      ["기한이 지났으므로 신청할 수 없다.", "Muddat o‘tgani sababli ariza berib bo‘lmaydi."],
    ],
    "E’lonlar va xavfsizlik ko‘rsatmalarida ko‘p uchraydi (EPS-TOPIK o‘qish qismi).",
    ["sabab", "rasmiy", "e’lon"]
  ),
  g(
    "jieonjeong",
    6,
    "-(으)ㄹ지언정",
    "지언정",
    "«… sam qolamanki, lekin … emas» — qat’iyat.",
    "Unli/ㄹ: -ㄹ지언정, undosh: -을지언정.",
    [
      ["굶을지언정 남의 것은 훔치지 않겠다.", "Och qolsam qolamanki, birovning narsasini o‘g‘irlamayman."],
      ["늦을지언정 대충 하지는 않겠어요.", "Kechiksam kechikamanki, chala-chulpa qilmayman."],
    ],
    undefined,
    ["qat’iyat"]
  ),
  g(
    "gi-nareum",
    6,
    "-기 나름이다",
    "나름",
    "«… ga bog‘liq».",
    "Negiz + -기 나름이다.",
    [
      ["행복은 생각하기 나름이에요.", "Baxt — qanday o‘ylashingga bog‘liq."],
      ["성공은 노력하기 나름이다.", "Muvaffaqiyat qancha mehnat qilishga bog‘liq."],
    ],
    undefined,
    ["bog‘liq"]
  ),
  g(
    "geonman",
    6,
    "-건만",
    "건만",
    "«… -sa-da, lekin …» (adabiy uslub).",
    "Negiz + -건만; o‘tgan: -았/었건만.",
    [
      ["열심히 준비했건만 결과가 좋지 않았다.", "Astoydil tayyorlangan bo‘lsam-da, natija yaxshi chiqmadi."],
      ["봄이 왔건만 날씨는 여전히 춥다.", "Bahor kelgan bo‘lsa-da, havo hamon sovuq."],
    ],
    undefined,
    ["adabiy", "lekin"]
  ),
  g(
    "lsera",
    6,
    "-(으)ㄹ세라",
    "세라",
    "«… masin deb (xavotirda)».",
    "Unli/ㄹ: -ㄹ세라, undosh: -을세라.",
    [
      ["아이가 깰세라 조용히 문을 닫았다.", "Bola uyg‘onib ketmasin deb eshikni ohista yopdim."],
      ["넘어질세라 천천히 걸었다.", "Yiqilib tushmay deb sekin yurdim."],
    ],
    undefined,
    ["xavotir", "-masin deb"]
  ),
  g(
    "noramyeon",
    6,
    "-노라면",
    "노라면",
    "«… aversang (vaqt o‘tib) …» (adabiy).",
    "Fe’l + -노라면.",
    [
      ["열심히 살노라면 좋은 날이 올 것이다.", "Astoydil yashayversang, yaxshi kunlar keladi."],
      ["참고 기다리노라면 기회가 온다.", "Sabr qilib kutaversang, imkoniyat keladi."],
    ],
    undefined,
    ["adabiy"]
  ),
  g(
    "dung-maneun-dung",
    6,
    "-는 둥 마는 둥",
    "둥마는둥",
    "«… di-yu, … madi-yu» — chala-chulpa qilish.",
    "Fe’l + -는 둥 마는 둥 하다.",
    [
      ["늦어서 아침을 먹는 둥 마는 둥 하고 나왔어요.", "Kechikkanimdan nonushtani yedim-yemadim, chiqib ketdim."],
      ["그는 내 말을 듣는 둥 마는 둥 했다.", "U gapimni eshitdi-eshitmadi qildi."],
    ],
    undefined,
    ["chala"]
  ),
];
