# 한 HanUstoz — TOPIK mock test va koreys tili 0 dan

Koreys tilini o‘rganayotgan, TOPIK imtihoniga tayyorlanayotgan va Koreyada yashayotgan o‘zbek tilli foydalanuvchilar uchun veb-ilova. Gmail orqali kiriladi: **birinchi 30 kun barcha AI imkoniyatlari bepul**. Telefon va kompyuterda ishlaydi, uni telefonga ilova sifatida o‘rnatish ham mumkin.

## Imkoniyatlar

| Bo‘lim | Nima qiladi |
|---|---|
| **📝 TOPIK I / TOPIK II mock test** | Rasmiy formatda: savollar tartibi, yo‘riqnomalar, `<보기>`, vaqt (40/60, 60/50/70 daqiqa), ball va darajalar (1급–6급). Imtihon va mashq rejimi, OMR javob varaqasi, progressni saqlash va davom ettirish |
| **🏭 EPS-TOPIK mock test** | Koreyaga E-9 viza bilan ishga boruvchilar uchun: o‘qish 1–20 (25 daqiqa) va tinglash 21–40 (25 daqiqa), har savol 2.5 ball, jami 100. Rasm va xavfsizlik belgisi savollari, yotoqxona e’loni, maosh varaqasi, ish joyidagi dialoglar. Natijada sohalar bo‘yicha minimal ball ko‘rsatiladi: ishlab chiqarish 60+, boshqa sohalar 45+. AI variantlar ham ishlaydi |
| **🧠 Ustoz bilim bazasi** | `/learn/grammar`: 100+ grammatika kartochkasi (1–6급, o‘zbekcha izoh, o‘zbek tili bilan solishtirish, ovozli misollar), o‘zbeklarga xos 25+ xato (talaffuz, 에/에서, 당신, 반말, imlo), 0 → 6급 va EPS daraja rejasi, 쓰기 qo‘llanmasi, EPS: xavfsizlik belgilari, asboblar, mehnat huquqlari. AI Ustoz, Ovozli ustoz, AI tushuntirish va yozma ish tekshiruvi savolga mos kartochkalarni shu bazadan oladi |
| **🖼️ Rasmli savollar** | TOPIK I 15–16, TOPIK II 1–2 va EPS-TOPIK rasm savollari uchun rasmlarni Gemini rasm modeli rasmiy imtihon uslubida (oq-qora chizma) chizadi. Har bir rasm bir marta yaratilib, serverda saqlanadi (`/app/data/images`) va keyin hammaga darhol ko‘rsatiladi. Rasm tayyor bo‘lguncha emoji sahna ko‘rinadi. AI variantlarda ham rasm tavsiflari yaratiladi. EPS xavfsizlik belgilari 금지/경고/지시/안내 shaklida chiziladi. `/admin` → «Rasmlarni tayyorlash» tugmasi barcha rasm va ikonkalarni oldindan yaratadi |
| **🎨 Sayt ikonkalari** | Bosh sahifa, testlar, darslar, suhbat vaziyatlari, so‘z to‘plamlari va «Koreyada hayot» bo‘limidagi 55 ta ikonkani Gemini bir xil uslubda chizadi (`src/data/visuals.ts`). Rasm tayyor bo‘lguncha emoji ko‘rinadi. Server rasmlarni telefon uchun 128–768 px gacha o‘zi kichraytiradi va eng yengil formatda beradi — JPEG yoki PNG, qaysi biri kichik bo‘lsa (qo‘shimcha kutubxonasiz, `src/lib/server/thumb.ts`, `jpeg.ts`, `png.ts`; JPEG asl rasmlar uchun serverda `sharp` bo‘lsa — u bilan): ~1 MB → bir necha KB. Sahifa yuklangach, bo‘sh vaqtda menyu («Barcha bo‘limlar») va boshqa bo‘limlar ikonkalari, testda esa keyingi savollar rasmlari oldindan yuklanadi — ochilganda darhol ko‘rinadi |
| **📲 PWA (ilova)** | Telefonga o‘rnatiladi: Android’da «Ilovani o‘rnatish» tugmasi, iPhone’da Safari → «Ekranga qo‘shish» ko‘rsatmasi, Telegram/Instagram ichida bo‘lsa — brauzerda ochish maslahati. Ilova ikonkasi — vektor logodan (180/192/512 px, maskable). Service worker (`public/sw.js`): sahifalar tez ochiladi, oldin ochilganlari internetsiz ham ishlaydi, internet bo‘lmasa «Internet yo‘q» sahifasi; Gemini rasmlari alohida keshda turadi va yangi versiya chiqqanda ham qayta yuklanmaydi. Ikonkani bosib turganda tezkor menyu: Mock test, AI Ustoz, Ovozli ustoz, So‘zlar |
| **🎨 Logo** | Belgi: tanlangan «H» — ikki ustun diagonal to‘lqinli lenta bilan bog‘langan, yon bo‘laklar lentaga parallel kesilgan (rasmdan o‘lchab, burchak nuqtalari va radiuslar bilan geometrik qayta chizilgan); fon — to‘q binafsha #5004DC, burchaklarda och binafsha nur. Yozuv — Inter Display Bold (vektor yo‘llarga aylantirilgan, shrift kerak emas). Manba: `scripts/brand.mjs` (+ `scripts/otf.mjs` — shrift o‘quvchi) → `public/brand/` (SVG + PNG: ikonkalar, fonsiz belgi, gorizontal, shiorli, vertikal, oq variantlar) va favicon `src/app/icon.svg`. Reklama uchun fayllar va ranglar — `/brand` sahifasida. Qayta eksport: `node scripts/brand.mjs --png` (Playwright va Inter shrifti kerak); logo o‘zgarsa `BRAND_VERSION` ni oshiring |
| **🎧 Tinglash** | Audio Gemini TTS orqali (erkak va ayol ovozi). TOPIK I’da har bir audio 2 marta, TOPIK II’da 1–20 savol 1 marta, 21–50 savol 2 marta tinglanadi. API kalit bo‘lmasa, brauzerning o‘z ovozi ishlatiladi |
| **✍️ Yozish (쓰기)** | 51–54 topshiriqlar vaqt bilan bajariladi. Javobni daftarga yozib, rasmini yuklaysiz (vaqt tugagach rasm uchun yana 3 daqiqa beriladi) yoki 원고지 ko‘rinishida shu yerda yozasiz. Gemini rasmiy mezonlar bo‘yicha baholaydi: ball, xatolar, tuzatishlar va namunaviy javob |
| **✨ AI variantlar** | Gemini rasmiy format bo‘yicha cheksiz yangi test variantlarini tuzadi |
| **🧠 AI tushuntirish** | Har bir savolga o‘zbek tilida tarjima, nega to‘g‘ri, kerakli so‘zlar va grammatika |
| **🗣️ Gaplashish** | 11 ta hayotiy vaziyat: restoran, kasalxona, bank, migratsiya xizmati, zavod, uy ijarasi, ish suhbati, TOPIK Speaking va boshqalar. Nutq **Gemini 3.5 Transcribe** orqali matnga aylanadi, AI xatolarni tuzatadi va talaffuz bo‘yicha maslahat beradi |
| **💬 Erkin suhbat** | `/speak/free`: koreys do‘st (민준 — yigit yoki 지수 — qiz) bilan tez-tez, ovozli koreyscha suhbat — 말하기 ni oshirish uchun. Mavzu (erkin, bugungi kun, ovqat, qiziqishlar, Koreyada hayot, ish, sayohat, O‘zbekiston), daraja va uslub (존댓말 / 반말) tanlanadi. Bilmagan so‘zni o‘zbekcha aytsangiz yoki «tushunmadim» desangiz — do‘st qisqa o‘zbekcha tushuntiradi, kerakli koreyscha gapni beradi va yana koreyscha davom etadi. Xatolar suhbatni to‘xtatmasdan, xabar ostida tuzatiladi; 🐢 sekinroq qaytarish, 💡 javob g‘oyalari. Tezlik uchun: bitta Gemini so‘rovi (audio → javob), jimlikda yozuv o‘zi to‘xtaydi, uzluksiz rejimda mikrofon o‘zi yoqiladi, ovoz bo‘laklari parallel tayyorlanadi |
| **🎙️ Ovozli ustoz** | `/speak/ustoz`: o‘zbekcha gapirib so‘raysiz (“Rahmat koreyschada qanday?”, “Menga dars o‘tib ber”), ustoz o‘zbekcha tushuntiradi va koreyscha so‘zlarni Gemini ovozi bilan aytadi, bosqichma-bosqich dars o‘tadi, takrorlaganingizda talaffuzni tekshiradi. Jimlikda yozuv o‘zi to‘xtaydi, “Uzluksiz suhbat” rejimida mikrofon o‘zi qayta yoqiladi. Mikrofon faqat HTTPS’da ishlaydi |
| **🌱 0 dan o‘rganish** | Hangul (40 harf ovozi bilan), bo‘g‘in yasash, 받침, viktorina, 12 ta hayotiy dars va mini testlar |
| **🃏 So‘zlar** | 134 ta so‘z (TOPIK I, TOPIK II, EPS: asboblar, xavfsizlik, yotoqxona va hayot), Leitner usulida takrorlash |
| **🤖 AI Ustoz** | Grammatika, TOPIK / EPS-TOPIK strategiyasi va gaplarni tekshirish bo‘yicha chat (javob oqim bilan chiqadi). Professional o‘qitish uslubi, bilim bazasidan mos kartochkalar va o‘quvchining maqsadi hamda oxirgi natijalarini hisobga oladi |
| **🇰🇷 Koreyada hayot** | Favqulodda raqamlar (112, 119, 1345, 1350, 1330), foydali ilovalar, birinchi qadamlar, ovozli iboralar |
| **📈 Natijalarim** | Natijalar tarixi, ball grafigi, imtihongacha qolgan kunlar, kunlik seriya (streak) |
| **🔐 Gmail orqali kirish** | Google OAuth (PKCE), parolsiz. Birinchi kirishda 30 kunlik bepul sinov avtomatik boshlanadi, karta so‘ralmaydi |
| **☁️ Bulutda saqlash** | Kirgan foydalanuvchining testlar tarixi, so‘zlari, profili va streak’i barcha qurilmalarda sinxron |
| **🛠️ Admin panel** | `/admin` (faqat ko‘rish): foydalanuvchilar soni, faollik statistikasi (bugun / 7 / 30 kun: yakunlangan mock testlar, har bir AI funksiya, sinovi tugab AI so‘raganlar), so‘nggi ro‘yxatdan o‘tganlar, email bo‘yicha qidirish |

