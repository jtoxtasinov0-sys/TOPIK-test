import "server-only";
import type { Bitmap } from "./png";

// Kutubxonasiz JPEG yozuvchi (baseline, JFIF): telefon uchun kichik nusxalar. Gemini rasmlari (3D ikonkalar)
// PNG'da 128 px da ham o'nlab KB — JPEG'da bir necha KB. Rangli rasm 4:2:0 (rang ikki baravar kichik), kulrang — bitta kanal.
// Jadvallar — JPEG standarti (ITU T.81, K ilova).

const ZIGZAG = [
  0, 1, 8, 16, 9, 2, 3, 10, 17, 24, 32, 25, 18, 11, 4, 5, 12, 19, 26, 33, 40, 48, 41, 34, 27, 20, 13, 6, 7, 14, 21, 28, 35, 42, 49, 56, 57, 50, 43, 36, 29, 22,
  15, 23, 30, 37, 44, 51, 58, 59, 52, 45, 38, 31, 39, 46, 53, 60, 61, 54, 47, 55, 62, 63,
];

const Q_LUMA = [
  16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55, 14, 13, 16, 24, 40, 57, 69, 56, 14, 17, 22, 29, 51, 87, 80, 62, 18, 22, 37, 56, 68, 109, 103, 77,
  24, 35, 55, 64, 81, 104, 113, 92, 49, 64, 78, 87, 103, 121, 120, 101, 72, 92, 95, 98, 112, 100, 103, 99,
];
const Q_CHROMA = [
  17, 18, 24, 47, 99, 99, 99, 99, 18, 21, 26, 66, 99, 99, 99, 99, 24, 26, 56, 99, 99, 99, 99, 99, 47, 66, 99, 99, 99, 99, 99, 99, ...Array<number>(32).fill(99),
];

// Huffman jadvallari: [har uzunlikdagi kodlar soni (1..16), belgilar]
const DC_LUMA: [number[], number[]] = [[0, 1, 5, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]];
const DC_CHROMA: [number[], number[]] = [[0, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]];
export const AC_LUMA: [number[], number[]] = [
  [0, 2, 1, 3, 3, 2, 4, 3, 5, 5, 4, 4, 0, 0, 1, 0x7d],
  [
    0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06, 0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xa1, 0x08, 0x23, 0x42, 0xb1,
    0xc1, 0x15, 0x52, 0xd1, 0xf0, 0x24, 0x33, 0x62, 0x72, 0x82, 0x09, 0x0a, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2a, 0x34, 0x35, 0x36, 0x37,
    0x38, 0x39, 0x3a, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a,
    0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7a, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3,
    0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6, 0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9, 0xca, 0xd2, 0xd3,
    0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe1, 0xe2, 0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa,
  ],
];
export const AC_CHROMA: [number[], number[]] = [
  [0, 2, 1, 2, 4, 4, 3, 4, 7, 5, 4, 4, 0, 1, 2, 0x77],
  [
    0x00, 0x01, 0x02, 0x03, 0x11, 0x04, 0x05, 0x21, 0x31, 0x06, 0x12, 0x41, 0x51, 0x07, 0x61, 0x71, 0x13, 0x22, 0x32, 0x81, 0x08, 0x14, 0x42, 0x91, 0xa1, 0xb1, 0xc1,
    0x09, 0x23, 0x33, 0x52, 0xf0, 0x15, 0x62, 0x72, 0xd1, 0x0a, 0x16, 0x24, 0x34, 0xe1, 0x25, 0xf1, 0x17, 0x18, 0x19, 0x1a, 0x26, 0x27, 0x28, 0x29, 0x2a, 0x35, 0x36,
    0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69,
    0x6a, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7a, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a,
    0xa2, 0xa3, 0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6, 0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9, 0xca,
    0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe2, 0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa,
  ],
];

type Codes = { code: Uint16Array; len: Uint8Array };

/** Kanonik Huffman kodlari: belgi → (kod, uzunlik) */
function huffman([counts, symbols]: [number[], number[]]): Codes {
  const code = new Uint16Array(256);
  const len = new Uint8Array(256);
  let c = 0;
  let k = 0;
  for (let l = 1; l <= 16; l++) {
    for (let i = 0; i < counts[l - 1]; i++) {
      code[symbols[k]] = c++;
      len[symbols[k++]] = l;
    }
    c <<= 1;
  }
  return { code, len };
}

const H = { dcY: huffman(DC_LUMA), acY: huffman(AC_LUMA), dcC: huffman(DC_CHROMA), acC: huffman(AC_CHROMA) };

/** Sifat (1..100) bo'yicha kvantlash jadvali (IJG formulasi), tabiiy tartibda */
function quantTable(base: number[], quality: number) {
  const q = Math.max(1, Math.min(100, Math.round(quality)));
  const scale = q < 50 ? 5000 / q : 200 - q * 2;
  return base.map((v) => Math.max(1, Math.min(255, Math.floor((v * scale + 50) / 100))));
}

