// Sayt ikonkalari: har bir joy uchun Gemini chizadigan rasm tavsifi (inglizcha) va zaxira emoji.
// Rasm tayyor bo'lguncha yoki Gemini ishlamasa emoji ko'rsatiladi. Rasm bir marta chizilib, serverda saqlanadi.
// Yangi ikonka qo'shish: shu ro'yxatga qator yozing va <Visual id="..." /> bilan ishlating.

export type Visual = { emoji: string; prompt: string };

const v = (emoji: string, prompt: string): Visual => ({ emoji, prompt });

/**
 * Odam tasvirlangan ikonkalar: yuz silliq, ko'z, burun va og'iz chizilmaydi (faqat yuz shakli, soch, kiyim).
 * Tavsif matni o'zgargani uchun bu ikonkalar yangidan chiziladi, qolganlari keshdan olinadi.
 */
export const FACELESS = "every person is drawn faceless: a smooth blank face with no eyes, no eyebrows, no nose and no mouth";
const person = (emoji: string, prompt: string): Visual => v(emoji, `${prompt}; ${FACELESS}`);

export const VISUALS = {
  // ---------- Bosh sahifa: tezkor harakatlar ----------
  "home:test": v("📝", "an exam answer sheet with round multiple-choice bubbles, a yellow pencil and a small stopwatch"),
  "home:writing": v("✍️", "an open notebook with squared manuscript paper and a pen writing on it"),
  "home:speak": v("🗣️", "two rounded speech bubbles facing each other and a small microphone"),
  "home:ustoz": person("🎙️", "a friendly young male teacher character wearing headphones with a microphone, waving"),
  "home:hangul": v("한", "three toy wooden building blocks and a traditional calligraphy brush with an ink stone"),
  "home:words": v("🃏", "a small fan of colourful flash cards and a glowing light bulb"),
  "home:tutor": v("🤖", "a cute friendly robot teacher holding an open book and pointing at it"),
  "home:guide": v("🇰🇷", "a traditional Korean hanok roof in front of the N Seoul Tower on a hill"),

  // ---------- Menyu («Barcha bo'limlar») ----------
  "nav:home": v("🏠", "a cosy little house with a red roof, a round window and a small tree next to it"),
  "nav:progress": v("📈", "a rising bar chart with an upward arrow and a small gold star"),
  "nav:profile": person("👤", "a cute student avatar with a graduation cap inside a round badge"),

  // ---------- Bosh sahifa: kimlar uchun ----------
  "who:beginner": v("🌱", "a small green sprout growing out of an open book"),
  "who:topik": v("🎓", "a graduation cap on a stack of books with a gold medal"),
  "who:korea": v("🧳", "a suitcase, a passport and a set of house keys"),

  // ---------- Testlar ----------
  "exam:topik1": v("🎧", "a simple exam paper with a big star sticker and a pair of headphones"),
  "exam:topik2": v("📘", "a thick exam booklet, headphones and a fountain pen"),
  "exam:eps": person("🏭", "a factory worker wearing a yellow safety helmet and holding a clipboard with a checklist"),

  // ---------- Darslar ----------
  "lesson:greet": person("👋", "two people bowing politely to greet each other"),
  "lesson:intro": person("📛", "a young man with a blank name badge waving hello"),
  "lesson:num1": v("🔢", "a wooden abacus with colourful counting beads"),
  "lesson:num2": v("⏰", "a round alarm clock with bells"),
  "lesson:verbs": person("👟", "a person running in sports shoes"),
  "lesson:food": v("🍜", "a bowl of Korean bibimbap with a spoon and chopsticks"),
  "lesson:shop": v("🛍️", "colourful shopping bags in a small shopping cart"),
  "lesson:transport": v("🚇", "a Seoul subway train arriving at a station platform"),
  "lesson:hospital": v("🏥", "a doctor's stethoscope, a medicine bottle and a plaster"),
  "lesson:work": v("🏭", "a small factory building with a conveyor belt carrying boxes"),
  "lesson:days": v("📅", "a desk calendar without writing, a small sun and a crescent moon"),
  "lesson:office": v("🏦", "a bank building with a passport and a bank card in front of it"),

  // ---------- Suhbat vaziyatlari ----------
  "scenario:free": person("💬", "two friends chatting at a cafe table with coffee cups"),
  "scenario:restaurant": person("🍜", "a waiter taking an order at a Korean restaurant table"),
  "scenario:store": v("🏪", "a convenience store counter with snacks, drinks and a card reader"),
  "scenario:hospital": person("🏥", "a doctor listening to a patient with a stethoscope"),
  "scenario:bank": person("🏦", "a bank teller at a counter handing a bank card to a customer"),
  "scenario:immigration": person("🛂", "an officer at an immigration office counter checking a passport"),
  "scenario:transport": v("🚕", "an orange Korean taxi next to a subway station entrance"),
  "scenario:work": person("🏭", "a factory team leader in a safety helmet explaining a task to a young worker"),
  "scenario:house": person("🏠", "a real estate agent handing house keys to a young man in front of a small apartment building"),
  "scenario:interview": person("💼", "a job interview: a young applicant in a suit sitting across a table from an interviewer"),
  "scenario:topik": person("🎤", "a student speaking into a desk microphone in front of a laptop"),

  // ---------- So'z to'plamlari ----------
  "deck:noun": v("🏠", "a small house, a book, a cup of water and a coin together"),
  "deck:verb": person("👟", "a person running, a person eating and a person sleeping, small figures in a row"),
  "deck:adj": v("🎨", "a painter's palette with colourful paint and a brush"),
  "deck:work": v("🏭", "a yellow safety helmet, work gloves and a toolbox"),
  "deck:t2": v("🎓", "a graduation cap on top of a newspaper and a globe"),
  "deck:eps-tools": v("🔧", "a hammer, a wrench, a screwdriver and a tape measure"),
  "deck:eps-safety": v("⛑️", "a yellow safety helmet, safety goggles and a fire extinguisher"),
  "deck:eps-life": v("🏠", "a cosy dormitory room with a bed, a washing machine and a kettle"),

  // ---------- Koreyada hayot ----------
  "guide:112": v("🚓", "a Korean police car with its light on"),
  "guide:119": v("🚑", "an ambulance and a red fire truck side by side"),
  "guide:1345": v("🛂", "a passport and a globe with a speech bubble"),
  "guide:1350": person("⛑️", "a worker in a safety helmet holding a pay envelope with coins"),
  "guide:1330": v("🧳", "a tourist suitcase, a paper map and a phone with headphones"),
  "step:id": v("🪪", "a plastic ID card without any writing, next to a passport"),
  "step:phone": v("📱", "a smartphone with a new SIM card"),
  "step:bank": v("🏦", "a bank card, a small bankbook and coins"),
  "step:insurance": person("🏥", "a shield with a medical cross protecting a small family"),
  "step:trash": v("🗑️", "three recycling bins of different colours for sorting waste"),
} satisfies Record<string, Visual>;

export type VisualId = keyof typeof VISUALS;

export const visualPrompts = (): string[] => [...new Set(Object.values(VISUALS).map((x) => x.prompt.trim()))];

/** Ro'yxatda bor-yo'qligini tekshirib, VisualId qaytaradi (masalan, `lesson:${id}`) */
export function visualId(id: string): VisualId | undefined {
  return id in VISUALS ? (id as VisualId) : undefined;
}
