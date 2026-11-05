
export const EMERGENCY: { num: string; emoji: string; title: string; desc: string }[] = [
  { num: "112", emoji: "🚓", title: "Politsiya", desc: "Jinoyat, o‘g‘rilik, xavfli vaziyat" },
  { num: "119", emoji: "🚑", title: "Tez yordam va o‘t o‘chirish", desc: "Yong‘in, og‘ir kasallik, baxtsiz hodisa" },
  { num: "1345", emoji: "🛂", title: "Chet elliklar markazi", desc: "Viza, yashash muddati, ro‘yxatdan o‘tish — ko‘p tilli maslahat" },
  { num: "1350", emoji: "⛑️", title: "Mehnat vazirligi", desc: "Maosh to‘lanmasa, mehnat huquqlari bo‘yicha" },
  { num: "1330", emoji: "🧳", title: "Sayyohlar uchun qo‘ng‘iroq markazi", desc: "Tarjima va ma’lumot, 24 soat" },
];

export const APPS: { name: string; emoji: string; desc: string }[] = [
  { name: "Naver Map / KakaoMap", emoji: "🗺️", desc: "Yo‘l topish, avtobus va metro — Google Maps Koreyada yaxshi ishlamaydi" },
  { name: "Papago", emoji: "🔤", desc: "Koreyscha tarjimon (rasm va ovozdan ham)" },
  { name: "KakaoTalk", emoji: "💬", desc: "Koreyada asosiy messenjer — ish va do‘stlar uchun shart" },
  { name: "Kakao T", emoji: "🚕", desc: "Taksi chaqirish" },
  { name: "Coupang / Baemin", emoji: "📦", desc: "Onlayn xarid va ovqat yetkazib berish" },
  { name: "Hi Korea", emoji: "🛂", desc: "Migratsiya xizmatiga onlayn navbat va arizalar (hikorea.go.kr)" },
];

export const FIRST_STEPS: { id: string; emoji: string; title: string; text: string }[] = [
  {
    id: "id",
    emoji: "🪪",
    title: "Chet ellik ID kartasi (외국인등록증)",
    text: "90 kundan ortiq qoladiganlar kelganidan keyin 90 kun ichida migratsiya xizmatida ro‘yxatdan o‘tadi. Navbatni Hi Korea orqali oldindan oling.",
  },
  {
    id: "phone",
    emoji: "📱",
    title: "Telefon raqami",
    text: "Koreya raqami bank, ish va onlayn xizmatlar uchun kerak. Pasport bilan oldindan to‘lanadigan (선불) tarifdan boshlash mumkin.",
  },
  {
    id: "bank",
    emoji: "🏦",
    title: "Bank hisobi",
    text: "Odatda ID karta, pasport va telefon raqami so‘raladi. Darsdagi «출입국 · 은행» iboralarini oldindan mashq qiling.",
  },
  {
    id: "insurance",
    emoji: "🏥",
    title: "Tibbiy sug‘urta",
    text: "Uzoq muddat yashaydigan chet elliklar odatda milliy sug‘urtaga (국민건강보험) qo‘shiladi. Shifokorga ID kartangizni olib boring.",
  },
  {
    id: "trash",
    emoji: "🗑️",
    title: "Chiqindilarni ajratish",
    text: "Oddiy chiqindi maxsus pullik paketga (종량제 봉투), ovqat qoldiqlari va qayta ishlanadiganlar alohida tashlanadi.",
  },
];
