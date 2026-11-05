// TOPIK grammatika bazasi (1급–6급). AI Ustoz va «Grammatika» sahifasi shu ma’lumotdan foydalanadi.
// Har bir qolip: ma’nosi (o‘zbekcha), misol va tarjima, qidiruv uchun teglar. Mazmun — HanQadam.

export type Grammar = {
  id: string;
  p: string; // qolip
  lv: 1 | 2 | 3 | 4 | 5 | 6;
  uz: string;
  ex: string;
  exUz: string;
  tags: string[];
  note?: string;
};

const g = (id: string, p: string, lv: Grammar["lv"], uz: string, ex: string, exUz: string, tags: string[], note?: string): Grammar => ({
  id,
  p,
  lv,
  uz,
  ex,
  exUz,
  tags,
  note,
});

export const GRAMMAR: Grammar[] = [
  // ── 1급 ──
  g("eun-neun", "은/는", 1, "Mavzu qo‘shimchasi: «… esa», gapning mavzusi yoki qiyoslash", "저는 학생이에요. 동생은 회사원이에요.", "Men talabaman. Ukam esa xizmatchi.", ["mavzu", "qo'shimcha", "particle"], "Yangi ma’lumot/javob kimligini ko‘rsatishda 이/가 ishlatiladi: 누가 왔어요? — 민수가 왔어요."),
  g("i-ga", "이/가", 1, "Ega qo‘shimchasi: kim/nima — yangi ma’lumot, 있다/없다/되다/아니다 bilan", "교실에 학생이 있어요.", "Sinfda o‘quvchi bor.", ["ega", "qo'shimcha", "particle"]),
  g("eul-reul", "을/를", 1, "Tushum kelishigi (-ni): fe’lning to‘ldiruvchisi", "저는 사과를 먹어요.", "Men olmani yeyman.", ["to'ldiruvchi", "-ni", "qo'shimcha"]),
  g("e", "에", 1, "Joy (qayerga, qayerda bor), vaqt (qachon): -ga, -da", "내일 3시에 학교에 가요.", "Ertaga soat 3 da maktabga boraman.", ["joy", "vaqt", "-ga", "-da"], "Harakat sodir bo‘ladigan joy uchun 에서: 학교에서 공부해요."),
  g("eseo", "에서", 1, "Harakat joyi (-da) yoki qayerdan (-dan)", "도서관에서 책을 읽어요. 저는 우즈베키스탄에서 왔어요.", "Kutubxonada kitob o‘qiyman. Men O‘zbekistondan keldim.", ["joy", "-dan", "-da"]),
  g("do", "도", 1, "«ham»", "저도 한국어를 배워요.", "Men ham koreys tilini o‘rganaman.", ["ham"]),
  g("man", "만", 1, "«faqat»", "물만 마셨어요.", "Faqat suv ichdim.", ["faqat"]),
  g("hago", "하고 / 와/과 / (이)랑", 1, "«va», «bilan» (otlarni bog‘lash)", "친구하고 영화를 봤어요.", "Do‘stim bilan kino ko‘rdim.", ["bilan", "va"]),
  g("ui", "의", 1, "Qaratqich (-ning)", "이것은 선생님의 책이에요.", "Bu — o‘qituvchining kitobi.", ["-ning", "egalik"]),
  g("buteo-kkaji", "부터 … 까지 / 에서 … 까지", 1, "«…dan …gacha» (vaqt: 부터, joy: 에서)", "9시부터 6시까지 일해요. 집에서 회사까지 멀어요.", "9 dan 6 gacha ishlayman. Uydan ishxonagacha uzoq.", ["-dan", "-gacha", "vaqt"]),
  g("eu-ro", "(으)로", 1, "Yo‘nalish (tomonga), vosita (bilan), tanlov", "버스로 가요. 오른쪽으로 가세요.", "Avtobusda boraman. O‘ngga yuring.", ["vosita", "yo'nalish", "bilan"]),
  g("ieyo", "이에요/예요, 입니다", 1, "«…dir» (bog‘lama)", "저는 아지즈예요. 여기는 은행입니다.", "Men Azizman. Bu yer — bank.", ["bog'lama", "-dir"]),
  g("ayo", "-아요/어요/해요", 1, "Hozirgi zamon, norasmiy-hurmat uslubi (해요체)", "저는 매일 운동해요. 김치가 맛있어요.", "Har kuni sport bilan shug‘ullanaman. Kimchi mazali.", ["hozirgi zamon", "uslub"], "ㅏ/ㅗ unlisidan keyin -아요, qolganlarida -어요, 하다 → 해요."),
  g("seumnida", "-습니다/ㅂ니다", 1, "Rasmiy uslub (yangilik, ish joyi, imtihon)", "회의가 곧 시작됩니다.", "Majlis tez orada boshlanadi.", ["rasmiy", "uslub"]),
  g("asseoyo", "-았어요/었어요", 1, "O‘tgan zamon", "어제 친구를 만났어요.", "Kecha do‘stim bilan uchrashdim.", ["o'tgan zamon"]),
  g("l-geoyeyo", "-(으)ㄹ 거예요", 1, "Kelasi zamon / reja; taxmin", "주말에 부산에 갈 거예요.", "Dam olish kuni Pusanga boraman.", ["kelasi zamon", "reja", "taxmin"]),
  g("go-sipda", "-고 싶다", 1, "«…gim kelyapti» (istak)", "한국 음식을 먹고 싶어요.", "Koreys taomini yegim kelyapti.", ["istak", "xohlash"], "3-shaxs uchun -고 싶어하다: 동생이 한국에 가고 싶어해요."),
  g("ji-anta", "안 / -지 않다", 1, "Inkor: «…mayman»", "오늘은 안 바빠요. = 바쁘지 않아요.", "Bugun band emasman.", ["inkor"]),
  g("mot", "못 / -지 못하다", 1, "Qila olmaslik (imkoniyat yo‘q)", "다리가 아파서 못 걸어요.", "Oyog‘im og‘rigani uchun yura olmayman.", ["inkor", "qila olmaslik"]),
  g("go", "-고", 1, "«va», «…ib» (harakatlarni bog‘lash)", "밥을 먹고 커피를 마셨어요.", "Ovqat yeb, qahva ichdim.", ["bog'lovchi", "va", "ketma-ketlik"]),
  g("jiman", "-지만", 1, "«lekin», «…sa-da»", "한국어는 어렵지만 재미있어요.", "Koreys tili qiyin, lekin qiziqarli.", ["qarama-qarshilik", "lekin"]),
  g("aseo", "-아서/어서", 1, "Sabab («…gani uchun») yoki ketma-ketlik («…ib»)", "비가 와서 집에 있었어요. 학교에 가서 공부해요.", "Yomg‘ir yoqqani uchun uyda qoldim. Maktabga borib o‘qiyman.", ["sabab", "ketma-ketlik"], "Sabab ma’nosida undan keyin buyruq/taklif kelmaydi (-(으)니까 ishlating). O‘tgan zamon qo‘shilmaydi: 왔어서 ✗."),
  g("eunikka", "-(으)니까", 1, "Sabab (buyruq/taklif bilan ham bo‘ladi); «…sa, ma’lum bo‘ldiki»", "추우니까 코트를 입으세요.", "Sovuq, shuning uchun palto kiying.", ["sabab", "buyruq"]),
  g("euseyo", "-(으)세요", 1, "Hurmatli iltimos/buyruq: «…ing»", "여기에 앉으세요.", "Bu yerga o‘tiring.", ["buyruq", "iltimos", "hurmat"]),
  g("ji-maseyo", "-지 마세요", 1, "Taqiq: «…mang»", "여기에서 사진을 찍지 마세요.", "Bu yerda suratga olmang.", ["taqiq", "inkor"]),
  g("eulkkayo", "-(으)ㄹ까요?", 1, "Taklif («…aylikmi?») yoki fikr so‘rash", "같이 점심 먹을까요?", "Birga tushlik qilaylikmi?", ["taklif"]),
  g("eupsida", "-(으)ㅂ시다", 1, "«…aylik» (taklif)", "잠깐 쉽시다.", "Bir oz dam olaylik.", ["taklif"]),
  g("eul-su-itda", "-(으)ㄹ 수 있다/없다", 1, "Qila olmoq / qila olmaslik", "저는 한국어로 말할 수 있어요.", "Men koreyscha gapira olaman.", ["imkoniyat", "qobiliyat"]),
  g("ayahada", "-아야/어야 하다(되다)", 1, "Majburiyat: «…ishim kerak»", "내일까지 숙제를 내야 해요.", "Ertagacha uy vazifasini topshirishim kerak.", ["majburiyat", "kerak"]),
  g("ado-doeda", "-아도/어도 되다", 2, "Ruxsat: «…sam bo‘ladimi?»", "창문을 열어도 돼요?", "Derazani ochsam bo‘ladimi?", ["ruxsat"]),
  g("eumyeon-an-doeda", "-(으)면 안 되다", 2, "Taqiq: «…ish mumkin emas»", "수업 시간에 전화하면 안 돼요.", "Dars vaqtida telefon qilish mumkin emas.", ["taqiq"]),
  g("eumyeon", "-(으)면", 1, "Shart: «agar …sa»", "시간이 있으면 같이 가요.", "Vaqtingiz bo‘lsa, birga boraylik.", ["shart", "agar"]),
  g("go-itda", "-고 있다", 1, "Davomli harakat: «…yapti»", "지금 비가 오고 있어요.", "Hozir yomg‘ir yog‘yapti.", ["davomli", "hozir"]),
  g("eureo", "-(으)러 가다/오다", 1, "Maqsad bilan borish: «…gani bormoq»", "책을 빌리러 도서관에 가요.", "Kitob olgani kutubxonaga boraman.", ["maqsad"], "Faqat 가다/오다/다니다 bilan ishlatiladi."),
  g("eulyeogo", "-(으)려고 (하다)", 2, "Niyat: «…moqchi», «…ish uchun»", "한국 회사에 취직하려고 한국어를 배워요.", "Koreys kompaniyasiga ishga kirish uchun koreys tilini o‘rganaman.", ["maqsad", "niyat"]),
  g("eulge", "-(으)ㄹ게요", 2, "Va’da/qaror (so‘zlovchi o‘zi qiladi)", "제가 내일 전화할게요.", "Ertaga men qo‘ng‘iroq qilaman.", ["va'da", "qaror"], "TOPIK II 9–12-savollarda «keyin nima qiladi?» javobi ko‘pincha shu shaklda."),
  g("ago-sipda-ara", "-아 보다/어 보다", 2, "Sinab ko‘rish; tajriba (-아 봤어요)", "이 옷 한번 입어 보세요. 제주도에 가 봤어요.", "Bu kiyimni kiyib ko‘ring. Chejuga borganman.", ["tajriba", "sinab ko'rish"]),
  g("eun-jeok-itda", "-(으)ㄴ 적이 있다/없다", 2, "Tajriba: «…gan(im) bor/yo‘q»", "한국 드라마를 본 적이 있어요.", "Koreys serialini ko‘rganman.", ["tajriba"]),
  g("a-juda", "-아/어 주다(드리다)", 1, "Birov uchun qilish", "사진 좀 찍어 주세요.", "Iltimos, suratga olib bering.", ["iltimos", "yordam"]),
  g("gi-jeone", "-기 전에", 1, "«…dan oldin»", "자기 전에 이를 닦아요.", "Uxlashdan oldin tish yuvaman.", ["vaqt", "oldin"]),
  g("eun-hue", "-(으)ㄴ 후에(다음에)", 1, "«…dan keyin»", "수업이 끝난 후에 만나요.", "Dars tugagandan keyin uchrashamiz.", ["vaqt", "keyin"]),
  g("eul-ttae", "-(으)ㄹ 때", 1, "«…ganda», «… paytida»", "한국에 처음 왔을 때 많이 힘들었어요.", "Koreyaga ilk kelganimda juda qiyin bo‘ldi.", ["vaqt", "payt"]),
  g("neun-geot", "-는 것 / -기", 2, "Fe’lni otga aylantirish: «…ish»", "제 취미는 음악을 듣는 것이에요.", "Mening xobbim — musiqa tinglash.", ["otlashtirish"]),
  g("neun-relative", "-는 / -(으)ㄴ / -(으)ㄹ (관형형)", 2, "Sifatdosh: «…ayotgan / …gan / …adigan»", "어제 본 영화가 재미있었어요. 내일 할 일이 많아요.", "Kecha ko‘rgan kinom qiziq edi. Ertaga qiladigan ishim ko‘p.", ["sifatdosh", "aniqlovchi"]),
  g("neunde", "-는데 / -(으)ㄴ데", 2, "Fon/vaziyat berish, qarama-qarshilik: «…di, lekin», «…yapman, …»", "배가 고픈데 밥 먹으러 갈까요?", "Qornim och, ovqatlanishga boraylikmi?", ["fon", "qarama-qarshilik"]),
  g("ji-yo", "-지요(죠)?", 2, "Tasdiqlash: «…-ku, a?»", "날씨가 정말 덥지요?", "Havo juda issiq-a?", ["tasdiq"]),
  g("neyo", "-네요", 2, "Hayrat/kashfiyot: «…ekan-ku!»", "한국어를 정말 잘하시네요!", "Koreyschani juda yaxshi gapirar ekansiz!", ["hayrat"]),
  g("geona", "-거나", 2, "«yoki»", "주말에는 청소하거나 쉬어요.", "Dam olish kunlari tozalayman yoki dam olaman.", ["yoki", "tanlov"]),
  g("boda", "보다 (더)", 1, "Qiyoslash: «…dan ko‘ra»", "버스보다 지하철이 더 빨라요.", "Avtobusdan ko‘ra metro tezroq.", ["qiyoslash"]),
  g("gi-ttaemune", "-기 때문에 / 때문에", 2, "Sabab (rasmiyroq): «…gani sababli»", "길이 막히기 때문에 지하철을 타요.", "Yo‘l tiqilib qolgani sababli metroda boraman.", ["sabab"]),
  g("eun-geot-gatda", "-(으)ㄴ/는/(으)ㄹ 것 같다", 2, "Taxmin: «…ga o‘xshaydi»", "비가 올 것 같아요.", "Yomg‘ir yog‘adiganga o‘xshaydi.", ["taxmin"]),
  g("ge-doeda", "-게 되다", 3, "Holat o‘zgarishi: «…adigan bo‘lib qoldi»", "회사 때문에 서울로 이사하게 됐어요.", "Ish sababli Seulga ko‘chadigan bo‘ldim.", ["o'zgarish"]),
  g("aji-da", "-아/어지다", 3, "Holatga aylanish: «…lashmoq», «…lanmoq»", "날씨가 따뜻해졌어요.", "Havo iliqlashdi.", ["o'zgarish"]),
  g("ge", "-게", 2, "Ravish yasash: «…cha, …lab»", "글씨를 크게 써 주세요.", "Harflarni katta qilib yozing.", ["ravish"]),
  // ── 3급–4급 (TOPIK II) ──
  g("myeonseo", "-(으)면서", 3, "Bir vaqtda ikki harakat: «…turib»", "음악을 들으면서 공부해요.", "Musiqa tinglab turib o‘qiyman.", ["bir vaqtda"]),
  g("daga", "-다가", 3, "Harakat to‘xtab boshqasiga o‘tish: «…ayotib»", "집에 가다가 친구를 만났어요.", "Uyga ketayotib do‘stimni uchratdim.", ["o'zgarish", "jarayon"], "-았다가: harakat tugab, keyin boshqasi: 문을 열었다가 닫았어요."),
  g("neura-go", "-느라고", 4, "Salbiy natijaga sabab bo‘lgan mashg‘ulot: «…bilan band bo‘lib»", "시험 준비를 하느라고 잠을 못 잤어요.", "Imtihonga tayyorlanib, uxlay olmadim.", ["sabab", "salbiy"], "Ega bir xil bo‘ladi; sifat bilan ishlatilmaydi. TOPIK II o‘qish 1–4-savollarida tez-tez chiqadi."),
  g("neun-baram-e", "-는 바람에", 4, "Kutilmagan salbiy sabab: «…ib qolgani uchun»", "버스를 놓치는 바람에 지각했어요.", "Avtobusdan qolib ketganim uchun kechikdim.", ["sabab", "salbiy", "kutilmagan"], "Faqat o‘tgan salbiy natija bilan; ma’nosi -아서/-는 탓에 ga yaqin."),
  g("neun-tase", "-(으)ㄴ/는 탓에", 4, "Ayb/salbiy sabab: «…gani dastidan»", "날씨가 추운 탓에 감기에 걸렸어요.", "Havo sovuqligi dastidan shamolladim.", ["sabab", "salbiy"]),
  g("deoni", "-더니", 4, "O‘tmishdagi kuzatuv va natija/qarama-qarshilik", "아침에는 맑더니 오후에 비가 오네요.", "Ertalab ochiq edi, tushdan keyin yomg‘ir yog‘yapti.", ["kuzatuv", "o'tgan"]),
  g("deorago", "-더라고요", 3, "O‘zi ko‘rgan-bilganini aytish: «…ekan»", "그 식당 음식이 정말 맛있더라고요.", "O‘sha restoran taomi juda mazali ekan.", ["kuzatuv", "tajriba"]),
  g("geodeun", "-거든요", 3, "Sabab/izoh berish (so‘zlashuv): «chunki …-da»", "오늘 못 가요. 일이 많거든요.", "Bugun bora olmayman. Ishim ko‘p-da.", ["sabab", "izoh"]),
  g("eul-ppunman-anira", "-(으)ㄹ 뿐만 아니라", 4, "«…gina emas, balki»", "그 가게는 쌀 뿐만 아니라 친절해요.", "U do‘kon arzongina emas, xushmuomala ham.", ["qo'shimcha", "nafaqat"]),
  g("eul-jeongdo-ro", "-(으)ㄹ 정도로", 4, "Daraja: «…darajada»", "눈물이 날 정도로 감동했어요.", "Ko‘z yoshim chiqadigan darajada ta’sirlandim.", ["daraja"]),
  g("doelok", "-도록", 4, "Maqsad/daraja: «…shi uchun», «…guncha»", "늦지 않도록 일찍 출발하세요.", "Kechikmaslik uchun erta jo‘nang.", ["maqsad", "daraja"]),
  g("gi-wihae", "-기 위해(서)", 3, "Maqsad: «…ish uchun»", "건강을 지키기 위해 매일 걸어요.", "Sog‘lig‘imni asrash uchun har kuni yuraman.", ["maqsad"]),
  g("gi-ro-hada", "-기로 하다", 3, "Qaror qilish: «…ishga qaror qildi»", "올해부터 담배를 끊기로 했어요.", "Shu yildan chekishni tashlashga qaror qildim.", ["qaror"]),
  g("eul-jul-alda", "-(으)ㄹ 줄 알다/모르다", 3, "Uddalay olish (ko‘nikma)", "저는 운전할 줄 몰라요.", "Men mashina haydashni bilmayman.", ["qobiliyat", "ko'nikma"]),
  g("eun-ji", "-(으)ㄴ 지 (시간이) 되다", 3, "«…ganiga … bo‘ldi»", "한국에 온 지 2년이 됐어요.", "Koreyaga kelganimga 2 yil bo‘ldi.", ["vaqt", "davomiylik"]),
  g("neun-dong-an", "-는 동안(에)", 3, "«…ayotgan vaqtda»", "제가 요리하는 동안 청소해 주세요.", "Men ovqat pishirayotganimda tozalab turing.", ["vaqt", "payt"]),
  g("ja-maja", "-자마자", 3, "«…ishi bilanoq»", "집에 도착하자마자 잤어요.", "Uyga yetib kelishim bilanoq uxladim.", ["vaqt", "darhol"]),
  g("eumyeonseodo", "-(으)ㄴ/는데도", 4, "«…ga qaramay»", "약을 먹었는데도 열이 안 내려요.", "Dori ichganimga qaramay isitmam tushmayapti.", ["qarama-qarshilik", "qaramay"]),
  g("deorado", "-더라도", 4, "«…sa ham» (faraziy)", "힘들더라도 포기하지 마세요.", "Qiyin bo‘lsa ham taslim bo‘lmang.", ["shart", "qaramay"]),
  g("ado-concession", "-아/어도", 3, "«…sa ham»", "아무리 바빠도 아침은 꼭 먹어요.", "Qanchalik band bo‘lsam ham nonushtani albatta qilaman.", ["qaramay", "shart"]),
  g("eul-tende", "-(으)ㄹ 텐데", 4, "Taxmin + vaziyat: «…sa kerak, …»", "많이 피곤할 텐데 좀 쉬세요.", "Juda charchagan bo‘lsangiz kerak, biroz dam oling.", ["taxmin"]),
  g("eul-ppeonhada", "-(으)ㄹ 뻔하다", 4, "«…ishiga sal qoldi»", "길이 미끄러워서 넘어질 뻔했어요.", "Yo‘l sirpanchiq ekan, yiqilib tushishimga sal qoldi.", ["deyarli"]),
  g("go-mal-da", "-고 말다", 4, "Istalmagan natija: «…ib qo‘ydi»", "참으려고 했지만 울고 말았어요.", "Chidamoqchi edim, lekin yig‘lab yubordim.", ["natija", "afsus"]),
  g("a-beorida", "-아/어 버리다", 3, "Butunlay tugatish (yengillik yoki afsus)", "숙제를 다 해 버렸어요. 기차가 떠나 버렸어요.", "Uy vazifasini butunlay qilib bo‘ldim. Poyezd ketib qoldi.", ["natija", "tugatish"]),
  g("a-dugo", "-아/어 두다(놓다)", 3, "Oldindan qilib qo‘yish", "여행 전에 호텔을 예약해 두었어요.", "Sayohatdan oldin mehmonxonani bron qilib qo‘ydim.", ["tayyorlov"]),
  g("eun-pyeon-ida", "-(으)ㄴ/는 편이다", 3, "Moyillik: «…roq tomonda»", "저는 매운 음식을 잘 먹는 편이에요.", "Men achchiq taomni yaxshi yeyman (shunaqaroqman).", ["moyillik"]),
  g("neun-gil-e", "-는 길에", 3, "«…ga ketayotib (yo‘lda)»", "퇴근하는 길에 마트에 들렀어요.", "Ishdan qaytayotib do‘konga kirdim.", ["yo'lda"]),
  g("eul-manhada", "-(으)ㄹ 만하다", 3, "«…ishga arziydi»", "이 영화는 볼 만해요.", "Bu kino ko‘rishga arziydi.", ["baho", "tavsiya"]),
  g("neun-daero", "-는 대로", 4, "«…ishi bilan / …dek»", "도착하는 대로 연락 주세요.", "Yetib borishingiz bilan xabar bering.", ["vaqt", "muvofiq"]),
  g("eul-su-bake", "-(으)ㄹ 수밖에 없다", 4, "«…dan boshqa iloj yo‘q»", "버스가 끊겨서 택시를 탈 수밖에 없었어요.", "Avtobus qatnovi tugagani uchun taksiga chiqishdan boshqa iloj yo‘q edi.", ["majburiyat", "iloj"]),
  g("gi-majelyeon", "-기 마련이다", 5, "Tabiiy hol: «…ishi tabiiy», «doim shunday bo‘ladi»", "처음에는 누구나 실수하기 마련이에요.", "Boshida har kim xato qilishi tabiiy.", ["umumiy haqiqat"]),
  g("neun-han", "-는 한", 5, "«…ar ekan (sharti bilan)»", "포기하지 않는 한 기회는 있어요.", "Taslim bo‘lmas ekansiz, imkoniyat bor.", ["shart"]),
  g("eumyeo", "-(으)며", 4, "Yozma uslubda «va», «…ib»", "그는 의사이며 작가이다.", "U shifokor va yozuvchidir.", ["yozma", "bog'lovchi"]),
  g("neunda-style", "-ㄴ/는다 (한다체)", 3, "Yozma uslub: gazeta, esse, TOPIK 쓰기 (51–54)", "최근 1인 가구가 증가하고 있다.", "So‘nggi paytda yolg‘iz yashovchi xonadonlar ko‘paymoqda.", ["yozma", "uslub", "쓰기", "esse"], "53–54-topshiriqlarda -아요/-습니다 emas, faqat shu uslubda yozing."),
  g("dago-hada", "-다고 하다 (간접화법)", 3, "O‘zlashtirma gap: «…deb aytdi»", "민수 씨가 내일 바쁘다고 했어요.", "Minsu ertaga bandman dedi.", ["ko'chirma", "nutq"], "Fe’l: -ㄴ/는다고, ot: -(이)라고, so‘roq: -냐고, buyruq: -(으)라고, taklif: -자고."),
  g("dae-yo", "-대요 / -래요", 3, "Eshitganini aytish (qisqa shakl): «…emish»", "내일 비가 온대요.", "Ertaga yomg‘ir yog‘armish.", ["ko'chirma", "eshitilgan"]),
  g("eul-ji-moreuda", "-(으)ㄹ지 모르다", 4, "«…ishi mumkin (ehtimol)»", "길이 막힐지 모르니까 일찍 나가요.", "Yo‘l tiqilishi mumkin, erta chiqaylik.", ["taxmin", "ehtimol"]),
  g("neun-ji", "-는지", 3, "Bilvosita so‘roq: «…ini (bilmayman)»", "회의가 몇 시에 시작하는지 알아요?", "Majlis soat nechada boshlanishini bilasizmi?", ["so'roq"]),
  g("gido-hada", "-기도 하다", 4, "«…ishi ham bo‘ladi»", "주말에는 친구를 만나기도 해요.", "Dam olish kunlari do‘stlarim bilan uchrashib ham turaman.", ["ba'zan"]),
  g("eun-chae", "-(으)ㄴ 채(로)", 5, "Holatni saqlagan holda: «…gan holicha»", "불을 켠 채로 잠이 들었어요.", "Chiroqni yoqiq qoldirgan holda uxlab qoldim.", ["holat"]),
  g("geomeul", "-(으)ㅁ", 4, "Yozma otlashtirish (e’lon, eslatma)", "내일 회의 없음.", "Ertaga majlis yo‘q.", ["otlashtirish", "yozma"]),
  g("e-ttareumyeon", "-에 따르면", 4, "«…ga ko‘ra (manba)»", "일기 예보에 따르면 내일 눈이 온대요.", "Ob-havo ma’lumotiga ko‘ra ertaga qor yog‘armish.", ["manba", "ko'chirma"]),
  g("e-bihae", "-에 비해(서)", 4, "«…ga nisbatan» (qiyoslash)", "작년에 비해 물가가 많이 올랐다.", "O‘tgan yilga nisbatan narxlar ancha oshdi.", ["qiyoslash", "grafik", "53"]),
  g("eu-ro-inhae", "-(으)로 인해", 5, "«… tufayli» (yozma sabab)", "폭우로 인해 도로가 통제되었다.", "Kuchli yomg‘ir tufayli yo‘l yopildi.", ["sabab", "yozma"]),
  g("eul-ppun", "-(으)ㄹ 뿐이다", 4, "«faqat …xolos»", "저는 제 일을 했을 뿐이에요.", "Men faqat o‘z ishimni qildim, xolos.", ["faqat"]),
  g("neun-geot-cheoreom", "-는 것처럼 / 처럼", 3, "«…dek, …kabi»", "그 사람은 가수처럼 노래를 잘해요.", "U odam qo‘shiqchidek yaxshi kuylaydi.", ["o'xshatish"]),
  g("eul-geot-iji-anida", "-(으)ㄹ 게 아니라", 5, "«…ish o‘rniga (aksincha)»", "걱정만 할 게 아니라 방법을 찾아봅시다.", "Faqat xavotirlanish o‘rniga yo‘l izlaylik.", ["muqobil"]),
  g("eogi-ero", "-(으)ㄹ 겸", 4, "Bir yo‘la ikki maqsad: «ham …, ham …»", "운동도 할 겸 산책도 할 겸 공원에 갔어요.", "Ham sport, ham sayr uchun bog‘ga bordim.", ["maqsad"]),
  g("neun-myeon", "-다 보면", 4, "«…averib, …» (takror natijasi)", "매일 연습하다 보면 실력이 늘 거예요.", "Har kuni mashq qilaversangiz, mahoratingiz oshadi.", ["natija", "takror"]),
  g("da-boni", "-다 보니(까)", 4, "«…averib (bilib qoldimki)»", "한국 친구와 자주 이야기하다 보니 한국어가 늘었어요.", "Koreys do‘stim bilan tez-tez gaplashaverib, koreyscham yaxshilandi.", ["natija", "takror"]),
  g("eotdeoni", "-았/었더니", 5, "O‘z harakatidan keyingi kashfiyot", "약을 먹었더니 머리가 안 아파요.", "Dori ichgan edim, boshim og‘rimay qoldi.", ["natija", "kashfiyot"]),
  g("neun-surok", "-(으)면 -(으)ㄹ수록", 4, "«qanchalik …sa, shunchalik …»", "한국어는 공부하면 할수록 재미있어요.", "Koreys tilini qancha o‘rgansam, shuncha qiziq.", ["daraja", "qiyoslash"]),
  g("goneun-hada", "-곤 하다", 5, "Odat bo‘lgan takror: «…ib turardim»", "어렸을 때 할머니 댁에 가곤 했어요.", "Bolaligimda buvimnikiga borib turardim.", ["odat", "o'tgan"]),
  g("eul-ttaemyeon", "-(으)ㄹ 무렵", 5, "«… paytlari, … chog‘ida»", "해가 질 무렵 집에 돌아왔어요.", "Quyosh botar chog‘ida uyga qaytdim.", ["vaqt"]),
  g("neun-bandae", "-는 반면(에)", 5, "Qarama-qarshi qiyos: «…sa, aksincha …»", "도시는 편리한 반면에 공기가 나빠요.", "Shahar qulay, aksincha havosi yomon.", ["qarama-qarshilik", "esse", "54"]),
  g("gi-e", "-기에", 5, "Yozma sabab: «…gani uchun»", "날씨가 좋기에 산책을 나갔다.", "Havo yaxshi bo‘lgani uchun sayrga chiqdim.", ["sabab", "yozma"]),
  g("neun-gotta", "-(으)ㄴ/는 셈이다", 5, "«…ga teng, amalda …dek»", "한 달에 두 번 만나니까 거의 안 만나는 셈이에요.", "Oyiga ikki marta uchrashamiz, amalda deyarli uchrashmaymiz.", ["taqqoslash", "xulosa"]),
  g("eul-ppun-deoreo", "-(으)ㄹ 뿐더러", 5, "«…gina emas, buning ustiga»", "그 일은 힘들 뿐더러 월급도 적어요.", "U ish og‘irgina emas, maoshi ham kam.", ["qo'shimcha", "nafaqat"]),
  g("neun-han-pyeon", "-는 한편", 5, "«bir tomondan …, ikkinchi tomondan»", "정부는 일자리를 늘리는 한편 교육도 지원하고 있다.", "Hukumat ish o‘rinlarini ko‘paytirish bilan birga ta’limni ham qo‘llab-quvvatlamoqda.", ["yozma", "esse"]),
  g("eul-jirado", "-(으)ㄹ지라도", 6, "«…sa-da (hatto)» (kuchli faraz)", "모두가 반대할지라도 저는 하겠습니다.", "Hamma qarshi bo‘lsa-da, men qilaman.", ["qaramay", "faraz"]),
  g("geoniwa", "-거니와", 6, "«…ning ustiga» (yozma)", "그는 성실하거니와 능력도 뛰어나다.", "U vijdonli bo‘lishining ustiga qobiliyati ham zo‘r.", ["qo'shimcha", "yozma"]),
  g("neun-badame", "-(으)ㄴ/는 마당에", 6, "«…gan bir paytda (vaziyat)»", "다 끝난 마당에 후회해도 소용없다.", "Hammasi tugagan bir paytda afsuslanishdan foyda yo‘q.", ["vaziyat"]),
];

