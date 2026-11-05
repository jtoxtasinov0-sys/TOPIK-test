import "server-only";
import { deflateSync, inflateSync } from "node:zlib";

// Kutubxonasiz PNG: o'qish (8-bit, interlace'siz), kichraytirish (maydon bo'yicha o'rtacha) va yozish.
// Gemini rasmlari ~1 MB keladi — telefon uchun 128–768 px gacha kichraytirib, 10–20 baravar yengil qilamiz.

export type Bitmap = { width: number; height: number; channels: 1 | 3 | 4; data: Uint8Array };

const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function paeth(a: number, b: number, c: number) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/** PNG → bitmap. Qo'llab-quvvatlanmaydigan turlar (16-bit, interlace) uchun null */
export function decodePng(buf: Uint8Array): Bitmap | null {
  const b = Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength);
  if (b.length < 33 || !b.subarray(0, 8).equals(SIG)) return null;
  let pos = 8;
  let width = 0;
  let height = 0;
  let depth = 0;
  let type = 0;
  let interlace = 0;
  let palette: Buffer | null = null;
  let trns: Buffer | null = null;
  const idat: Buffer[] = [];
  while (pos + 8 <= b.length) {
    const len = b.readUInt32BE(pos);
    const name = b.toString("ascii", pos + 4, pos + 8);
    const body = b.subarray(pos + 8, pos + 8 + len);
    pos += 12 + len;
    if (name === "IHDR") {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      depth = body[8];
      type = body[9];
      interlace = body[12];
    } else if (name === "PLTE") palette = body;
    else if (name === "tRNS") trns = body;
    else if (name === "IDAT") idat.push(body);
    else if (name === "IEND") break;
  }
  if (!width || !height || depth !== 8 || interlace !== 0 || width * height > 25_000_000) return null;
  const srcCh = ({ 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 } as Record<number, number>)[type];
  if (!srcCh || (type === 3 && !palette)) return null;

  let raw: Buffer;
  try {
    raw = inflateSync(Buffer.concat(idat));
  } catch {
    return null;
  }
  const stride = width * srcCh;
  if (raw.length < (stride + 1) * height) return null;
  const px = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)];
    const inOff = y * (stride + 1) + 1;
    const out = y * stride;
    for (let x = 0; x < stride; x++) {
      const v = raw[inOff + x];
      const a = x >= srcCh ? px[out + x - srcCh] : 0;
      const up = y ? px[out - stride + x] : 0;
      const c = y && x >= srcCh ? px[out - stride + x - srcCh] : 0;
      px[out + x] = (f === 0 ? v : f === 1 ? v + a : f === 2 ? v + up : f === 3 ? v + ((a + up) >> 1) : v + paeth(a, up, c)) & 0xff;
    }
  }

  // Natija: 1 (kulrang), 3 (RGB) yoki 4 (RGBA) kanal
  if (type === 0) return { width, height, channels: 1, data: px };
  if (type === 2) return { width, height, channels: 3, data: px };
  const n = width * height;
  const rgba = new Uint8Array(n * 4);
  for (let i = 0; i < n; i++) {
    if (type === 3) {
      const idx = px[i];
      rgba[i * 4] = palette![idx * 3];
      rgba[i * 4 + 1] = palette![idx * 3 + 1];
      rgba[i * 4 + 2] = palette![idx * 3 + 2];
      rgba[i * 4 + 3] = trns && idx < trns.length ? trns[idx] : 255;
    } else if (type === 4) {
      rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = px[i * 2];
      rgba[i * 4 + 3] = px[i * 2 + 1];
    } else {
      rgba.set(px.subarray(i * 4, i * 4 + 4), i * 4);
    }
  }
  return { width, height, channels: 4, data: rgba };
}

/** Bir o'q bo'yicha maydon (area) o'rtachasi bilan kichraytirish uchun og'irliklar */
function weights(src: number, dst: number) {
  const scale = src / dst;
  const out: { from: number; w: number[] }[] = [];
  for (let i = 0; i < dst; i++) {
    const start = i * scale;
    const end = start + scale;
    const from = Math.floor(start);
    const to = Math.min(src, Math.ceil(end));
    const w: number[] = [];
    for (let s = from; s < to; s++) w.push((Math.min(end, s + 1) - Math.max(start, s)) / scale);
    out.push({ from, w });
  }
  return out;
}

