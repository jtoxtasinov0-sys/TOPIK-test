import type { Bi } from "@/lib/i18n";

export const EMERGENCY: { num: string; emoji: string; title: Bi; desc: Bi }[] = [
  { num: "112", emoji: "🚓", title: { uz: "Politsiya", ru: "Полиция" }, desc: { uz: "Jinoyat, o‘g‘rilik, xavfli vaziyat", ru: "Преступление, кража, опасность" } },
  { num: "119", emoji: "🚑", title: { uz: "Tez yordam va o‘t o‘chirish", ru: "Скорая и пожарные" }, desc: { uz: "Yong‘in, og‘ir kasallik, baxtsiz hodisa", ru: "Пожар, тяжёлое состояние, ДТП" } },
  { num: "1345", emoji: "🛂", title: { uz: "Chet elliklar markazi", ru: "Центр для иностранцев" }, desc: { uz: "Viza, yashash muddati, ro‘yxatdan o‘tish — ko‘p tilli maslahat", ru: "Виза, срок пребывания, регистрация — консультации на многих языках" } },
  { num: "1350", emoji: "👷", title: { uz: "Mehnat vazirligi", ru: "Министерство труда" }, desc: { uz: "Maosh to‘lanmasa, mehnat huquqlari bo‘yicha", ru: "Невыплата зарплаты, трудовые права" } },
  { num: "1330", emoji: "🧳", title: { uz: "Sayyohlar uchun qo‘ng‘iroq markazi", ru: "Туристическая линия" }, desc: { uz: "Tarjima va ma’lumot, 24 soat", ru: "Перевод и информация, 24 часа" } },
];

export const APPS: { name: string; emoji: string; desc: Bi }[] = [
  { name: "Naver Map / KakaoMap", emoji: "🗺️", desc: { uz: "Yo‘l topish, avtobus va metro — Google Maps Koreyada yaxshi ishlamaydi", ru: "Маршруты, автобусы и метро — Google Maps в Корее работает слабо" } },
  { name: "Papago", emoji: "🔤", desc: { uz: "Koreyscha tarjimon (rasm va ovozdan ham)", ru: "Переводчик с корейского (в т.ч. по фото и голосу)" } },
  { name: "KakaoTalk", emoji: "💬", desc: { uz: "Koreyada asosiy messenjer — ish va do‘stlar uchun shart", ru: "Главный мессенджер Кореи — нужен для работы и друзей" } },
  { name: "Kakao T", emoji: "🚕", desc: { uz: "Taksi chaqirish", ru: "Вызов такси" } },
  { name: "Coupang / Baemin", emoji: "📦", desc: { uz: "Onlayn xarid va ovqat yetkazib berish", ru: "Онлайн-покупки и доставка еды" } },
  { name: "Hi Korea", emoji: "🛂", desc: { uz: "Migratsiya xizmatiga onlayn navbat va arizalar (hikorea.go.kr)", ru: "Онлайн-запись и заявления в миграционную службу (hikorea.go.kr)" } },
];

export const FIRST_STEPS: { emoji: string; title: Bi; text: Bi }[] = [
  {
    emoji: "🪪",
    title: { uz: "Chet ellik ID kartasi (외국인등록증)", ru: "ID-карта иностранца (외국인등록증)" },
    text: {
      uz: "90 kundan ortiq qoladiganlar kelganidan keyin 90 kun ichida migratsiya xizmatida ro‘yxatdan o‘tadi. Navbatni Hi Korea orqali oldindan oling.",
      ru: "Кто остаётся дольше 90 дней, регистрируется в миграционной службе в течение 90 дней после въезда. Запишитесь заранее через Hi Korea.",
    },
  },
  {
    emoji: "📱",
    title: { uz: "Telefon raqami", ru: "Номер телефона" },
    text: {
      uz: "Koreya raqami bank, ish va onlayn xizmatlar uchun kerak. Pasport bilan oldindan to‘lanadigan (선불) tarifdan boshlash mumkin.",
      ru: "Корейский номер нужен для банка, работы и онлайн-сервисов. Можно начать с предоплаченного тарифа (선불) по паспорту.",
    },
  },
  {
    emoji: "🏦",
    title: { uz: "Bank hisobi", ru: "Банковский счёт" },
    text: {
      uz: "Odatda ID karta, pasport va telefon raqami so‘raladi. Darsdagi «출입국 · 은행» iboralarini oldindan mashq qiling.",
      ru: "Обычно нужны ID-карта, паспорт и номер телефона. Заранее потренируйте фразы из урока «출입국 · 은행».",
    },
  },
  {
    emoji: "🏥",
    title: { uz: "Tibbiy sug‘urta", ru: "Медицинская страховка" },
    text: {
      uz: "Uzoq muddat yashaydigan chet elliklar odatda milliy sug‘urtaga (국민건강보험) qo‘shiladi. Shifokorga ID kartangizni olib boring.",
      ru: "Иностранцы, живущие долго, обычно подключаются к национальной страховке (국민건강보험). Берите ID-карту к врачу.",
    },
  },
  {
    emoji: "🗑️",
    title: { uz: "Chiqindilarni ajratish", ru: "Сортировка мусора" },
    text: {
      uz: "Oddiy chiqindi maxsus pullik paketga (종량제 봉투), ovqat qoldiqlari va qayta ishlanadiganlar alohida tashlanadi.",
      ru: "Обычный мусор — в специальные платные пакеты (종량제 봉투), пищевые отходы и вторсырьё — отдельно.",
    },
  },
];
