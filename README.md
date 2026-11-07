# 한 HanUstoz — TOPIK mock test va koreys tili 0 dan

Koreys tilini o‘rganayotgan, TOPIK imtihoniga tayyorlanayotgan va Koreyada yashayotgan o‘zbek tilli foydalanuvchilar uchun veb-ilova. Gmail orqali kiriladi: **birinchi 7 kun barcha AI imkoniyatlari bepul**, keyin — oylik obuna (O‘zbekiston va Koreya uchun alohida narx). Telefon va kompyuterda ishlaydi, uni telefonga ilova sifatida o‘rnatish ham mumkin.

## Imkoniyatlar

| Bo‘lim | Nima qiladi |
|---|---|
| **📝 TOPIK I / TOPIK II mock test** | Rasmiy formatda: savollar tartibi, yo‘riqnomalar, `<보기>`, vaqt (40/60, 60/50/70 daqiqa), ball va darajalar (1급–6급). Har birida 2 ta tayyor original variant (internet AI’siz ishlaydi). Imtihon va mashq rejimi, OMR javob varaqasi, progressni saqlash va davom ettirish |
| **🏭 EPS-TOPIK mock test** | Koreyaga E-9 viza bilan ishga boruvchilar uchun: o‘qish 1–20 (25 daqiqa) va tinglash 21–40 (25 daqiqa), har savol 2.5 ball, jami 100. Rasm va xavfsizlik belgisi savollari, yotoqxona e’loni, maosh varaqasi, ish joyidagi dialoglar. Natijada sohalar bo‘yicha minimal ball ko‘rsatiladi: ishlab chiqarish 60+, boshqa sohalar 45+. AI variantlar ham ishlaydi |
| **🧠 Ustoz bilim bazasi** | `/learn/grammar`: 100+ grammatika kartochkasi (1–6급, o‘zbekcha izoh, o‘zbek tili bilan solishtirish, ovozli misollar), o‘zbeklarga xos 25+ xato (talaffuz, 에/에서, 당신, 반말, imlo), 0 → 6급 va EPS daraja rejasi, 쓰기 qo‘llanmasi, EPS: xavfsizlik belgilari, asboblar, mehnat huquqlari. AI Ustoz, Ovozli ustoz, AI tushuntirish va yozma ish tekshiruvi savolga mos kartochkalarni shu bazadan oladi |
| **🖼️ Rasmli savollar** | TOPIK I 15–16, TOPIK II 1–2 (har ikkala variantda) va EPS-TOPIK rasm savollari uchun rasmlarni Gemini rasm modeli rasmiy imtihon uslubida (oq-qora chizma) chizadi. Har bir rasm bir marta yaratilib, serverda saqlanadi (`/app/data/images`) va keyin hammaga darhol ko‘rsatiladi. Rasm tayyor bo‘lguncha emoji sahna ko‘rinadi. AI variantlarda ham rasm tavsiflari yaratiladi. EPS xavfsizlik belgilari 금지/경고/지시/안내 shaklida chiziladi. `/admin` → «Rasmlarni tayyorlash» tugmasi barcha rasm va ikonkalarni oldindan yaratadi |
| **🎨 Sayt ikonkalari** | Bosh sahifa, testlar, darslar, suhbat vaziyatlari, so‘z to‘plamlari va «Koreyada hayot» bo‘limidagi 55 ta ikonkani Gemini bir xil uslubda chizadi (`src/data/visuals.ts`). Rasm tayyor bo‘lguncha emoji ko‘rinadi. Server rasmlarni telefon uchun 128–768 px gacha o‘zi kichraytiradi va eng yengil formatda beradi — JPEG yoki PNG, qaysi biri kichik bo‘lsa (qo‘shimcha kutubxonasiz, `src/lib/server/thumb.ts`, `jpeg.ts`, `png.ts`; JPEG asl rasmlar uchun serverda `sharp` bo‘lsa — u bilan): ~1 MB → bir necha KB. Sahifa yuklangach, bo‘sh vaqtda menyu («Barcha bo‘limlar») va boshqa bo‘limlar ikonkalari, testda esa keyingi savollar rasmlari oldindan yuklanadi — ochilganda darhol ko‘rinadi |
| **📲 PWA (ilova)** | Telefonga o‘rnatiladi: Android’da «Ilovani o‘rnatish» tugmasi, iPhone’da Safari → «Ekranga qo‘shish» ko‘rsatmasi, Telegram/Instagram ichida bo‘lsa — brauzerda ochish maslahati. Ilova ikonkasi — vektor logodan (180/192/512 px, maskable). Service worker (`public/sw.js`): sahifalar tez ochiladi, oldin ochilganlari internetsiz ham ishlaydi, internet bo‘lmasa «Internet yo‘q» sahifasi; Gemini rasmlari alohida keshda turadi va yangi versiya chiqqanda ham qayta yuklanmaydi. Ikonkani bosib turganda tezkor menyu: Mock test, AI Ustoz, Erkin suhbat, So‘zlar |
| **🎨 Logo** | Belgi: tanlangan «H» — ikki ustun diagonal to‘lqinli lenta bilan bog‘langan, yon bo‘laklar lentaga parallel kesilgan (rasmdan o‘lchab, burchak nuqtalari va radiuslar bilan geometrik qayta chizilgan); fon — to‘q binafsha #5004DC, burchaklarda och binafsha nur. Yozuv — Inter Display Bold (vektor yo‘llarga aylantirilgan, shrift kerak emas). Manba: `scripts/brand.mjs` (+ `scripts/otf.mjs` — shrift o‘quvchi) → `public/brand/` (SVG + PNG: ikonkalar, fonsiz belgi, gorizontal, shiorli, vertikal, oq variantlar) va favicon `src/app/icon.svg`. Reklama uchun fayllar va ranglar — `/brand` sahifasida. Qayta eksport: `node scripts/brand.mjs --png` (Playwright va Inter shrifti kerak); logo o‘zgarsa `BRAND_VERSION` ni oshiring |
| **🎧 Tinglash** | Audio Gemini TTS orqali (erkak va ayol ovozi). TOPIK I’da har bir audio 2 marta, TOPIK II’da 1–20 savol 1 marta, 21–50 savol 2 marta tinglanadi. API kalit bo‘lmasa, brauzerning o‘z ovozi ishlatiladi |
| **✍️ Yozish (쓰기)** | 51–54 topshiriqlar vaqt bilan bajariladi. Javobni daftarga yozib, rasmini yuklaysiz (vaqt tugagach rasm uchun yana 3 daqiqa beriladi) yoki 원고지 ko‘rinishida shu yerda yozasiz. Gemini rasmiy mezonlar bo‘yicha baholaydi: ball, xatolar, tuzatishlar va namunaviy javob |
| **✨ AI variantlar** | Gemini rasmiy format bo‘yicha cheksiz yangi test variantlarini tuzadi |
| **🧠 AI tushuntirish** | Har bir savolga o‘zbek tilida tarjima, nega to‘g‘ri, kerakli so‘zlar va grammatika |
| **🗣️ Gaplashish** | 11 ta hayotiy vaziyat: restoran, kasalxona, bank, migratsiya xizmati, zavod, uy ijarasi, ish suhbati, TOPIK Speaking va boshqalar. Nutq **Gemini 3.5 Transcribe** orqali matnga aylanadi, AI xatolarni tuzatadi va talaffuz bo‘yicha maslahat beradi |
| **💬 Erkin suhbat** | `/speak/free`: koreys do‘st (민준 — yigit yoki 지수 — qiz) bilan tez-tez, ovozli koreyscha suhbat — 말하기 ni oshirish uchun. Mavzu (erkin, bugungi kun, ovqat, qiziqishlar, Koreyada hayot, ish, sayohat, O‘zbekiston), daraja va uslub (존댓말 / 반말) tanlanadi. Bilmagan so‘zni o‘zbekcha aytsangiz yoki «tushunmadim» desangiz — do‘st qisqa o‘zbekcha tushuntiradi, kerakli koreyscha gapni beradi va yana koreyscha davom etadi. Xatolar suhbatni to‘xtatmasdan, xabar ostida tuzatiladi; 🐢 sekinroq qaytarish, 💡 javob g‘oyalari. Tezlik uchun: bitta Gemini so‘rovi (audio → javob) oqim bilan keladi — gapingiz va do‘st javobi tayyor bo‘lishi bilan ko‘rinadi, javob ovozini server shu zahoti o‘zi tayyorlab, o‘sha oqimda yuboradi (brauzer `/api/tts` ga alohida so‘ramaydi); tarjima, lotincha yozuv, tuzatish va maslahatlar keyin qo‘shiladi; kirish tekshiruvi Gemini bilan parallel; javobning birinchi gapi alohida ovozlanadi (tezroq boshlanadi); birinchi salom AI’siz, darhol (ovozi tanlash ekranidayoq tayyorlanadi, server oldindan uyg‘otiladi) — bo‘linmagan bitta bo‘lak bo‘lib, «Suhbatni boshlash» bosilishining o‘zida o‘ynaydi (iPhone ham to‘xtatmaydi), salom paytida mikrofon ochilmaydi; mikrofonga ruxsat do‘st salom bergach bir marta so‘raladi va mikrofon o‘zi yoqiladi (iPhone’da keyin mikrofon o‘zi faqat ruxsat qayta so‘ralmaydigan paytda yoqiladi, aks holda «Navbat sizda» — bosilganda so‘ralmaydi); telefon javob ovozini o‘ynatmasa yoki ovoz qotib qolsa — suhbat to‘xtab qolmaydi: navbat baribir sizga o‘tadi (javob matni ekranda); ovoz faqat navbatingizda — do‘st javobini oxirigacha o‘qib bo‘lgach — yoziladi; mikrofon suhbat davomida bir marta ochiladi va ochiq turadi — xuddi qo‘ng‘iroqdagidek (har navbatda yopib-ochish iPhone’da javob ovozini ham, mikrofonni qayta ochishni ham buzardi), «To‘xtatish», chiqish yoki 3 daqiqa ishlatilmaslikda yopiladi; mikrofon ochiq paytda javob ovozi Web Audio (umumiy AudioContext) orqali o‘ynaydi — iPhone uni tugma bosilmasa ham o‘ynatadi (ishlamasa — odatdagi `<audio>`); exo bostirish o‘chiq (iPhone «qo‘ng‘iroq» ishlovi ovozni pasaytirmaydi, javob o‘qilayotganda yozuv bo‘lmaydi), jimlik chegarasi shovqin darajasiga moslashadi; `navigator.audioSession` o‘zgartirilmaydi; mikrofon ochilmasa xabar oxirida xato nomi ko‘rsatiladi; quloqchin uzilsa yoki ulansa (devicechange, mikrofon o‘chib qolsa) mikrofon o‘zi qayta ochiladi — telefon ovozni yangi yo‘lga o‘tkazadi: quloqchin bo‘lmasa baland karnayga (quloqqa tutiladigan kichik dinamikka emas); tezlik uchun javobning birinchi gapi ovozi javob yozilib bo‘lishini kutmasdan serverda tayyorlana boshlaydi, ovoz limit tekshiruvi bilan parallel tayyorlanadi, brauzer ovozni Cache Storage’ga yozishni kutmaydi va Web Audio uchun oldindan ochib qo‘yadi; mikrofon ovoz bermay qolsa (to‘lqin yo‘q) — o‘zi qaytadan ochiladi; jimlikda yozuv ~1 soniyada o‘zi to‘xtaydi, uzluksiz rejimda mikrofon o‘zi yoqiladi. Suhbat uchun alohida model: `GEMINI_TALK_MODEL` |
| **🤖 AI Ustoz (bitta joyda)** | Bosh sahifa va menyuda bitta «AI Ustoz» bandi → `/speak`: uchta aniq tanlov — 💬 koreyscha gaplashish (erkin suhbat), 🎙️ ovozli ustoz, ✍️ yozma savol (AI Ustoz chati, `/tutor`) va vaziyatli suhbatlar. Har bir ichki sahifada orqaga tugmasi bor |
| **🎙️ Ovozli ustoz** | `/speak/ustoz`: javob oqim bilan keladi va ovozi serverda shu zahoti tayyorlanadi (erkin suhbatdagi kabi); ustoz javobini oxirigacha o‘qib bergachgina yozuv boshlanadi; mikrofon dars davomida bir marta ochiladi va ochiq turadi, ustoz ovozi Web Audio orqali o‘ynaydi (erkin suhbatdagi kabi); ovoz chiqmasa ham navbat o‘quvchiga o‘tadi; mikrofon ovoz bermay qolsa — o‘zi qaytadan ochiladi; o‘zbekcha gapirib so‘raysiz (“Rahmat koreyschada qanday?”, “Menga dars o‘tib ber”), ustoz o‘zbekcha tushuntiradi va koreyscha so‘zlarni Gemini ovozi bilan aytadi, bosqichma-bosqich dars o‘tadi, takrorlaganingizda talaffuzni tekshiradi. Jimlikda yozuv o‘zi to‘xtaydi, “Uzluksiz suhbat” rejimida mikrofon o‘zi qayta yoqiladi. Mikrofon faqat HTTPS’da ishlaydi |
| **🌱 0 dan o‘rganish** | Hangul (40 harf ovozi bilan), bo‘g‘in yasash, 받침, viktorina, 12 ta hayotiy dars va mini testlar |
| **🃏 So‘zlar** | ~2 000 so‘z: mavzuli to‘plamlar (TOPIK I, TOPIK II, EPS: asboblar, xavfsizlik, yotoqxona va hayot) + 국립국어원 darajali lug‘ati (TOPIK I — A, TOPIK II — B, chastota tartibida, o‘zbekcha tarjima), qidiruv, Leitner usulida takrorlash |
| **🗂️ Rasmiy o‘tgan testlar** | topik.go.kr dagi 12 ta ochiq sessiyaga (35–102) havolalar va har bir savol raqami bo‘yicha savol turlari xaritasi |
| **🤖 AI Ustoz** | Grammatika, TOPIK / EPS-TOPIK strategiyasi va gaplarni tekshirish bo‘yicha chat (javob oqim bilan chiqadi). Professional o‘qitish uslubi, bilim bazasidan mos kartochkalar, rasmiy TOPIK faktlari (2026 jadvali, tuzilma, baholash), lug‘atdan mos so‘zlar va o‘quvchining maqsadi hamda oxirgi natijalarini hisobga oladi |
| **🇰🇷 Koreyada hayot** | Favqulodda raqamlar (112, 119, 1345, 1350, 1330), foydali ilovalar, birinchi qadamlar, ovozli iboralar |
| **📈 Natijalarim** | Natijalar tarixi, ball grafigi, imtihongacha qolgan kunlar, kunlik seriya (streak) |
| **🔐 Gmail orqali kirish** | Google OAuth (PKCE), parolsiz. Birinchi kirishda 7 kunlik bepul sinov avtomatik boshlanadi, karta so‘ralmaydi |
| **⭐ Obuna (to‘lov)** | `/pay`: hudud (🇺🇿 O‘zbekiston — so‘m, 🇰🇷 Koreya — von, biroz qimmatroq) va tarif (1 / 3 / 6 oy) tanlanadi. Ilk 100 obunachiga birinchi to‘lovida chegirma. Har bir so‘rovga shaxsiy kod beriladi: O‘zbekistonda summaning oxirgi 3 raqami (49 137 so‘m), Koreyada 입금자명 (HU137) — tushum bank ilovasida darhol topiladi. Foydalanuvchi kartaga (Humo/Uzcard) yoki koreys hisobiga o‘tkazib, **chek rasmini yuklaydi** va «To‘ladim» bosadi → admin Telegram’da xabar oladi (ixtiyoriy) → `/admin` da chekni ko‘rib **tasdiqlaydi** → obuna muddati uzayadi (sinov yoki oldingi obuna tugagandan keyin qo‘shiladi). Avtomatik yechib olinmaydi. Narxlar — `src/lib/plans.ts` |
| **☁️ Bulutda saqlash** | Kirgan foydalanuvchining testlar tarixi, so‘zlari, profili va streak’i barcha qurilmalarda sinxron |
| **🛠️ Admin panel** | `/admin`: 💳 to‘lovlar — tekshiriladigan so‘rovlar chek rasmi bilan, bir bosishda tasdiqlash / rad etish, qo‘lda obuna berish (sovg‘a), tushum va chegirma hisoblagichi, **PDF hisobot** (bu oy / o‘tgan oy / istalgan davr: tushum UZS va KRW, tariflar, har bir to‘lov); foydalanuvchilar soni, faollik statistikasi (bugun / 7 / 30 kun: yakunlangan mock testlar, har bir AI funksiya, sinovi tugab AI so‘raganlar), so‘nggi ro‘yxatdan o‘tganlar, email bo‘yicha qidirish |

