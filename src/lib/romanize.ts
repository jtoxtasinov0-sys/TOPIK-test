// Hangul → lotin yozuvi (Revised Romanization, soddalashtirilgan talaffuz qoidalari bilan).
// Bog‘lanish (연음), burunlashish (비음화), ㄹ assimilyatsiyasi va ㅎ bilan qo‘shilish hisobga olinadi.

const INI = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"];
const VOW = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"];
// Bo‘g‘in oxiridagi (받침) tovush: so‘z oxirida yoki undosh oldida
const FIN = ["", "k", "k", "k", "n", "n", "n", "t", "l", "k", "m", "l", "l", "l", "p", "l", "m", "p", "p", "t", "t", "ng", "t", "t", "k", "t", "p", "t"];
// Keyingi bo‘g‘in unli bilan boshlansa (ㅇ): [shu bo‘g‘inda qoladigan, keyingisiga o‘tadigan]
const LINK: [string, string][] = [
  ["", ""], ["", "g"], ["", "kk"], ["k", "s"], ["", "n"], ["n", "j"], ["", "n"], ["", "d"], ["", "r"], ["l", "g"], ["l", "m"],
  ["l", "b"], ["l", "s"], ["l", "t"], ["l", "p"], ["", "r"], ["", "m"], ["", "b"], ["p", "s"], ["", "s"], ["", "ss"], ["ng", ""],
  ["", "j"], ["", "ch"], ["", "k"], ["", "t"], ["", "p"], ["", ""],
];

type Syl = { i: number; v: number; f: number } | { raw: string };

function split(text: string): Syl[] {
  const out: Syl[] = [];
  for (const ch of text) {
    const c = ch.codePointAt(0)!;
    if (c >= 0xac00 && c <= 0xd7a3) {
      const s = c - 0xac00;
      out.push({ i: Math.floor(s / 588), v: Math.floor((s % 588) / 28), f: s % 28 });
    } else out.push({ raw: ch });
  }
  return out;
}

export function romanize(text: string): string {
  const syl = split(text);
  let out = "";
  for (let k = 0; k < syl.length; k++) {
    const cur = syl[k];
    if ("raw" in cur) {
      out += cur.raw;
      continue;
    }
    const next = syl[k + 1];
    const nx = next && !("raw" in next) ? next : null;
    let ini = INI[cur.i];
    // oldingi bo‘g‘in bu bo‘g‘inning boshini o‘zgartirgan bo‘lishi mumkin
    const prev = syl[k - 1];
    if (prev && !("raw" in prev) && prev.f) {
      const pf = prev.f;
      if (cur.i === 11 && cur.v === 20 && (pf === 7 || pf === 25)) ini = pf === 7 ? "j" : "ch"; // 구개음화: 같이 → gachi
      else if (cur.i === 11) ini = LINK[pf][1]; // bog‘lanish
      else if (cur.i === 18 && [1, 7, 17, 22].includes(pf)) ini = ["k", "t", "p", "ch"][[1, 7, 17, 22].indexOf(pf)]; // ㄱ/ㄷ/ㅂ/ㅈ + ㅎ
      else if ([6, 15, 27].includes(pf) && [0, 3, 12].includes(cur.i)) ini = ["k", "t", "ch"][[0, 3, 12].indexOf(cur.i)]; // ㅎ + ㄱ/ㄷ/ㅈ
      else if (cur.i === 5 && (pf === 4 || pf === 8)) ini = "l"; // ㄴ/ㄹ + ㄹ → ll
      else if (cur.i === 5) ini = "n"; // boshqa undosh + ㄹ → n
    }
    let fin = "";
    if (cur.f) {
      if (nx && nx.i === 11) fin = LINK[cur.f][0];
      else if (nx && nx.i === 18 && [1, 7, 17, 22].includes(cur.f)) fin = "";
      else if (nx && [6, 15, 27].includes(cur.f) && [0, 3, 12].includes(nx.i)) fin = cur.f === 15 ? "l" : cur.f === 6 ? "n" : "";
      else {
        fin = FIN[cur.f];
        if (nx && (nx.i === 2 || nx.i === 6 || nx.i === 5)) {
          // burunlashish: k/t/p + ㄴ/ㅁ/ㄹ → ng/n/m (국립 → gungnip)
          if (fin === "k") fin = "ng";
          else if (fin === "t") fin = "n";
          else if (fin === "p") fin = "m";
        }
        if (nx && nx.i === 5 && fin === "n") fin = "l"; // ㄴ + ㄹ → ll
      }
    }
    // ㄹ + ㄴ → ll
    if (prev && !("raw" in prev) && (prev.f === 8 || prev.f === 15) && cur.i === 2) ini = "l";
    out += ini + VOW[cur.v] + fin;
  }
  return out;
}
