
export type Jamo = {
  g: string; // harf
  r: string; // romanizatsiya
  name?: string; // harf nomi (기역)
  say: string; // TTS uchun bo'g'in
  ex: { ko: string; rom: string; uz: string };
  tip: string;
};

export const CONSONANTS: Jamo[] = [
  { g: "ㄱ", r: "g / k", name: "기역", say: "가", ex: { ko: "가방", rom: "gabang", uz: "sumka" }, tip: "So‘z boshida «g» va «k» oralig‘idagi tovush, oxirida «k»." },
  { g: "ㄴ", r: "n", name: "니은", say: "나", ex: { ko: "나무", rom: "namu", uz: "daraxt" }, tip: "O‘zbekcha «n» kabi." },
  { g: "ㄷ", r: "d / t", name: "디귿", say: "다", ex: { ko: "다리", rom: "dari", uz: "ko‘prik; oyoq" }, tip: "«d» va «t» oralig‘ida, yumshoq aytiladi." },
  { g: "ㄹ", r: "r / l", name: "리을", say: "라", ex: { ko: "라면", rom: "ramyeon", uz: "ramyon (lag‘mon)" }, tip: "Unlilar orasida yengil «r», bo‘g‘in oxirida «l»." },
  { g: "ㅁ", r: "m", name: "미음", say: "마", ex: { ko: "물", rom: "mul", uz: "suv" }, tip: "O‘zbekcha «m»." },
  { g: "ㅂ", r: "b / p", name: "비읍", say: "바", ex: { ko: "바다", rom: "bada", uz: "dengiz" }, tip: "«b» va «p» oralig‘ida." },
  { g: "ㅅ", r: "s", name: "시옷", say: "사", ex: { ko: "사람", rom: "saram", uz: "odam" }, tip: "«s»; ㅣ oldida «sh» (시 = shi)." },
  { g: "ㅇ", r: "– / ng", name: "이응", say: "아", ex: { ko: "아이", rom: "ai", uz: "bola" }, tip: "Bo‘g‘in boshida ovozsiz, oxirida «ng» (방 = bang)." },
  { g: "ㅈ", r: "j", name: "지읒", say: "자", ex: { ko: "자전거", rom: "jajeongeo", uz: "velosiped" }, tip: "Yumshoq «j» (o‘zbekcha «jon»dagi kabi)." },
  { g: "ㅊ", r: "ch", name: "치읓", say: "차", ex: { ko: "차", rom: "cha", uz: "mashina; choy" }, tip: "Kuchli nafas bilan «ch»." },
  { g: "ㅋ", r: "k", name: "키읔", say: "카", ex: { ko: "커피", rom: "keopi", uz: "qahva" }, tip: "Nafasli «k» — og‘iz oldida havo chiqadi." },
  { g: "ㅌ", r: "t", name: "티읕", say: "타", ex: { ko: "토마토", rom: "tomato", uz: "pomidor" }, tip: "Nafasli «t»." },
  { g: "ㅍ", r: "p", name: "피읖", say: "파", ex: { ko: "포도", rom: "podo", uz: "uzum" }, tip: "Nafasli «p»." },
  { g: "ㅎ", r: "h", name: "히읗", say: "하", ex: { ko: "하나", rom: "hana", uz: "bir" }, tip: "Yengil «h»." },
];

export const DOUBLE_CONSONANTS: Jamo[] = [
  { g: "ㄲ", r: "kk", name: "쌍기역", say: "까", ex: { ko: "꽃", rom: "kkot", uz: "gul" }, tip: "Taranglashgan «k» — nafassiz, keskin." },
  { g: "ㄸ", r: "tt", name: "쌍디귿", say: "따", ex: { ko: "딸기", rom: "ttalgi", uz: "qulupnay" }, tip: "Taranglashgan «t»." },
  { g: "ㅃ", r: "pp", name: "쌍비읍", say: "빠", ex: { ko: "빵", rom: "ppang", uz: "non" }, tip: "Taranglashgan «p»." },
  { g: "ㅆ", r: "ss", name: "쌍시옷", say: "싸", ex: { ko: "쌀", rom: "ssal", uz: "guruch" }, tip: "Kuchli, cho‘zilgan «s»." },
  { g: "ㅉ", r: "jj", name: "쌍지읒", say: "짜", ex: { ko: "짜다", rom: "jjada", uz: "sho‘r" }, tip: "Taranglashgan «ch/j»." },
];

