# 한 HanUstoz — TOPIK mock test va koreys tili 0 dan

Koreys tilini o‘rganayotgan, TOPIK imtihoniga tayyorlanayotgan va Koreyada yashayotgan o‘zbek va rus tilli foydalanuvchilar uchun veb-ilova. Gmail orqali kiriladi: **birinchi 30 kun barcha AI imkoniyatlari bepul**. Telefon va kompyuterda ishlaydi, uni telefonga ilova sifatida o‘rnatish ham mumkin.

> Веб-приложение для подготовки к TOPIK и изучения корейского с нуля. Вход через Gmail, 30 дней все AI-функции бесплатно. Интерфейс на узбекском и русском.

## Imkoniyatlar

| Bo‘lim | Nima qiladi |
|---|---|
| **📝 TOPIK I / TOPIK II mock test** | Rasmiy formatda: savollar tartibi, yo‘riqnomalar, `<보기>`, vaqt (40/60, 60/50/70 daqiqa), ball va darajalar (1급–6급). Imtihon va mashq rejimi, OMR javob varaqasi, progressni saqlash va davom ettirish |
| **🎧 Tinglash** | Audio Gemini TTS orqali (erkak va ayol ovozi). TOPIK I’da har bir audio 2 marta, TOPIK II’da 1–20 savol 1 marta, 21–50 savol 2 marta tinglanadi. API kalit bo‘lmasa, brauzerning o‘z ovozi ishlatiladi |
| **✍️ Yozish (쓰기)** | 51–54 topshiriqlar vaqt bilan bajariladi. Javobni daftarga yozib, rasmini yuklaysiz (vaqt tugagach rasm uchun yana 3 daqiqa beriladi) yoki 원고지 ko‘rinishida shu yerda yozasiz. Gemini rasmiy mezonlar bo‘yicha baholaydi: ball, xatolar, tuzatishlar va namunaviy javob |
| **✨ AI variantlar** | Gemini rasmiy format bo‘yicha cheksiz yangi test variantlarini tuzadi |
| **🧠 AI tushuntirish** | Har bir savolga o‘zbek yoki rus tilida tarjima, nega to‘g‘ri, kerakli so‘zlar va grammatika |
| **🗣️ Gaplashish** | 11 ta hayotiy vaziyat: restoran, kasalxona, bank, migratsiya xizmati, zavod, uy ijarasi, ish suhbati, TOPIK Speaking va boshqalar. Nutq **Gemini 3.5 Transcribe** orqali matnga aylanadi, AI xatolarni tuzatadi va talaffuz bo‘yicha maslahat beradi |
| **🌱 0 dan o‘rganish** | Hangul (40 harf ovozi bilan), bo‘g‘in yasash, 받침, viktorina, 12 ta hayotiy dars va mini testlar |
| **🃏 So‘zlar** | 80 ta so‘z (TOPIK I, ish joyi/EPS, TOPIK II), Leitner usulida takrorlash |
| **🤖 AI Ustoz** | Grammatika, TOPIK strategiyasi va gaplarni tekshirish bo‘yicha chat (javob oqim bilan chiqadi) |
| **🇰🇷 Koreyada hayot** | Favqulodda raqamlar (112, 119, 1345, 1350, 1330), foydali ilovalar, birinchi qadamlar, ovozli iboralar |
| **📈 Natijalarim** | Natijalar tarixi, ball grafigi, imtihongacha qolgan kunlar, kunlik seriya (streak) |
| **🔐 Gmail orqali kirish** | Google OAuth (PKCE), parolsiz. Birinchi kirishda 30 kunlik bepul sinov avtomatik boshlanadi, karta so‘ralmaydi |
| **☁️ Bulutda saqlash** | Kirgan foydalanuvchining testlar tarixi, so‘zlari, profili va streak’i barcha qurilmalarda sinxron |
| **🛠️ Admin panel** | `/admin` (faqat ko‘rish): foydalanuvchilar soni, faollik statistikasi (bugun / 7 / 30 kun: yakunlangan mock testlar, har bir AI funksiya, sinovi tugab AI so‘raganlar), so‘nggi ro‘yxatdan o‘tganlar, email bo‘yicha qidirish |

### Har doim bepul va 30 kunlik sinov

| Har doim bepul (kirmasdan ham) | AI imkoniyatlari (Gmail orqali kirib, 30 kun bepul) |
|---|---|
| Hangul, 12 ta dars, so‘z kartochkalari, Koreyada hayot | AI tushuntirish, yozma ishni AI baholash, Gemini bilan suhbat |
| TOPIK I / II mock testlar (brauzer ovozi bilan) | AI Ustoz, cheksiz AI variantlar, tabiiy Gemini ovozi |

AI yo‘llari (`/api/explain`, `writing`, `speak`, `tutor`, `generate`, `tts`) serverda tekshiriladi: kirilmagan bo‘lsa `401`, bepul sinov tugagan bo‘lsa `402`. Sinov muddati — `NEXT_PUBLIC_TRIAL_DAYS` (standart 30). To‘lov tizimi keyinroq qo‘shiladi. Har bir foydalanuvchi uchun kunlik adolatli limit bor (`src/lib/server/guard.ts`, masalan kuniga 25 ta yozma ish tekshiruvi) — bu AI xarajatini nazoratda ushlaydi.

## Texnologiyalar

- **Next.js 16** (App Router, TypeScript), alohida CSS dizayn tizimi (binafsha–ko‘k gradient)
- **Gemini Interactions API** (REST, faqat serverda ishlaydi):
  - `gemini-3.8-flash` — tushuntirish, yozma ishni baholash, suhbat, test yaratish, AI Ustoz
  - `gemini-3.5-transcribe` — nutqni matnga aylantirish
  - `gemini-3.8-flash-tts` — tinglash audiosi (ikki kishilik dialog)
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

## Tuzilma

```
src/
  app/            sahifalar (login, account, admin, ...) va API:
                  api/auth/{google,callback,logout}, api/me, api/sync, api/admin, api/usage,
                  api/{tts,explain,writing,speak,tutor,generate}
  components/     AppShell, ChartView, exam/ (ExamRunner, GroupView, Writing, Results, Explain),
                  account/ (LoginView, AccountView, AdminView)
  data/           topik1.ts, topik2.ts, hangul.ts, lessons.ts, words.ts, guide.ts, scenarios.ts
  lib/            gemini.ts (server), audio.ts, exam.ts, i18n.tsx, store.ts, access.ts (sinov muddati),
                  auth.tsx (AuthProvider, paywall), sync.ts (bulut sinxron)
  lib/server/     store.ts (Redis/fayl), session.ts, google.ts, users.ts, guard.ts, usage.ts (statistika)
tests/            npm test — Node’ning o‘zida, qo‘shimcha kutubxonasiz
```

## Eslatma

HanUstoz — mustaqil o‘quv loyiha, rasmiy TOPIK (NIIED) sayti emas. Barcha test savollari shu loyiha uchun yozilgan original mashq materiallari. Natijalar taxminiy.