// AAN DCT masshtablari — kvantlash bilan birlashtiriladi
const AAN = [1, 1.387039845, 1.306562965, 1.175875602, 1, 0.785694958, 0.5411961, 0.275899379];
const divisors = (t: number[]) => Float64Array.from(t, (v, i) => 1 / (v * AAN[i >> 3] * AAN[i & 7] * 8));

/** 8×8 blok: oldinga DCT (AAN, joyida) va kvantlash → zigzag tartibidagi butun sonlar */
function fdctQuant(d: Float64Array, div: Float64Array, out: Int32Array) {
  for (let pass = 0; pass < 2; pass++) {
    const step = pass ? 8 : 1; // 1-o'tish: qatorlar, 2-o'tish: ustunlar
    const next = pass ? 1 : 8;
    for (let r = 0; r < 8; r++) {
      const o = r * next;
      const d0 = d[o], d1 = d[o + step], d2 = d[o + 2 * step], d3 = d[o + 3 * step];
      const d4 = d[o + 4 * step], d5 = d[o + 5 * step], d6 = d[o + 6 * step], d7 = d[o + 7 * step];
      const t0 = d0 + d7, t7 = d0 - d7, t1 = d1 + d6, t6 = d1 - d6, t2 = d2 + d5, t5 = d2 - d5, t3 = d3 + d4, t4 = d3 - d4;
      let t10 = t0 + t3;
      const t13 = t0 - t3;
      let t11 = t1 + t2;
      let t12 = t1 - t2;
      d[o] = t10 + t11;
      d[o + 4 * step] = t10 - t11;
      const z1 = (t12 + t13) * 0.707106781;
      d[o + 2 * step] = t13 + z1;
      d[o + 6 * step] = t13 - z1;
      t10 = t4 + t5;
      t11 = t5 + t6;
      t12 = t6 + t7;
      const z5 = (t10 - t12) * 0.382683433;
      const z2 = 0.5411961 * t10 + z5;
      const z4 = 1.306562965 * t12 + z5;
      const z3 = t11 * 0.707106781;
      const z11 = t7 + z3;
      const z13 = t7 - z3;
      d[o + 5 * step] = z13 + z2;
      d[o + 3 * step] = z13 - z2;
      d[o + step] = z11 + z4;
      d[o + 7 * step] = z11 - z4;
    }
  }
  for (let k = 0; k < 64; k++) out[k] = Math.round(d[ZIGZAG[k]] * div[ZIGZAG[k]]);
}

class BitWriter {
  private buf = Buffer.alloc(1 << 16);
  private pos = 0;
  private acc = 0;
  private n = 0;
  private byte(b: number) {
    if (this.pos + 2 > this.buf.length) {
      const bigger = Buffer.alloc(this.buf.length * 2);
      this.buf.copy(bigger);
      this.buf = bigger;
    }
    this.buf[this.pos++] = b;
    if (b === 0xff) this.buf[this.pos++] = 0; // bayt to'ldirish
  }
  bits(value: number, len: number) {
    for (let i = len - 1; i >= 0; i--) {
      this.acc = (this.acc << 1) | ((value >> i) & 1);
      if (++this.n === 8) {
        this.byte(this.acc);
        this.acc = 0;
        this.n = 0;
      }
    }
  }
  end() {
    if (this.n) this.bits(0xff, 8 - this.n); // oxirgi baytni 1 bitlar bilan to'ldirish
    return this.buf.subarray(0, this.pos);
  }
}

/** Blokni Huffman bilan yozish; qaytaradi — yangi DC qiymati (keyingi blok farq bilan yoziladi) */
function writeBlock(w: BitWriter, q: Int32Array, prevDc: number, dc: Codes, ac: Codes) {
  const put = (v: number) => {
    const a = Math.abs(v);
    const size = a ? 32 - Math.clz32(a) : 0;
    return { size, bits: v < 0 ? v + (1 << size) - 1 : v };
  };
  const diff = put(q[0] - prevDc);
  w.bits(dc.code[diff.size], dc.len[diff.size]);
  if (diff.size) w.bits(diff.bits, diff.size);
  let last = 63;
  while (last > 0 && q[last] === 0) last--;
  let run = 0;
  for (let k = 1; k <= last; k++) {
    if (q[k] === 0) {
      run++;
      continue;
    }
    while (run > 15) {
      w.bits(ac.code[0xf0], ac.len[0xf0]); // 16 ta nol
      run -= 16;
    }
    const v = put(q[k]);
    const sym = (run << 4) | v.size;
    w.bits(ac.code[sym], ac.len[sym]);
    w.bits(v.bits, v.size);
    run = 0;
  }
  if (last < 63) w.bits(ac.code[0], ac.len[0]); // blok oxiri
  return q[0];
}

function segment(marker: number, body: number[] | Buffer) {
  const head = Buffer.from([0xff, marker, (body.length + 2) >> 8, (body.length + 2) & 0xff]);
  return Buffer.concat([head, Buffer.from(body)]);
}