/** Kenglik bo'yicha kichraytirish (proporsiya saqlanadi). Kattalashtirilmaydi */
export function resizeBitmap(img: Bitmap, width: number): Bitmap {
  if (width >= img.width) return img;
  const height = Math.max(1, Math.round((img.height * width) / img.width));
  const ch = img.channels;
  const wx = weights(img.width, width);
  const wy = weights(img.height, height);
  const tmp = new Float32Array(width * img.height * ch);
  for (let y = 0; y < img.height; y++) {
    const row = y * img.width * ch;
    for (let x = 0; x < width; x++) {
      const { from, w } = wx[x];
      for (let c = 0; c < ch; c++) {
        let s = 0;
        for (let k = 0; k < w.length; k++) s += img.data[row + (from + k) * ch + c] * w[k];
        tmp[(y * width + x) * ch + c] = s;
      }
    }
  }
  const data = new Uint8Array(width * height * ch);
  for (let y = 0; y < height; y++) {
    const { from, w } = wy[y];
    for (let x = 0; x < width; x++) {
      for (let c = 0; c < ch; c++) {
        let s = 0;
        for (let k = 0; k < w.length; k++) s += tmp[((from + k) * width + x) * ch + c] * w[k];
        data[(y * width + x) * ch + c] = Math.max(0, Math.min(255, Math.round(s)));
      }
    }
  }
  return { width, height, channels: ch, data };
}

/** Rangli, lekin aslida oq-qora rasm bo'lsa — bitta kanalga o'tkazish (PNG 3 baravar yengil) */
export function toGrayIfPossible(img: Bitmap, tolerance = 3): Bitmap {
  if (img.channels !== 3) return img;
  const n = img.width * img.height;
  const d = img.data;
  for (let i = 0; i < n; i++) {
    const r = d[i * 3];
    const g = d[i * 3 + 1];
    const b = d[i * 3 + 2];
    if (Math.abs(r - g) > tolerance || Math.abs(g - b) > tolerance || Math.abs(r - b) > tolerance) return img;
  }
  const gray = new Uint8Array(n);
  for (let i = 0; i < n; i++) gray[i] = Math.round((d[i * 3] + d[i * 3 + 1] + d[i * 3 + 2]) / 3);
  return { width: img.width, height: img.height, channels: 1, data: gray };
}

function chunk(name: string, body: Uint8Array) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(body.length, 0);
  head.write(name, 4, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])), 0);
  return Buffer.concat([head, body, crc]);
}

/** Bitmap → PNG (har qator uchun eng yaxshi filtr tanlanadi) */
export function encodePng(img: Bitmap): Buffer {
  const { width, height, channels: ch, data } = img;
  const stride = width * ch;
  const out = Buffer.alloc((stride + 1) * height);
  const cand = Array.from({ length: 5 }, () => Buffer.alloc(stride));
  for (let y = 0; y < height; y++) {
    const row = y * stride;
    let best = 0;
    let bestSum = Infinity;
    for (let f = 0; f < 5; f++) {
      const line = cand[f];
      let sum = 0;
      for (let x = 0; x < stride; x++) {
        const v = data[row + x];
        const a = x >= ch ? data[row + x - ch] : 0;
        const up = y ? data[row - stride + x] : 0;
        const c = y && x >= ch ? data[row - stride + x - ch] : 0;
        const p = f === 0 ? v : f === 1 ? v - a : f === 2 ? v - up : f === 3 ? v - ((a + up) >> 1) : v - paeth(a, up, c);
        const byte = p & 0xff;
        line[x] = byte;
        sum += byte < 128 ? byte : 256 - byte;
      }
      if (sum < bestSum) {
        bestSum = sum;
        best = f;
      }
    }
    out[y * (stride + 1)] = best;
    cand[best].copy(out, y * (stride + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = ch === 1 ? 0 : ch === 3 ? 2 : 6;
  return Buffer.concat([SIG, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(out, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

/** PNG ni berilgan kenglikka kichraytirish. PNG bo'lmasa yoki o'qib bo'lmasa — null */
export function shrinkPng(buf: Uint8Array, width: number): Buffer | null {
  const img = decodePng(buf);
  if (!img) return null;
  return encodePng(toGrayIfPossible(resizeBitmap(img, width)));
}
