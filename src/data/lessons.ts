import type { Bi } from "@/lib/i18n";

export type Phrase = { ko: string; rom: string; uz: string; ru: string };
export type Lesson = { id: string; emoji: string; ko: string; title: Bi; grammar: Bi; phrases: Phrase[] };

const p = (ko: string, rom: string, uz: string, ru: string): Phrase => ({ ko, rom, uz, ru });

export const LESSONS: Lesson[] = [
  {
    id: "greet",
    emoji: "👋",
    ko: "인사",
    title: { uz: "Salomlashish", ru: "Приветствие" },
    grammar: {
      uz: "-요 va -ㅂ니다/-습니다 — hurmat shakllari. Notanish odam, ish joyi va do‘konda doim shu shakllarda gapiring.",
      ru: "-요 и -ㅂ니다/-습니다 — вежливые формы. С незнакомыми, на работе и в магазине всегда используйте их.",
    },
    phrases: [
      p("안녕하세요.", "annyeonghaseyo", "Assalomu alaykum / Salom", "Здравствуйте"),
      p("처음 뵙겠습니다.", "cheoeum boepgetseumnida", "Birinchi marta ko‘rishib turibmiz (tanishuvda)", "Рад познакомиться (при первой встрече)"),
      p("반갑습니다.", "bangapseumnida", "Ko‘rishganimdan xursandman", "Рад вас видеть"),
      p("감사합니다.", "gamsahamnida", "Rahmat", "Спасибо"),
      p("죄송합니다.", "joesonghamnida", "Kechirasiz (uzr so‘rash)", "Извините"),
      p("안녕히 가세요.", "annyeonghi gaseyo", "Xayr (ketayotgan odamga)", "До свидания (уходящему)"),
      p("안녕히 계세요.", "annyeonghi gyeseyo", "Xayr (qolayotgan odamga)", "До свидания (остающемуся)"),
    ],
  },
  {
    id: "intro",
    emoji: "🙋",
    ko: "자기소개",
    title: { uz: "O‘zini tanishtirish", ru: "Самопредставление" },
    grammar: {
      uz: "N은/는 N이에요/예요 — «Men …man». Undosh bilan tugasa 이에요 (학생이에요), unli bilan tugasa 예요 (의사예요).",
      ru: "N은/는 N이에요/예요 — «Я …». После согласной 이에요 (학생이에요), после гласной 예요 (의사예요).",
    },
    phrases: [
      p("저는 아지즈예요.", "jeoneun ajijeuyeyo", "Men Azizman", "Я Азиз"),
      p("우즈베키스탄 사람이에요.", "ujeubekiseutan saramieyo", "Men o‘zbekistonlikman", "Я из Узбекистана"),
      p("이름이 뭐예요?", "ireumi mwoyeyo", "Ismingiz nima?", "Как вас зовут?"),
      p("저는 학생이에요.", "jeoneun haksaengieyo", "Men talabaman", "Я студент"),
      p("저는 공장에서 일해요.", "jeoneun gongjangeseo ilhaeyo", "Men zavodda ishlayman", "Я работаю на заводе"),
      p("만나서 반가워요.", "mannaseo bangawoyo", "Tanishganimdan xursandman", "Рад знакомству"),
    ],
  },
  {
    id: "num1",
    emoji: "🔢",
    ko: "숫자 ①",
    title: { uz: "Raqamlar 1 (xitoycha-koreys)", ru: "Числа 1 (сино-корейские)" },
    grammar: {
      uz: "Sino-koreys raqamlar: pul, telefon, sana, daqiqa uchun. Diqqat: 10 000 = 만 — alohida birlik (5만 원 = 50 000 von).",
      ru: "Сино-корейские числа: для денег, телефонов, дат, минут. Внимание: 10 000 = 만 — отдельная единица (5만 원 = 50 000 вон).",
    },
    phrases: [
      p("일, 이, 삼, 사, 오", "il, i, sam, sa, o", "1, 2, 3, 4, 5", "1, 2, 3, 4, 5"),
      p("육, 칠, 팔, 구, 십", "yuk, chil, pal, gu, sip", "6, 7, 8, 9, 10", "6, 7, 8, 9, 10"),
      p("백, 천, 만", "baek, cheon, man", "100, 1 000, 10 000", "100, 1 000, 10 000"),
      p("이거 얼마예요?", "igeo eolmayeyo", "Bu qancha turadi?", "Сколько это стоит?"),
      p("만 오천 원이에요.", "man ocheon wonieyo", "15 000 von", "15 000 вон"),
      p("전화번호가 뭐예요?", "jeonhwabeonhoga mwoyeyo", "Telefon raqamingiz qanaqa?", "Какой у вас номер телефона?"),
    ],
  },
  {
    id: "num2",
    emoji: "⏰",
    ko: "숫자 ② · 시간",
    title: { uz: "Raqamlar 2 va vaqt", ru: "Числа 2 и время" },
    grammar: {
      uz: "Asl koreys raqamlari: soat (시), yosh (살), dona (개) uchun. 하나→한, 둘→두, 셋→세, 넷→네 sanoq so‘zidan oldin qisqaradi.",
      ru: "Исконно корейские числа: для часов (시), возраста (살), штук (개). Перед счётным словом: 하나→한, 둘→두, 셋→세, 넷→네.",
    },
    phrases: [
      p("하나, 둘, 셋, 넷, 다섯", "hana, dul, set, net, daseot", "1, 2, 3, 4, 5", "1, 2, 3, 4, 5"),
      p("여섯, 일곱, 여덟, 아홉, 열", "yeoseot, ilgop, yeodeol, ahop, yeol", "6, 7, 8, 9, 10", "6, 7, 8, 9, 10"),
      p("지금 몇 시예요?", "jigeum myeot siyeyo", "Hozir soat necha?", "Который час?"),
      p("세 시 삼십 분이에요.", "se si samsip bunieyo", "Soat 3:30", "Три тридцать"),
      p("사과 두 개 주세요.", "sagwa du gae juseyo", "Ikkita olma bering", "Дайте два яблока"),
      p("몇 살이에요?", "myeot sarieyo", "Necha yoshdasiz?", "Сколько вам лет?"),
    ],
  },
  {
    id: "verbs",
    emoji: "🏃",
    ko: "동사 -아요/어요",
    title: { uz: "Kundalik fe’llar", ru: "Повседневные глаголы" },
    grammar: {
      uz: "Fe’l o‘zagida ㅏ/ㅗ bo‘lsa → -아요 (가다→가요), boshqa bo‘lsa → -어요 (먹다→먹어요), 하다 → 해요 (공부하다→공부해요).",
      ru: "Если в основе ㅏ/ㅗ → -아요 (가다→가요), иначе → -어요 (먹다→먹어요), 하다 → 해요 (공부하다→공부해요).",
    },
    phrases: [
      p("가요 / 와요", "gayo / wayo", "boraman / kelaman", "иду / прихожу"),
      p("먹어요 / 마셔요", "meogeoyo / masyeoyo", "yeyman / ichaman", "ем / пью"),
      p("자요 / 일어나요", "jayo / ireonayo", "uxlayman / turaman", "сплю / встаю"),
      p("공부해요 / 일해요", "gongbuhaeyo / ilhaeyo", "o‘qiyman / ishlayman", "учусь / работаю"),
      p("좋아해요", "joahaeyo", "yoqtiraman", "люблю, нравится"),
      p("알아요 / 몰라요", "arayo / mollayo", "bilaman / bilmayman", "знаю / не знаю"),
    ],
  },
  {
    id: "food",
    emoji: "🍜",
    ko: "식당에서",
    title: { uz: "Restoranda", ru: "В ресторане" },
    grammar: {
      uz: "N 주세요 — «… bering». V-아/어 주세요 — «… qilib bering» (iltimos). Halol ovqat uchun «돼지고기» (cho‘chqa go‘shti) so‘zini yodlang!",
      ru: "N 주세요 — «дайте …». V-아/어 주세요 — «сделайте, пожалуйста». Для халяль запомните «돼지고기» (свинина)!",
    },
    phrases: [
      p("메뉴판 좀 주세요.", "menyupan jom juseyo", "Menyuni bering", "Дайте меню, пожалуйста"),
      p("이거 하나 주세요.", "igeo hana juseyo", "Bundan bitta bering", "Дайте одну такую"),
      p("돼지고기가 들어가요?", "dwaejigogiga deureogayo", "Ichida cho‘chqa go‘shti bormi?", "Здесь есть свинина?"),
      p("맵지 않게 해 주세요.", "maepji anke hae juseyo", "Achchiq qilmang", "Сделайте не острым"),
      p("물 좀 주세요.", "mul jom juseyo", "Suv bering", "Дайте воды"),
      p("계산해 주세요.", "gyesanhae juseyo", "Hisobni bering", "Посчитайте, пожалуйста"),
      p("정말 맛있어요!", "jeongmal masisseoyo", "Juda mazali!", "Очень вкусно!"),
    ],
  },
  {
    id: "shop",
    emoji: "🛍️",
    ko: "쇼핑",
    title: { uz: "Do‘konda", ru: "В магазине" },
    grammar: {
      uz: "V-아/어도 돼요? — «…sam bo‘ladimi?» (ruxsat so‘rash). 입어 봐도 돼요? — Kiyib ko‘rsam bo‘ladimi?",
      ru: "V-아/어도 돼요? — «можно …?» (разрешение). 입어 봐도 돼요? — Можно примерить?",
    },
    phrases: [
      p("이거 얼마예요?", "igeo eolmayeyo", "Bu qancha?", "Сколько стоит?"),
      p("너무 비싸요. 좀 깎아 주세요.", "neomu bissayo. jom kkakka juseyo", "Juda qimmat. Biroz arzonlashtiring", "Слишком дорого. Сделайте скидку"),
      p("다른 색깔 있어요?", "dareun saekkal isseoyo", "Boshqa rangi bormi?", "Есть другой цвет?"),
      p("입어 봐도 돼요?", "ibeo bwado dwaeyo", "Kiyib ko‘rsam bo‘ladimi?", "Можно примерить?"),
      p("카드로 계산할게요.", "kadeuro gyesanhalgeyo", "Karta bilan to‘layman", "Оплачу картой"),
      p("봉투 필요해요.", "bongtu piryohaeyo", "Paket kerak", "Нужен пакет"),
    ],
  },
  {
    id: "transport",
    emoji: "🚇",
    ko: "교통",
    title: { uz: "Transport", ru: "Транспорт" },
    grammar: {
      uz: "N에 가요 — «…ga boraman». N까지 — «…gacha». N(으)로 — yo‘nalish yoki vosita (버스로 — avtobusda).",
      ru: "N에 가요 — «еду в …». N까지 — «до …». N(으)로 — направление или средство (버스로 — на автобусе).",
    },
    phrases: [
      p("지하철역이 어디예요?", "jihacheollyeogi eodiyeyo", "Metro bekati qayerda?", "Где станция метро?"),
      p("서울역까지 가 주세요.", "seoullyeokkaji ga juseyo", "Seul vokzaligacha olib boring", "До вокзала Сеул, пожалуйста"),
      p("여기서 세워 주세요.", "yeogiseo sewo juseyo", "Shu yerda to‘xtating", "Остановите здесь"),
      p("이 버스 강남에 가요?", "i beoseu gangname gayo", "Bu avtobus Gangnamga boradimi?", "Этот автобус идёт в Каннам?"),
      p("몇 번 출구로 나가요?", "myeot beon chulguro nagayo", "Nechanchi chiqishdan chiqaman?", "Через какой выход выходить?"),
      p("교통카드 충전해 주세요.", "gyotongkadeu chungjeonhae juseyo", "Transport kartani to‘ldiring", "Пополните транспортную карту"),
    ],
  },
  {
    id: "hospital",
    emoji: "🏥",
    ko: "병원 · 약국",
    title: { uz: "Kasalxona va dorixona", ru: "Больница и аптека" },
    grammar: {
      uz: "N이/가 아파요 — «…im og‘riyapti». V-았/었어요 — o‘tgan zamon (걸리다 → 걸렸어요).",
      ru: "N이/가 아파요 — «болит …». V-았/었어요 — прошедшее время (걸리다 → 걸렸어요).",
    },
    phrases: [
      p("배가 아파요.", "baega apayo", "Qornim og‘riyapti", "Болит живот"),
      p("열이 나요.", "yeori nayo", "Isitmam bor", "У меня температура"),
      p("감기에 걸렸어요.", "gamgie geollyeosseoyo", "Shamollab qoldim", "Я простудился"),
      p("외국인등록증 여기 있어요.", "oegugindeungnokjeung yeogi isseoyo", "Mana ID kartam (ARC)", "Вот моя ID-карта иностранца"),
      p("이 약은 하루에 몇 번 먹어요?", "i yageun harue myeot beon meogeoyo", "Bu dorini kuniga necha marta ichaman?", "Сколько раз в день пить это лекарство?"),
      p("통역해 주실 수 있어요?", "tongyeokhae jusil su isseoyo", "Tarjima qilib bera olasizmi?", "Можете перевести?"),
    ],
  },
  {
    id: "work",
    emoji: "🏭",
    ko: "일터에서",
    title: { uz: "Ish joyida", ru: "На работе" },
    grammar: {
      uz: "V-(으)세요 — hurmatli iltimos/buyruq: 조심하세요 (ehtiyot bo‘ling), 앉으세요 (o‘tiring). Ishda tushunmasangiz, albatta qayta so‘rang!",
      ru: "V-(으)세요 — вежливая просьба: 조심하세요 (осторожно), 앉으세요 (садитесь). Не поняли — обязательно переспросите!",
    },
    phrases: [
      p("이거 어떻게 해요?", "igeo eotteoke haeyo", "Buni qanday qilaman?", "Как это делать?"),
      p("다시 한번 말해 주세요.", "dasi hanbeon malhae juseyo", "Yana bir bor ayting", "Повторите, пожалуйста"),
      p("천천히 말해 주세요.", "cheoncheonhi malhae juseyo", "Sekinroq gapiring", "Говорите медленнее"),
      p("다 했어요.", "da haesseoyo", "Tugatdim", "Я закончил"),
      p("오늘 몇 시까지 일해요?", "oneul myeot sikkaji ilhaeyo", "Bugun soat nechagacha ishlaymiz?", "До скольки сегодня работаем?"),
      p("조심하세요!", "josimhaseyo", "Ehtiyot bo‘ling!", "Осторожно!"),
      p("손을 다쳤어요.", "soneul dachyeosseoyo", "Qo‘limni jarohatladim", "Я поранил руку"),
    ],
  },
  {
    id: "days",
    emoji: "📅",
    ko: "날짜 · 요일",
    title: { uz: "Kunlar va sanalar", ru: "Дни и даты" },
    grammar: {
      uz: "Vaqt so‘zlaridan keyin 에 qo‘shiladi: 월요일에 (dushanbada), 세 시에 (soat 3 da). Lekin 오늘, 내일, 어제 dan keyin 에 qo‘shilmaydi.",
      ru: "После слов времени ставится 에: 월요일에 (в понедельник), 세 시에 (в 3 часа). Но после 오늘, 내일, 어제 — без 에.",
    },
    phrases: [
      p("오늘 / 내일 / 어제", "oneul / naeil / eoje", "bugun / ertaga / kecha", "сегодня / завтра / вчера"),
      p("월요일, 화요일, 수요일", "woryoil, hwayoil, suyoil", "dushanba, seshanba, chorshanba", "понедельник, вторник, среда"),
      p("목요일, 금요일, 토요일, 일요일", "mogyoil, geumyoil, toyoil, iryoil", "payshanba, juma, shanba, yakshanba", "четверг, пятница, суббота, воскресенье"),
      p("주말에 뭐 해요?", "jumare mwo haeyo", "Dam olish kunlari nima qilasiz?", "Что делаете на выходных?"),
      p("생일이 언제예요?", "saengiri eonjeyeyo", "Tug‘ilgan kuningiz qachon?", "Когда у вас день рождения?"),
      p("시간 있어요?", "sigan isseoyo", "Vaqtingiz bormi?", "У вас есть время?"),
    ],
  },
  {
    id: "office",
    emoji: "🏦",
    ko: "출입국 · 은행",
    title: { uz: "Migratsiya xizmati va bank", ru: "Миграционная служба и банк" },
    grammar: {
      uz: "V-고 싶어요 — «…moqchiman». V-(으)러 왔어요 — «…gani keldim» (등록하러 왔어요 — ro‘yxatdan o‘tgani keldim).",
      ru: "V-고 싶어요 — «хочу …». V-(으)러 왔어요 — «пришёл, чтобы …» (등록하러 왔어요 — пришёл зарегистрироваться).",
    },
    phrases: [
      p("외국인 등록을 하러 왔어요.", "oegugin deungnogeul hareo wasseoyo", "Chet ellik sifatida ro‘yxatdan o‘tgani keldim", "Пришёл на регистрацию иностранца"),
      p("체류 기간을 연장하고 싶어요.", "cheryu giganeul yeonjanghago sipeoyo", "Yashash muddatini uzaytirmoqchiman", "Хочу продлить срок пребывания"),
      p("어떤 서류가 필요해요?", "eotteon seoryuga piryohaeyo", "Qanday hujjatlar kerak?", "Какие документы нужны?"),
      p("번호표를 뽑으세요.", "beonhopyoreul ppobeuseyo", "Navbat raqamini oling", "Возьмите талон"),
      p("통장을 만들고 싶어요.", "tongjangeul mandeulgo sipeoyo", "Bank hisob ochmoqchiman", "Хочу открыть счёт"),
      p("해외로 송금하고 싶어요.", "haeoero songgeumhago sipeoyo", "Chet elga pul o‘tkazmoqchiman", "Хочу перевести деньги за границу"),
    ],
  },
];