export const VOWELS: Jamo[] = [
  { g: "ㅏ", r: "a", say: "아", ex: { ko: "아버지", rom: "abeoji", uz: "ota" }, tip: "«a»." },
  { g: "ㅑ", r: "ya", say: "야", ex: { ko: "야구", rom: "yagu", uz: "beysbol" }, tip: "«ya»." },
  { g: "ㅓ", r: "eo", say: "어", ex: { ko: "어머니", rom: "eomeoni", uz: "ona" }, tip: "Og‘izni keng ochib, lablarni yumaloqlamasdan «o»." },
  { g: "ㅕ", r: "yeo", say: "여", ex: { ko: "여자", rom: "yeoja", uz: "ayol" }, tip: "«yo» (ㅓ ning y-li varianti)." },
  { g: "ㅗ", r: "o", say: "오", ex: { ko: "오이", rom: "oi", uz: "bodring" }, tip: "Lablarni yumaloqlab «o»." },
  { g: "ㅛ", r: "yo", say: "요", ex: { ko: "요리", rom: "yori", uz: "taom tayyorlash" }, tip: "Yumaloq «yo»." },
  { g: "ㅜ", r: "u", say: "우", ex: { ko: "우유", rom: "uyu", uz: "sut" }, tip: "«u»." },
  { g: "ㅠ", r: "yu", say: "유", ex: { ko: "유리", rom: "yuri", uz: "shisha" }, tip: "«yu»." },
  { g: "ㅡ", r: "eu", say: "으", ex: { ko: "음악", rom: "eumak", uz: "musiqa" }, tip: "Lablar cho‘zilgan, ruscha «ы»ga yaqin." },
  { g: "ㅣ", r: "i", say: "이", ex: { ko: "이름", rom: "ireum", uz: "ism" }, tip: "«i»." },
  { g: "ㅐ", r: "ae", say: "애", ex: { ko: "개", rom: "gae", uz: "it" }, tip: "Ochiq «e» (ㅔ bilan deyarli bir xil)." },
  { g: "ㅒ", r: "yae", say: "얘", ex: { ko: "얘기", rom: "yaegi", uz: "suhbat" }, tip: "«ye»." },
  { g: "ㅔ", r: "e", say: "에", ex: { ko: "게", rom: "ge", uz: "qisqichbaqa" }, tip: "«e»." },
  { g: "ㅖ", r: "ye", say: "예", ex: { ko: "시계", rom: "sigye", uz: "soat" }, tip: "«ye»." },
  { g: "ㅘ", r: "wa", say: "와", ex: { ko: "사과", rom: "sagwa", uz: "olma" }, tip: "ㅗ + ㅏ = «va»." },
  { g: "ㅙ", r: "wae", say: "왜", ex: { ko: "왜", rom: "wae", uz: "nega" }, tip: "«ve»." },
  { g: "ㅚ", r: "oe", say: "외", ex: { ko: "회사", rom: "hoesa", uz: "kompaniya" }, tip: "Ko‘pincha «ve» deb aytiladi." },
  { g: "ㅝ", r: "wo", say: "워", ex: { ko: "뭐", rom: "mwo", uz: "nima" }, tip: "ㅜ + ㅓ = «vo»." },
  { g: "ㅞ", r: "we", say: "웨", ex: { ko: "웨이터", rom: "weiteo", uz: "ofitsiant" }, tip: "«ve»." },
  { g: "ㅟ", r: "wi", say: "위", ex: { ko: "귀", rom: "gwi", uz: "quloq" }, tip: "«vi»." },
  { g: "ㅢ", r: "ui", say: "의", ex: { ko: "의사", rom: "uisa", uz: "shifokor" }, tip: "ㅡ + ㅣ tez aytiladi." },
];

export const BATCHIM: { sound: string; letters: string; ex: { ko: string; rom: string; uz: string }[] }[] = [
  { sound: "k", letters: "ㄱ ㅋ ㄲ", ex: [{ ko: "책", rom: "chaek", uz: "kitob" }, { ko: "부엌", rom: "bueok", uz: "oshxona" }] },
  { sound: "n", letters: "ㄴ", ex: [{ ko: "산", rom: "san", uz: "tog‘" }, { ko: "돈", rom: "don", uz: "pul" }] },
  { sound: "t", letters: "ㄷ ㅅ ㅆ ㅈ ㅊ ㅌ ㅎ", ex: [{ ko: "옷", rom: "ot", uz: "kiyim" }, { ko: "꽃", rom: "kkot", uz: "gul" }] },
  { sound: "l", letters: "ㄹ", ex: [{ ko: "물", rom: "mul", uz: "suv" }, { ko: "달", rom: "dal", uz: "oy" }] },
  { sound: "m", letters: "ㅁ", ex: [{ ko: "밤", rom: "bam", uz: "tun" }, { ko: "김치", rom: "gimchi", uz: "kimchi" }] },
  { sound: "p", letters: "ㅂ ㅍ", ex: [{ ko: "밥", rom: "bap", uz: "ovqat, guruch" }, { ko: "앞", rom: "ap", uz: "old" }] },
  { sound: "ng", letters: "ㅇ", ex: [{ ko: "강", rom: "gang", uz: "daryo" }, { ko: "방", rom: "bang", uz: "xona" }] },
];

// Bo'g'in yasash (Unicode: 0xAC00 + (I*21 + V)*28 + F)
export const INITIALS = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
export const MEDIALS = ["ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅗ", "ㅘ", "ㅙ", "ㅚ", "ㅛ", "ㅜ", "ㅝ", "ㅞ", "ㅟ", "ㅠ", "ㅡ", "ㅢ", "ㅣ"];
export const FINALS = ["", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
const R_I = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"];
const R_V = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"];
const R_F = ["", "k", "k", "k", "n", "n", "n", "t", "l", "k", "m", "p", "l", "l", "p", "l", "m", "p", "p", "t", "t", "ng", "t", "t", "k", "t", "p", "t"];
export const SIMPLE_FINALS = ["", "ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ", "ㄲ", "ㅆ"];

export function compose(i: string, v: string, f = "") {
  const I = INITIALS.indexOf(i);
  const V = MEDIALS.indexOf(v);
  const F = FINALS.indexOf(f);
  if (I < 0 || V < 0 || F < 0) return "";
  return String.fromCharCode(0xac00 + (I * 21 + V) * 28 + F);
}

export function romanize(i: string, v: string, f = "") {
  return R_I[INITIALS.indexOf(i)] + R_V[MEDIALS.indexOf(v)] + R_F[FINALS.indexOf(f)];
}
