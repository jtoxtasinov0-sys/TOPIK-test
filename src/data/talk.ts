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

// ---------- Birinchi salom (AI'siz, darhol) ----------
// Suhbat boshida AI javobini kutmaslik uchun: tayyor salom va mavzuga mos birinchi savol.
// Ovozi tanlash ekranidayoq oldindan tayyorlanadi — «Suhbatni boshlash» bosilishi bilan do'st gapiradi.

type Line = { ko: string; uz: string };
type Opener = { polite: Line; casual: Line; hints: { polite: Line[]; casual: Line[] } };

const OPENERS: Record<string, Opener> = {
  free: {
    polite: { ko: "오늘 기분이 어때요?", uz: "Bugun kayfiyatingiz qanday?" },
    casual: { ko: "오늘 기분 어때?", uz: "Bugun kayfiyating qanday?" },
    hints: {
      polite: [
        { ko: "기분이 좋아요.", uz: "Kayfiyatim yaxshi." },
        { ko: "조금 피곤해요.", uz: "Biroz charchadim." },
      ],
      casual: [
        { ko: "기분 좋아.", uz: "Kayfiyatim yaxshi." },
        { ko: "좀 피곤해.", uz: "Biroz charchadim." },
      ],
    },
  },
  day: {
    polite: { ko: "오늘 뭐 했어요?", uz: "Bugun nima qildingiz?" },
    casual: { ko: "오늘 뭐 했어?", uz: "Bugun nima qilding?" },
    hints: {
      polite: [
        { ko: "오늘 일했어요.", uz: "Bugun ishladim." },
        { ko: "친구를 만났어요.", uz: "Do‘stim bilan uchrashdim." },
      ],
      casual: [
        { ko: "오늘 일했어.", uz: "Bugun ishladim." },
        { ko: "친구 만났어.", uz: "Do‘stim bilan uchrashdim." },
      ],
    },
  },
  food: {
    polite: { ko: "무슨 음식을 제일 좋아해요?", uz: "Qaysi ovqatni eng yaxshi ko‘rasiz?" },
    casual: { ko: "무슨 음식 제일 좋아해?", uz: "Qaysi ovqatni eng yaxshi ko‘rasan?" },
    hints: {
      polite: [
        { ko: "저는 김치찌개를 좋아해요.", uz: "Men kimchi-tchigeni yaxshi ko‘raman." },
        { ko: "저는 고기를 좋아해요.", uz: "Men go‘shtni yaxshi ko‘raman." },
      ],
      casual: [
        { ko: "나는 김치찌개 좋아해.", uz: "Men kimchi-tchigeni yaxshi ko‘raman." },
        { ko: "나는 고기 좋아해.", uz: "Men go‘shtni yaxshi ko‘raman." },
      ],
    },
  },
  hobby: {
    polite: { ko: "쉬는 날에 보통 뭐 해요?", uz: "Dam olish kunlari odatda nima qilasiz?" },
    casual: { ko: "쉬는 날에 보통 뭐 해?", uz: "Dam olish kunlari odatda nima qilasan?" },
    hints: {
      polite: [
        { ko: "축구를 해요.", uz: "Futbol o‘ynayman." },
        { ko: "집에서 드라마를 봐요.", uz: "Uyda serial ko‘raman." },
      ],
      casual: [
        { ko: "축구 해.", uz: "Futbol o‘ynayman." },
        { ko: "집에서 드라마 봐.", uz: "Uyda serial ko‘raman." },
      ],
    },
  },
  korea: {
    polite: { ko: "한국 생활은 어때요?", uz: "Koreyadagi hayot qanday?" },
    casual: { ko: "한국 생활은 어때?", uz: "Koreyadagi hayoting qanday?" },
    hints: {
      polite: [
        { ko: "재미있어요. 그런데 좀 힘들어요.", uz: "Qiziq. Lekin biroz qiyin." },
        { ko: "아직 한국에 안 가 봤어요.", uz: "Hali Koreyaga borib ko‘rmaganman." },
      ],
      casual: [
        { ko: "재미있어. 근데 좀 힘들어.", uz: "Qiziq. Lekin biroz qiyin." },
        { ko: "아직 한국에 안 가 봤어.", uz: "Hali Koreyaga borib ko‘rmaganman." },
      ],
    },
  },
  work: {
    polite: { ko: "무슨 일을 해요? 아니면 학생이에요?", uz: "Nima ish qilasiz? Yoki talabamisiz?" },
    casual: { ko: "무슨 일 해? 아니면 학생이야?", uz: "Nima ish qilasan? Yoki talabamisan?" },
    hints: {
      polite: [
        { ko: "공장에서 일해요.", uz: "Zavodda ishlayman." },
        { ko: "저는 학생이에요.", uz: "Men talabaman." },
      ],
      casual: [
        { ko: "공장에서 일해.", uz: "Zavodda ishlayman." },
        { ko: "나는 학생이야.", uz: "Men talabaman." },
      ],
    },
  },
  travel: {
    polite: { ko: "한국에서 어디에 가 보고 싶어요?", uz: "Koreyada qayerga borib ko‘rmoqchisiz?" },
    casual: { ko: "한국에서 어디 가 보고 싶어?", uz: "Koreyada qayerga borib ko‘rmoqchisan?" },
    hints: {
      polite: [
        { ko: "제주도에 가 보고 싶어요.", uz: "Jeju oroliga borib ko‘rmoqchiman." },
        { ko: "부산에 가 보고 싶어요.", uz: "Pusanga borib ko‘rmoqchiman." },
      ],
      casual: [
        { ko: "제주도에 가 보고 싶어.", uz: "Jeju oroliga borib ko‘rmoqchiman." },
        { ko: "부산에 가 보고 싶어.", uz: "Pusanga borib ko‘rmoqchiman." },
      ],
    },
  },
  uzbek: {
    polite: { ko: "우즈베키스탄 어디에서 왔어요?", uz: "O‘zbekistonning qayeridan kelgansiz?" },
    casual: { ko: "우즈베키스탄 어디에서 왔어?", uz: "O‘zbekistonning qayeridan kelgansan?" },
    hints: {
      polite: [
        { ko: "타슈켄트에서 왔어요.", uz: "Toshkentdan keldim." },
        { ko: "사마르칸트에서 왔어요.", uz: "Samarqanddan keldim." },
      ],
      casual: [
        { ko: "타슈켄트에서 왔어.", uz: "Toshkentdan keldim." },
        { ko: "사마르칸트에서 왔어.", uz: "Samarqanddan keldim." },
      ],
    },
  },
};

/** Ism oxiri undosh bo'lsa (받침): 민준이에요 / 민준이야; unli bo'lsa: 지수예요 / 지수야 */
const hasBatchim = (word: string) => {
  const c = word.codePointAt(word.length - 1) ?? 0;
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0;
};

/** Suhbat boshidagi salom: do'st o'zini tanishtiradi va mavzu bo'yicha birinchi savolni beradi */
export function greeting(partnerId: string | undefined, topicId: string | undefined, style: TalkStyle) {
  const p = partnerOf(partnerId);
  const o = OPENERS[topicOf(topicId).id] ?? OPENERS.free;
  const b = hasBatchim(p.name);
  const latin = p.uz.split(" ")[0];
  const q = o[style];
  return style === "casual"
    ? { ko: `안녕! 나는 ${p.name}${b ? "이야" : "야"}. ${q.ko}`, uz: `Salom! Men ${latin}man. ${q.uz}`, hints: o.hints.casual }
    : { ko: `안녕하세요! 저는 ${p.name}${b ? "이에요" : "예요"}. ${q.ko}`, uz: `Assalomu alaykum! Men ${latin}man. ${q.uz}`, hints: o.hints.polite };
}
