import type { Bi } from "@/lib/i18n";

export type Scenario = { id: string; emoji: string; ko: string; title: Bi; role: string; goal: string };

export const SCENARIOS: Scenario[] = [
  { id: "free", emoji: "💬", ko: "자유 대화", title: { uz: "Erkin suhbat", ru: "Свободный разговор" }, role: "a friendly Korean friend of the same age", goal: "chat about daily life, hobbies, plans" },
  { id: "restaurant", emoji: "🍜", ko: "식당에서 주문하기", title: { uz: "Restoranda buyurtma", ru: "Заказ в ресторане" }, role: "a restaurant staff member in Seoul", goal: "order food, ask about ingredients (pork/halal, spiciness), pay the bill" },
  { id: "store", emoji: "🏪", ko: "편의점·마트", title: { uz: "Do‘kon va market", ru: "Магазин и маркет" }, role: "a convenience store / mart cashier", goal: "find items, ask prices, pay by card, ask for a bag" },
  { id: "hospital", emoji: "🏥", ko: "병원에서 진료받기", title: { uz: "Shifokor qabulida", ru: "На приёме у врача" }, role: "a clinic receptionist and then a doctor", goal: "register, describe symptoms, understand how to take medicine" },
  { id: "bank", emoji: "🏦", ko: "은행 계좌 만들기", title: { uz: "Bankda hisob ochish", ru: "Открыть счёт в банке" }, role: "a bank teller", goal: "open an account, get a debit card, ask about sending money abroad" },
  { id: "immigration", emoji: "🛂", ko: "출입국·외국인청", title: { uz: "Migratsiya xizmatida", ru: "В миграционной службе" }, role: "an immigration office officer", goal: "register as a foreigner or extend the visa, ask which documents are needed" },
  { id: "transport", emoji: "🚕", ko: "택시·지하철", title: { uz: "Taksi va metro", ru: "Такси и метро" }, role: "a taxi driver or a helpful passerby at a subway station", goal: "give a destination, ask directions, transfer lines" },
  { id: "work", emoji: "🏭", ko: "직장에서", title: { uz: "Ish joyida (zavod)", ru: "На работе (завод)" }, role: "a Korean team leader (반장) at a factory", goal: "understand work instructions, ask to repeat, report finishing a task, ask about break and overtime" },
  { id: "house", emoji: "🏠", ko: "집 구하기 (부동산)", title: { uz: "Uy ijaraga olish", ru: "Аренда жилья" }, role: "a real estate agent (부동산 중개인)", goal: "ask about monthly rent (월세), deposit (보증금), location, contract" },
  { id: "interview", emoji: "💼", ko: "면접", title: { uz: "Ishga suhbat", ru: "Собеседование" }, role: "a Korean company interviewer", goal: "introduce yourself, explain experience and motivation politely (formal -습니다 style)" },
  { id: "topik", emoji: "🎤", ko: "TOPIK 말하기 연습", title: { uz: "TOPIK Speaking mashqi", ru: "Тренировка TOPIK Speaking" }, role: "a TOPIK speaking examiner who gives one exam-style question at a time (self-introduction, describing pictures, giving opinions)", goal: "answer TOPIK speaking test style questions with structured, complete answers" },
];