### Har doim bepul, 7 kunlik sinov va obuna

| Har doim bepul (kirmasdan ham) | AI imkoniyatlari (Gmail orqali kirib, 7 kun bepul, keyin obuna) |
|---|---|
| Hangul, 12 ta dars, so‘z kartochkalari, Koreyada hayot | AI tushuntirish, yozma ishni AI baholash, Gemini bilan suhbat |
| TOPIK I / II va EPS-TOPIK mock testlar (brauzer ovozi bilan) | AI Ustoz, cheksiz AI variantlar, tabiiy Gemini ovozi |

AI yo‘llari (`/api/explain`, `writing`, `speak`, `talk`, `voice`, `tutor`, `generate`, `tts`, AI variant rasmlari uchun `image`) serverda tekshiriladi: kirilmagan bo‘lsa `401`, bepul sinov tugagan bo‘lsa `402`. Sinov muddati — `NEXT_PUBLIC_TRIAL_DAYS` (standart 7); obuna — admin tasdiqlagan to‘lov bo‘yicha. Har bir foydalanuvchi uchun kunlik adolatli limit bor (`src/lib/server/guard.ts`: masalan kuniga 25 ta yozma ish tekshiruvi, erkin ovozli suhbat ~20 daqiqa — 60 xabar) — bu AI xarajatini nazoratda ushlaydi.

