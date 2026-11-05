// Erkin suhbat (/speak/free): koreys do'st — suhbatdosh, mavzular va sozlamalar.
// Brauzer ham (tanlash ekrani), server ham (/api/talk prompti) shu ro'yxatdan foydalanadi.

export type TalkLevel = "beginner" | "intermediate" | "advanced";
export type TalkStyle = "polite" | "casual";

export type Partner = {
  id: "minjun" | "jisu";
  name: string;
  uz: string;
  voice: "m" | "f";
  /** promptdagi tavsifi (inglizcha) */
  about: string;
};

export const PARTNERS: Partner[] = [
  {
    id: "minjun",
    name: "민준",
    uz: "Minjun · yigit, 26 yosh, Seul",
    voice: "m",
    about: "Minjun (민준), a 26-year-old guy from Seoul who works at an IT company, loves football, games, 라면 and trying foreign food, and is curious about Uzbekistan",
  },
  {
    id: "jisu",
    name: "지수",
    uz: "Jisu · qiz, 24 yosh, Pusan",
    voice: "f",
    about: "Jisu (지수), a 24-year-old woman from Busan who studies in Seoul and works part-time at a cafe, loves K-dramas, travel and cooking, and is curious about Uzbekistan",
  },
];

export type Topic = { id: string; emoji: string; uz: string; en: string };

export const TOPICS: Topic[] = [
  { id: "free", emoji: "🎲", uz: "Erkin mavzu", en: "anything: start with a greeting and small talk, then follow the student's interests" },
  { id: "day", emoji: "☀️", uz: "Bugungi kun", en: "the student's day: what they did and ate today, plans for tonight and the weekend" },
  { id: "food", emoji: "🍜", uz: "Ovqat", en: "food: favourite Korean and Uzbek dishes (osh, somsa), halal food in Korea, cooking, restaurants" },
  { id: "hobby", emoji: "🎮", uz: "Qiziqishlar", en: "hobbies and free time: sports, music, K-dramas, games, weekends" },
  { id: "korea", emoji: "🇰🇷", uz: "Koreyada hayot", en: "life in Korea: transport, weather, shopping, what is hard or surprising, making friends" },
  { id: "work", emoji: "💼", uz: "Ish va o‘qish", en: "work or study: job, colleagues, daily schedule, learning Korean, TOPIK plans" },
  { id: "travel", emoji: "✈️", uz: "Sayohat", en: "travel: places in Korea (Jeju, Busan, Gyeongju), dream trips, holidays" },
  { id: "uzbek", emoji: "🇺🇿", uz: "O‘zbekiston haqida", en: "the student's home country Uzbekistan: home city, family, Navruz and other holidays, food, weather — you are curious and ask about it" },
];

export const LEVELS: [TalkLevel, string][] = [
  ["beginner", "Boshlang‘ich"],
  ["intermediate", "O‘rta"],
  ["advanced", "Yuqori"],
];

export const STYLES: [TalkStyle, string, string][] = [
  ["polite", "존댓말", "hurmat bilan (-요)"],
  ["casual", "반말", "do‘stona"],
];

export const partnerOf = (id?: string) => PARTNERS.find((p) => p.id === id) ?? PARTNERS[0];
export const topicOf = (id?: string) => TOPICS.find((t) => t.id === id) ?? TOPICS[0];