### Har doim bepul va 30 kunlik sinov

| Har doim bepul (kirmasdan ham) | AI imkoniyatlari (Gmail orqali kirib, 30 kun bepul) |
|---|---|
| Hangul, 12 ta dars, so‘z kartochkalari, Koreyada hayot | AI tushuntirish, yozma ishni AI baholash, Gemini bilan suhbat |
| TOPIK I / II va EPS-TOPIK mock testlar (brauzer ovozi bilan) | AI Ustoz, cheksiz AI variantlar, tabiiy Gemini ovozi |

AI yo‘llari (`/api/explain`, `writing`, `speak`, `talk`, `voice`, `tutor`, `generate`, `tts`, AI variant rasmlari uchun `image`) serverda tekshiriladi: kirilmagan bo‘lsa `401`, bepul sinov tugagan bo‘lsa `402`. Sinov muddati — `NEXT_PUBLIC_TRIAL_DAYS` (standart 30). To‘lov tizimi keyinroq qo‘shiladi. Har bir foydalanuvchi uchun kunlik adolatli limit bor (`src/lib/server/guard.ts`, masalan kuniga 25 ta yozma ish tekshiruvi) — bu AI xarajatini nazoratda ushlaydi.

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

`GOOGLE_CLIENT_ID` bo‘sh bo‘lsa, login va 30 kunlik cheklov o‘chadi — ilova eski “hammaga ochiq” rejimda ishlaydi (lokal ishlab chiqish uchun qulay). Lokalda Redis shart emas: ma’lumotlar `.data/db.json` ga yoziladi.

