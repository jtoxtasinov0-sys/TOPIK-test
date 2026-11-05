// Admin «Logo studiyasi»: Gemini'ga namuna rasmlar bilan beriladigan topshiriq.
// Namunalardan faqat uslub olinadi — natija o'ziga xos bo'lishi shart.

export const LOGO_BRIEF = `Design a minimalist, professional brand logo mark (symbol only) for "HanUstoz" — an online platform where Uzbek speakers learn the Korean language and prepare for the TOPIK and EPS-TOPIK exams ("Ustoz" means "teacher" in Uzbek).
The mark is a bold monogram of the letter "H".
Use the attached reference images ONLY as style inspiration (bold flat geometric construction, strong negative space, confident modern shapes). Do NOT copy any reference: the result must be original and clearly different from them.
Brand colours: violet #6A11FF, blue #3A86FF, deep indigo #160F3B and white. A tiny accent of warm yellow #FFC04A is allowed.
Requirements: flat vector style, crisp clean edges, no 3D, no shadows, no glossy effects, no mockup, no text or other letters — only the H mark, centred on a plain solid background, square image, readable at a small app-icon size.`;

/** Har bir variant uchun boshqa qurilish g'oyasi — natijalar bir-biriga o'xshamasin */
export const LOGO_IDEAS = [
  "Construction idea: slanted, dynamic H with diagonal cuts and a rising crossbar (speed, growth).",
  "Construction idea: two-tone interlocking H — the two halves lock together like puzzle pieces (two languages connecting).",
  "Construction idea: soft rounded, friendly H with an organic flowing or wave-like crossbar (conversation).",
  "Construction idea: geometric H built from separate blocks with thin negative-space gaps inside a simple silhouette (structure, step-by-step learning).",
  "Construction idea: H whose negative space hides a meaningful symbol — an open book, a speech bubble or a rising sun.",
  "Construction idea: H combined with the Korean vowel ㅏ (the crossbar extends through the right stem), forming the syllable 하.",
];

export const MAX_LOGO_IMAGES = 6;
export const MAX_LOGO_VARIANTS = 4;

export function logoPrompt(brief: string, i: number, n: number) {
  return `${brief.trim()}\n\nThis is variant ${i + 1} of ${n}. ${LOGO_IDEAS[i % LOGO_IDEAS.length]}`;
}