## Texnologiyalar

- **Next.js 16** (App Router, TypeScript), alohida CSS dizayn tizimi (binafsha–ko‘k gradient)
- **Gemini Interactions API** (REST, faqat serverda ishlaydi):
  - `gemini-3.8-flash` — tushuntirish, yozma ishni baholash, suhbat, test yaratish, AI Ustoz
  - `gemini-3.5-transcribe` — nutqni matnga aylantirish
  - `gemini-3.8-flash-tts` — tinglash audiosi (ikki kishilik dialog)
  - rasm modeli (`GEMINI_IMAGE_MODEL` yoki avtomatik tanlanadigan eng yangi `*-flash-image`) — test rasmlari, `generateContent` orqali
- Google OAuth 2.0 / OpenID Connect (PKCE) va HMAC-imzolangan sessiya cookie — qo‘shimcha kutubxonasiz
- Foydalanuvchilar va sinov muddati: **Upstash Redis** (REST, kutubxonasiz); lokalda `.data/db.json`
- Progress avval qurilmada (`localStorage`), kirgandan keyin bulut bilan sinxronlanadi

## Ishga tushirish

```bash
npm install
cp .env.example .env.local   # GEMINI_API_KEY ni yozing
npm run dev                  # http://localhost:3000
```

API kalitni [Google AI Studio](https://aistudio.google.com/apikey) dan olasiz. Kalitsiz ham testlar, Hangul, darslar va so‘zlar ishlaydi, ovozni esa brauzer o‘zi o‘qiydi. AI funksiyalar kalit qo‘shilgandan keyin yoqiladi.

`GOOGLE_CLIENT_ID` bo‘sh bo‘lsa, login va sinov/obuna cheklovi o‘chadi — ilova eski “hammaga ochiq” rejimda ishlaydi (lokal ishlab chiqish uchun qulay). Lokalda Redis shart emas: ma’lumotlar `.data/db.json` ga yoziladi.

```bash
npm test   # server mantiqi testlari: sessiya, bepul sinov, login oqimi (Node 22.18+)
```

### Gmail orqali kirishni sozlash

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → **Create credentials → OAuth client ID → Web application**.
2. **Authorized redirect URIs**: `https://<sayt>/api/auth/callback` (va lokal uchun `http://localhost:3000/api/auth/callback`).
3. **OAuth consent screen**’da ilova nomi va logotipni kiriting, keyin **Publish app** (aks holda faqat test foydalanuvchilari kira oladi).
4. `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_SECRET` (`openssl rand -base64 32`), `APP_URL` va `ADMIN_EMAILS` ni yozing.

Sinov muddati: `NEXT_PUBLIC_TRIAL_DAYS` (standart 7, `src/lib/access.ts`). O‘zgartirilsa faqat yangi ro‘yxatdan o‘tganlarga ta’sir qiladi.

### Obuna to‘lovlarini sozlash

Dokploy → Environment (yoki `.env.local`) ga qo‘shing:

| O‘zgaruvchi | Nima |
|---|---|
| `PAY_UZ_CARD`, `PAY_UZ_NAME` | O‘zbekistondagilar uchun karta (Humo/Uzcard) va egasining ismi |
| `PAY_KR_ACCOUNT`, `PAY_KR_NAME` | Koreyadagilar uchun bank va hisob raqami (masalan `KB국민 123456-01-123456`), 예금주 |
| `PAY_CONTACT` | Savollar uchun Telegram, masalan `@hanustoz_admin` |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Ixtiyoriy: har bir «To‘ladim» haqida Telegram xabari (@BotFather’dan bot oching, unga /start yozing, chat ID’ni @userinfobot dan oling) |
| `RECEIPT_DIR` | Ixtiyoriy: chek rasmlari papkasi (standart `/app/data/receipts` — Volume ichida) |

Karta sozlanmagan hudud sahifada «Tez orada» bo‘lib turadi. Narx va chegirmani `src/lib/plans.ts` da o‘zgartirasiz.

## Internetga joylash (Vercel)

1. [vercel.com/new](https://vercel.com/new) sahifasida ushbu GitHub repozitoriyani import qiling.
2. **Storage → Marketplace → Upstash Redis** ni ulang (`KV_REST_API_URL` / `KV_REST_API_TOKEN` avtomatik qo‘shiladi).
3. **Environment Variables** bo‘limiga `.env.example` dagi qiymatlarni qo‘shing: `GEMINI_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_SECRET`, `APP_URL`, `ADMIN_EMAILS`.
4. **Deploy** tugmasini bosing.

Kalitlar faqat serverda saqlanadi va brauzerga yuborilmaydi. AI yo‘llarida IP bo‘yicha so‘rov cheklovi va har bir foydalanuvchi uchun kunlik limit bor.

## Internetga joylash (VPS + Dokploy)

Loyihada tayyor `Dockerfile` bor (Next.js `standalone` rejimi, Node 22).

1. Dokploy → **Projects → Create Project**, keyin **Create Service → Application**.
2. **Provider → Git**: `https://github.com/jtoxtasinov0-sys/TOPIK-test.git`, branch `main`.
3. **Build Type → Dockerfile** (Docker File: `Dockerfile`).
4. **Environment**: `GEMINI_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_SECRET`, `APP_URL`, `ADMIN_EMAILS`.
5. **Advanced → Volumes → Volume Mount**: Mount Path `/app/data`. Foydalanuvchilar bazasi (`/app/data/db.json`) shu yerda saqlanadi va qayta deploy’da o‘chmaydi. Upstash Redis ulansa (`KV_REST_API_URL` / `KV_REST_API_TOKEN`), fayl o‘rniga Redis ishlatiladi.
6. **Domains**: domen, Container Port `3000`, HTTPS → Let’s Encrypt. Domenning DNS `A` yozuvi VPS IP manziliga qaratilgan bo‘lishi kerak.
7. **Deploy**.

## Tuzilma

```
src/
  app/            sahifalar (login, account, admin, ...) va API:
                  api/auth/{google,callback,logout}, api/me, api/sync, api/admin, api/usage,
                  api/{tts,explain,writing,speak,talk,voice,tutor,generate}
  components/     AppShell, ChartView, exam/ (ExamRunner, GroupView, Writing, Results, Explain),
                  account/ (LoginView, AccountView, AdminView)
  data/           tests.ts (barcha tayyor variantlar ro‘yxati), topik1.ts, topik1v2.ts, topik2.ts, topik2v2.ts, eps.ts, hangul.ts, lessons.ts, words.ts, guide.ts, scenarios.ts, talk.ts (erkin suhbat),
                  vocabA.ts / vocabB.ts / vocab.ts (국립국어원 lug‘ati), pastExams.ts (rasmiy o‘tgan testlar)
  data/knowledge/ ustoz bilim bazasi: grammar.ts, mistakes.ts, curriculum.ts, writing.ts, work.ts (EPS), sources.ts
  lib/            gemini.ts (server), audio.ts, mic.ts (mikrofon, jimlikni aniqlash), exam.ts, store.ts, access.ts (sinov muddati), knowledge.ts (bazadan qidirish, TOPIK faktlari), romanize.ts,
                  auth.tsx (AuthProvider, paywall), sync.ts (bulut sinxron)
  lib/server/     store.ts (Redis/fayl), session.ts, google.ts, users.ts, guard.ts, usage.ts (statistika)
tests/            npm test — Node’ning o‘zida, qo‘shimcha kutubxonasiz
```

## Eslatma

HanUstoz — mustaqil o‘quv loyiha, rasmiy TOPIK (NIIED) yoki EPS-TOPIK (HRD Korea) sayti emas. Barcha test savollari va bilim bazasidagi tushuntirishlar shu loyiha uchun yozilgan original materiallar; kitoblardan matn ko‘chirilmagan. Tayangan ochiq manbalar ro‘yxati — `src/data/knowledge/sources.ts` va `/learn/grammar` sahifasida. Natijalar taxminiy.

### Bilim bazasini kengaytirish

Yangi grammatika kartochkasi qo‘shish uchun `src/data/knowledge/grammar.ts` ga `g(...)` qatorini yozing: `keys` — matnda qidiriladigan koreyscha bo‘laklar (masalan `"려고 으려고"`), `tags` — o‘zbekcha qidiruv so‘zlari. AI yo‘llari mos kartochkalarni avtomatik oladi; `npm test` id takrorlanmasligi va tuzilmani tekshiradi.
