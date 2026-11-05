# 한 HanQadam — TOPIK mock test va koreys tili 0 dan

Koreys tilini o‘rganayotgan, TOPIK imtihoniga tayyorlanayotgan va Koreyada yashayotgan o‘zbek tilli foydalanuvchilar uchun bepul veb-ilova. Telefon va kompyuterda ishlaydi, uni telefonga ilova sifatida o‘rnatish ham mumkin.

## Imkoniyatlar

| Bo‘lim | Nima qiladi |
|---|---|
| **📝 TOPIK I / TOPIK II mock test** | Rasmiy formatda: savollar tartibi, yo‘riqnomalar, `<보기>`, vaqt (40/60, 60/50/70 daqiqa), ball va darajalar (1급–6급). Imtihon va mashq rejimi, OMR javob varaqasi, progressni saqlash va davom ettirish |
| **🎧 Tinglash** | Audio Gemini TTS orqali (erkak va ayol ovozi). TOPIK I’da har bir audio 2 marta, TOPIK II’da 1–20 savol 1 marta, 21–50 savol 2 marta tinglanadi. API kalit bo‘lmasa, brauzerning o‘z ovozi ishlatiladi |
| **✍️ Yozish (쓰기)** | 51–54 topshiriqlar vaqt bilan bajariladi. Javobni daftarga yozib, rasmini yuklaysiz (vaqt tugagach rasm uchun yana 3 daqiqa beriladi) yoki 원고지 ko‘rinishida shu yerda yozasiz. Gemini rasmiy mezonlar bo‘yicha baholaydi: ball, xatolar, tuzatishlar va namunaviy javob |
| **✨ AI variantlar** | Gemini rasmiy format bo‘yicha cheksiz yangi test variantlarini tuzadi |
| **🧠 AI tushuntirish** | Har bir savolga o‘zbek tilida tarjima, nega to‘g‘ri, kerakli so‘zlar va grammatika |
| **🗣️ Gaplashish** | 11 ta hayotiy vaziyat: restoran, kasalxona, bank, migratsiya xizmati, zavod, uy ijarasi, ish suhbati, TOPIK Speaking va boshqalar. Nutq **Gemini 3.5 Transcribe** orqali matnga aylanadi, AI xatolarni tuzatadi va talaffuz bo‘yicha maslahat beradi |
| **🌱 0 dan o‘rganish** | Hangul (40 harf ovozi bilan), bo‘g‘in yasash, 받침, viktorina, 12 ta hayotiy dars va mini testlar |
| **🃏 So‘zlar** | ~2 000 so‘z: 80 ta mavzuli + 국립국어원 darajali lug‘ati (TOPIK I — A, TOPIK II — B, chastota tartibida, o‘zbekcha tarjima), qidiruv, Leitner usulida takrorlash |
| **📐 Grammatika** | 1급–6급 dagi 100+ qolip, o‘zbekcha izoh, misol va ovoz bilan |
| **🗂️ Rasmiy o‘tgan testlar** | topik.go.kr dagi 12 ta ochiq sessiyaga (35–102) havolalar va har bir savol raqami bo‘yicha savol turlari xaritasi |
| **🤖 AI Ustoz** | Grammatika, TOPIK strategiyasi va gaplarni tekshirish bo‘yicha chat. Rasmiy TOPIK faktlari (2026 jadvali, tuzilma, baholash) va savolga mos grammatika/so‘zlar bazadan avtomatik qo‘shiladi |
| **🇰🇷 Koreyada hayot** | Favqulodda raqamlar (112, 119, 1345, 1350, 1330), foydali ilovalar, birinchi qadamlar, ovozli iboralar |
| **📈 Natijalarim** | Natijalar tarixi, ball grafigi, imtihongacha qolgan kunlar, kunlik seriya (streak) |

## Texnologiyalar

- **Next.js 16** (App Router, TypeScript), alohida CSS dizayn tizimi (binafsha–ko‘k gradient)
- **Gemini Interactions API** (REST, faqat serverda ishlaydi):
  - `gemini-3.8-flash` — tushuntirish, yozma ishni baholash, suhbat, test yaratish, AI Ustoz
  - `gemini-3.5-transcribe` — nutqni matnga aylantirish
  - `gemini-3.8-flash-tts` — tinglash audiosi (ikki kishilik dialog)
- Ma’lumotlar foydalanuvchi qurilmasida (`localStorage`) saqlanadi, ro‘yxatdan o‘tish shart emas

## Ishga tushirish

```bash
npm install
cp .env.example .env.local   # GEMINI_API_KEY ni yozing
npm run dev                  # http://localhost:3000
```

API kalitni [Google AI Studio](https://aistudio.google.com/apikey) dan olasiz. Kalitsiz ham testlar, Hangul, darslar va so‘zlar ishlaydi, ovozni esa brauzer o‘zi o‘qiydi. AI funksiyalar kalit qo‘shilgandan keyin yoqiladi.

## Internetga joylash (Vercel)

1. [vercel.com/new](https://vercel.com/new) sahifasida ushbu GitHub repozitoriyani import qiling.
2. **Environment Variables** bo‘limiga `GEMINI_API_KEY` ni qo‘shing.
3. **Deploy** tugmasini bosing.

Kalit faqat serverda saqlanadi va brauzerga yuborilmaydi. AI yo‘llarida IP bo‘yicha oddiy so‘rov cheklovi (rate limit) bor.

## Tuzilma

```
src/
  app/            sahifalar va API (api/tts, api/explain, api/writing, api/speak, api/tutor, api/generate)
  components/     AppShell, ChartView, exam/ (ExamRunner, GroupView, Writing, Results, Explain)
  data/           topik1.ts, topik1v2.ts, topik2.ts, hangul.ts, lessons.ts, words.ts, guide.ts, scenarios.ts,
                  vocabA.ts / vocabB.ts / vocab.ts (국립국어원 lug‘ati), grammar.ts, pastExams.ts
  lib/            gemini.ts (server), knowledge.ts (AI Ustoz bilim bazasi), romanize.ts, audio.ts, exam.ts, store.ts
```

## Eslatma

HanQadam — mustaqil o‘quv loyiha, rasmiy TOPIK (NIIED) sayti emas. Barcha test savollari shu loyiha uchun yozilgan original mashq materiallari. Natijalar taxminiy.