```bash
npm test   # server mantiqi testlari: sessiya, bepul sinov, login oqimi (Node 22.18+)
```

### Gmail orqali kirishni sozlash

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → **Create credentials → OAuth client ID → Web application**.
2. **Authorized redirect URIs**: `https://<sayt>/api/auth/callback` (va lokal uchun `http://localhost:3000/api/auth/callback`).
3. **OAuth consent screen**’da ilova nomi va logotipni kiriting, keyin **Publish app** (aks holda faqat test foydalanuvchilari kira oladi).
4. `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_SECRET` (`openssl rand -base64 32`), `APP_URL` va `ADMIN_EMAILS` ni yozing.

Sinov muddati: `NEXT_PUBLIC_TRIAL_DAYS` (standart 30, `src/lib/access.ts`). O‘zgartirilsa faqat yangi ro‘yxatdan o‘tganlarga ta’sir qiladi.

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
  data/           topik1.ts, topik2.ts, eps.ts, hangul.ts, lessons.ts, words.ts, guide.ts, scenarios.ts, talk.ts (erkin suhbat)
  data/knowledge/ ustoz bilim bazasi: grammar.ts, mistakes.ts, curriculum.ts, writing.ts, work.ts (EPS), sources.ts
  lib/            gemini.ts (server), audio.ts, mic.ts (mikrofon, jimlikni aniqlash), exam.ts, store.ts, access.ts (sinov muddati), knowledge.ts (bazadan qidirish),
                  auth.tsx (AuthProvider, paywall), sync.ts (bulut sinxron)
  lib/server/     store.ts (Redis/fayl), session.ts, google.ts, users.ts, guard.ts, usage.ts (statistika)
tests/            npm test — Node’ning o‘zida, qo‘shimcha kutubxonasiz
```

## Eslatma

HanUstoz — mustaqil o‘quv loyiha, rasmiy TOPIK (NIIED) yoki EPS-TOPIK (HRD Korea) sayti emas. Barcha test savollari va bilim bazasidagi tushuntirishlar shu loyiha uchun yozilgan original materiallar; kitoblardan matn ko‘chirilmagan. Tayangan ochiq manbalar ro‘yxati — `src/data/knowledge/sources.ts` va `/learn/grammar` sahifasida. Natijalar taxminiy.

### Bilim bazasini kengaytirish

Yangi grammatika kartochkasi qo‘shish uchun `src/data/knowledge/grammar.ts` ga `g(...)` qatorini yozing: `keys` — matnda qidiriladigan koreyscha bo‘laklar (masalan `"려고 으려고"`), `tags` — o‘zbekcha qidiruv so‘zlari. AI yo‘llari mos kartochkalarni avtomatik oladi; `npm test` id takrorlanmasligi va tuzilmani tekshiradi.