function dht(cls: number, id: number, [counts, symbols]: [number[], number[]]) {
  return [(cls << 4) | id, ...counts, ...symbols];
}

/** Bitmap (1 yoki 3 kanal; 4 kanalda alfa e'tiborsiz qoldiriladi) → JPEG */
export function encodeJpeg(img: Bitmap, quality = 82): Buffer {
  const { width, height, channels: ch, data } = img;
  const gray = ch === 1;
  const qY = quantTable(Q_LUMA, quality);
  const qC = quantTable(Q_CHROMA, quality);
  const divY = divisors(qY);
  const divC = divisors(qC);

  // Rang fazosi: Y, Cb, Cr (har biri −128..127 atrofida)
  const n = width * height;
  const Y = new Float64Array(n);
  const Cb = gray ? Y : new Float64Array(n);
  const Cr = gray ? Y : new Float64Array(n);
  for (let i = 0; i < n; i++) {
    if (gray) {
      Y[i] = data[i] - 128;
      continue;
    }
    const r = data[i * ch];
    const g = data[i * ch + 1];
    const b = data[i * ch + 2];
    Y[i] = 0.299 * r + 0.587 * g + 0.114 * b - 128;
    Cb[i] = -0.168735892 * r - 0.331264108 * g + 0.5 * b;
    Cr[i] = 0.5 * r - 0.418687589 * g - 0.081312411 * b;
  }
  const at = (plane: Float64Array, x: number, y: number) => plane[Math.min(y, height - 1) * width + Math.min(x, width - 1)];

  const w = new BitWriter();
  const blk = new Float64Array(64);
  const q = new Int32Array(64);
  let dcY = 0;
  let dcCb = 0;
  let dcCr = 0;
  const lumaBlock = (x0: number, y0: number) => {
    for (let i = 0; i < 64; i++) blk[i] = at(Y, x0 + (i & 7), y0 + (i >> 3));
    fdctQuant(blk, divY, q);
    dcY = writeBlock(w, q, dcY, H.dcY, H.acY);
  };
  // Rang: 2×2 piksel o'rtachasi (4:2:0)
  const chromaBlock = (plane: Float64Array, x0: number, y0: number, prev: number) => {
    for (let i = 0; i < 64; i++) {
      const x = x0 + (i & 7) * 2;
      const y = y0 + (i >> 3) * 2;
      blk[i] = (at(plane, x, y) + at(plane, x + 1, y) + at(plane, x, y + 1) + at(plane, x + 1, y + 1)) / 4;
    }
    fdctQuant(blk, divC, q);
    return writeBlock(w, q, prev, H.dcC, H.acC);
  };

  if (gray) {
    for (let y = 0; y < height; y += 8) for (let x = 0; x < width; x += 8) lumaBlock(x, y);
  } else {
    for (let y = 0; y < height; y += 16)
      for (let x = 0; x < width; x += 16) {
        lumaBlock(x, y);
        lumaBlock(x + 8, y);
        lumaBlock(x, y + 8);
        lumaBlock(x + 8, y + 8);
        dcCb = chromaBlock(Cb, x, y, dcCb);
        dcCr = chromaBlock(Cr, x, y, dcCr);
      }
  }
  const scan = w.end();

  const zz = (t: number[]) => ZIGZAG.map((i) => t[i]);
  const sof = gray
    ? [8, height >> 8, height & 0xff, width >> 8, width & 0xff, 1, 1, 0x11, 0]
    : [8, height >> 8, height & 0xff, width >> 8, width & 0xff, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1];
  const sos = gray ? [1, 1, 0x00, 0, 63, 0] : [3, 1, 0x00, 2, 0x11, 3, 0x11, 0, 63, 0];
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    segment(0xe0, [0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]), // JFIF
    segment(0xdb, [0, ...zz(qY), ...(gray ? [] : [1, ...zz(qC)])]),
    segment(0xc0, sof),
    segment(0xc4, [...dht(0, 0, DC_LUMA), ...dht(1, 0, AC_LUMA), ...(gray ? [] : [...dht(0, 1, DC_CHROMA), ...dht(1, 1, AC_CHROMA)])]),
    segment(0xda, sos),
    scan,
    Buffer.from([0xff, 0xd9]),
  ]);
}

/** JPEG o'lchami va kanallar soni (SOF segmentidan). JPEG bo'lmasa — null */
export function jpegInfo(buf: Uint8Array): { width: number; height: number; channels: number } | null {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let pos = 2;
  while (pos + 4 <= buf.length) {
    if (buf[pos] !== 0xff) return null;
    const marker = buf[pos + 1];
    const len = (buf[pos + 2] << 8) | buf[pos + 3];
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: (buf[pos + 5] << 8) | buf[pos + 6], width: (buf[pos + 7] << 8) | buf[pos + 8], channels: buf[pos + 9] };
    }
    pos += 2 + len;
  }
  return null;
}