// Juda umumiy bo‘laklar — ular bo‘yicha moslik qidirilmaydi
const STOP = new Set(["하다", "있다", "없다", "되다", "같다", "주다", "보다", "이다", "가다", "오다", "알다", "모르다", "드리다", "놓다", "두다", "시간이", "아니라"]);

// Teglardagi so‘z yoki qolipning o‘zi matnda uchrasa — mos grammatikani qaytaradi
export function findGrammarIn(text: string, limit = 6): Grammar[] {
  const t = text.toLowerCase();
  const scored: { g: Grammar; s: number }[] = [];
  for (const gr of GRAMMAR) {
    let s = 0;
    // qolip bo‘laklari: "-(으)니까" → "니까"
    for (const part of gr.p.split(/[\s/,()·…-]+/)) {
      const core = part.replace(/[ㄱ-ㅎ]/g, "").trim();
      if (core.length < 2 || STOP.has(core) || !t.includes(core)) continue;
      // uzunroq bo‘lak aniqroq; o‘quvchi qolipni «-느라고» deb yozgan bo‘lsa — eng muhim
      s += core.length + (t.includes("-" + core) || t.includes(")" + core) ? 6 : 0);
    }
    if (gr.p.length >= 3 && t.includes(gr.p.toLowerCase())) s += 8; // qolip to‘liq yozilgan
    for (const tag of gr.tags) if (tag.length >= 3 && t.includes(tag)) s += 1;
    if (s) scored.push({ g: gr, s });
  }
  return scored
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.g);
}
