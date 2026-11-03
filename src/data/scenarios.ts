
export type Scenario = { id: string; emoji: string; ko: string; title: string; role: string; goal: string };

export const SCENARIOS: Scenario[] = [
  { id: "free", emoji: "💬", ko: "자유 대화", title: "Erkin suhbat", role: "a friendly Korean friend of the same age", goal: "chat about daily life, hobbies, plans" },
  { id: "restaurant", emoji: "🍜", ko: "식당에서 주문하기", title: "Restoranda buyurtma", role: "a restaurant staff member in Seoul", goal: "order food, ask about ingredients (pork/halal, spiciness), pay the bill" },
  { id: "store", emoji: "🏪", ko: "편의점·마트", title: "Do‘kon va market", role: "a convenience store / mart cashier", goal: "find items, ask prices, pay by card, ask for a bag" },
  { id: "hospital", emoji: "🏥", ko: "병원에서 진료받기", title: "Shifokor qabulida", role: "a clinic receptionist and then a doctor", goal: "register, describe symptoms, understand how to take medicine" },
  { id: "bank", emoji: "🏦", ko: "은행 계좌 만들기", title: "Bankda hisob ochish", role: "a bank teller", goal: "open an account, get a debit card, ask about sending money abroad" },
  { id: "immigration", emoji: "🛂", ko: "출입국·외국인청", title: "Migratsiya xizmatida", role: "an immigration office officer", goal: "register as a foreigner or extend the visa, ask which documents are needed" },
  { id: "transport", emoji: "🚕", ko: "택시·지하철", title: "Taksi va metro", role: "a taxi driver or a helpful passerby at a subway station", goal: "give a destination, ask directions, transfer lines" },
  { id: "work", emoji: "🏭", ko: "직장에서", title: "Ish joyida (zavod)", role: "a Korean team leader (반장) at a factory", goal: "understand work instructions, ask to repeat, report finishing a task, ask about break and overtime" },
  { id: "house", emoji: "🏠", ko: "집 구하기 (부동산)", title: "Uy ijaraga olish", role: "a real estate agent (부동산 중개인)", goal: "ask about monthly rent (월세), deposit (보증금), location, contract" },
  { id: "interview", emoji: "💼", ko: "면접", title: "Ishga suhbat", role: "a Korean company interviewer", goal: "introduce yourself, explain experience and motivation politely (formal -습니다 style)" },
  { id: "topik", emoji: "🎤", ko: "TOPIK 말하기 연습", title: "TOPIK Speaking mashqi", role: "a TOPIK speaking examiner who gives one exam-style question at a time (self-introduction, describing pictures, giving opinions)", goal: "answer TOPIK speaking test style questions with structured, complete answers" },
];
