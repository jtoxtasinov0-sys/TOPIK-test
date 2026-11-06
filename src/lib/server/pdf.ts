import "server-only";

// Kichik PDF yozuvchi (kutubxonasiz): A4 sahifalar, Helvetica / Helvetica-Bold (PDF'ning o'rnatilgan shriftlari),
// matn, chiziq va to'rtburchak. Matn WinAnsi kodlashda: lotin harflari, o‘ g‘ (‘ ’), tire va raqamlar to'g'ri chiqadi;
// kirill, koreys harflari va emoji o'rnatilgan shriftda yo'q — ular «?» bo'lib chiqadi (hisobotda faqat lotin matn).

export const A4 = { w: 595.28, h: 841.89 };

// Helvetica harflar kengligi (1/1000 em), 32–126 belgilar — Adobe AFM
const W = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584,
  584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278,
  278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500,
  500, 334, 260, 334, 584,
];
const EXTRA: Record<number, [number, number]> = {
  0x2018: [0x91, 222], // ‘
  0x2019: [0x92, 222], // ’
  0x02bb: [0x91, 222], // ʻ (o‘zbekcha)
  0x02bc: [0x92, 222], // ʼ
  0x201c: [0x93, 333], // “
  0x201d: [0x94, 333], // ”
  0x2022: [0x95, 350], // •
  0x2013: [0x96, 556], // –
  0x2014: [0x97, 1000], // —
  0x00a0: [0xa0, 278],
  0x00b7: [0xb7, 278], // ·
  0x00ab: [0xab, 556], // «
  0x00bb: [0xbb, 556], // »
  0x2116: [0x4e, 722], // № → N
};

/** Matnni WinAnsi baytlariga (latin1 satr sifatida) va kengligiga aylantiradi */
function encode(s: string): { bytes: string; width: number } {
  let bytes = "";
  let width = 0;
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (c >= 32 && c <= 126) {
      bytes += ch;
      width += W[c - 32];
    } else if (EXTRA[c]) {
      bytes += String.fromCharCode(EXTRA[c][0]);
      width += EXTRA[c][1];
    } else if (c >= 0xc0 && c <= 0xff) {
      bytes += ch; // lotin-1 harflari (é, ü ...)
      width += 556;
    } else {
      bytes += "?";
      width += 556;
    }
  }
  return { bytes, width };
}

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
const num = (n: number) => (Math.round(n * 100) / 100).toString();

export type TextOpts = { size?: number; bold?: boolean; align?: "left" | "right" | "center"; gray?: number; color?: [number, number, number] };

export class Pdf {
  /** Tugagan sahifalar; joriy sahifa — ops */
  private pages: string[] = [];
  private ops: string[] = [];

  /** Matn kengligi (pt) */
  width(s: string, size = 10, bold = false) {
    return (encode(s).width / 1000) * size * (bold ? 1.06 : 1);
  }

  /** Kenglikka sig'maguncha qisqartiradi («…» o'rniga «..») */
  fit(s: string, max: number, size = 10, bold = false) {
    if (this.width(s, size, bold) <= max) return s;
    let t = s;
    while (t.length > 1 && this.width(t + "..", size, bold) > max) t = t.slice(0, -1);
    return t + "..";
  }

  addPage() {
    this.pages.push(this.ops.join("\n"));
    this.ops = [];
    return this;
  }

  /** y — sahifa tepasidan (pt) */
  text(x: number, y: number, s: string, o: TextOpts = {}) {
    const size = o.size ?? 10;
    const { bytes } = encode(s);
    const w = this.width(s, size, o.bold);
    const px = o.align === "right" ? x - w : o.align === "center" ? x - w / 2 : x;
    const [r, g, b] = o.color ?? [o.gray ?? 0, o.gray ?? 0, o.gray ?? 0];
    this.ops.push(`BT /${o.bold ? "F2" : "F1"} ${num(size)} Tf ${num(r)} ${num(g)} ${num(b)} rg ${num(px)} ${num(A4.h - y)} Td (${esc(bytes)}) Tj ET`);
    return this;
  }

  line(x1: number, y1: number, x2: number, y2: number, width = 0.5, gray = 0.75) {
    this.ops.push(`${num(gray)} G ${num(width)} w ${num(x1)} ${num(A4.h - y1)} m ${num(x2)} ${num(A4.h - y2)} l S`);
    return this;
  }

  /** To'ldirilgan to'rtburchak (y — yuqori chetidan) */
  rect(x: number, y: number, w: number, h: number, color: [number, number, number]) {
    this.ops.push(`${color.map(num).join(" ")} rg ${num(x)} ${num(A4.h - y - h)} ${num(w)} ${num(h)} re f`);
    return this;
  }

  get pageCount() {
    return this.pages.length + 1;
  }

  /** footer — har sahifa pastidagi yozuv, masalan (1, 3) => "1 / 3" */
  toBuffer(title = "Hisobot", footer?: (page: number, total: number) => string): Buffer {
    const pages = [...this.pages, this.ops.join("\n")].map((p, i, all) => {
      if (!footer) return p;
      const { bytes, width } = encode(footer(i + 1, all.length));
      return `${p}\nBT /F1 8 Tf 0.5 0.5 0.5 rg ${num(A4.w / 2 - ((width / 1000) * 8) / 2)} 24 Td (${esc(bytes)}) Tj ET`;
    });
    const objs: string[] = [];
    // 1 katalog, 2 sahifalar, 3-4 shriftlar, 5 ma'lumot, keyin har sahifa: sahifa + mazmun
    const pageIds = pages.map((_, i) => 6 + i * 2);
    objs[1] = `<< /Type /Catalog /Pages 2 0 R >>`;
    objs[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;
    objs[3] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`;
    objs[4] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`;
    objs[5] = `<< /Title (${esc(encode(title).bytes)}) /Producer (HanUstoz) >>`;
    pages.forEach((content, i) => {
      const id = pageIds[i];
      objs[id] =
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4.w} ${A4.h}] ` + `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${id + 1} 0 R >>`;
      objs[id + 1] = `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`;
    });
    let out = "%PDF-1.4\n%\xe2\xe3\xcf\xd3\n";
    const offsets: number[] = [];
    for (let id = 1; id < objs.length; id++) {
      offsets[id] = Buffer.byteLength(out, "latin1");
      out += `${id} 0 obj\n${objs[id]}\nendobj\n`;
    }
    const xref = Buffer.byteLength(out, "latin1");
    out += `xref\n0 ${objs.length}\n0000000000 65535 f \n`;
    for (let id = 1; id < objs.length; id++) out += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
    out += `trailer\n<< /Size ${objs.length} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return Buffer.from(out, "latin1");
  }
}
