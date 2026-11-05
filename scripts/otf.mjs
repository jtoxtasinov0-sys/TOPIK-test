// Kichik OTF (CFF) o'quvchi: shrift faylidan matnni SVG yo'llariga (path) aylantiradi.
// Logo yozuvi shriftga bog'liq bo'lmasin — har qanday dastur va kompyuterda bir xil ko'rinsin.
// Qo'llab-quvvatlanadi: cmap (format 4), hmtx, CFF Type 2 charstring (subr, hint, flex). Kerning qo'llanmaydi.

import { readFileSync } from "node:fs";

function tables(buf) {
  const n = buf.readUInt16BE(4);
  const out = {};
  for (let i = 0; i < n; i++) {
    const o = 12 + i * 16;
    out[buf.toString("ascii", o, o + 4)] = { offset: buf.readUInt32BE(o + 8), length: buf.readUInt32BE(o + 12) };
  }
  return out;
}

function readIndex(buf, pos) {
  const count = buf.readUInt16BE(pos);
  if (count === 0) return { items: [], end: pos + 2 };
  const offSize = buf[pos + 2];
  const off = (i) => {
    let v = 0;
    for (let k = 0; k < offSize; k++) v = v * 256 + buf[pos + 3 + i * offSize + k];
    return v;
  };
  const dataStart = pos + 3 + (count + 1) * offSize - 1;
  const items = [];
  for (let i = 0; i < count; i++) items.push(buf.subarray(dataStart + off(i), dataStart + off(i + 1)));
  return { items, end: dataStart + off(count) };
}

function readDict(data) {
  const dict = {};
  let ops = [];
  let i = 0;
  while (i < data.length) {
    const b0 = data[i];
    if (b0 <= 21) {
      let key = b0;
      i++;
      if (b0 === 12) key = 1200 + data[i++];
      dict[key] = ops;
      ops = [];
    } else if (b0 === 28) {
      ops.push(data.readInt16BE(i + 1));
      i += 3;
    } else if (b0 === 29) {
      ops.push(data.readInt32BE(i + 1));
      i += 5;
    } else if (b0 === 30) {
      // haqiqiy son (nibble) — bizga kerak emas, o'tkazib yuboramiz
      i++;
      while (i < data.length) {
        const b = data[i++];
        if ((b & 0x0f) === 0x0f || (b >> 4) === 0x0f) break;
      }
      ops.push(0);
    } else if (b0 >= 32 && b0 <= 246) {
      ops.push(b0 - 139);
      i++;
    } else if (b0 >= 247 && b0 <= 250) {
      ops.push((b0 - 247) * 256 + data[i + 1] + 108);
      i += 2;
    } else if (b0 >= 251 && b0 <= 254) {
      ops.push(-(b0 - 251) * 256 - data[i + 1] - 108);
      i += 2;
    } else i++;
  }
  return dict;
}

const bias = (n) => (n < 1240 ? 107 : n < 33900 ? 1131 : 32768);

/** Type 2 charstring → yo'l buyruqlari (shrift birliklarida, y yuqoriga) */
function charstringPath(code, gsubrs, lsubrs) {
  const cmds = [];
  const stack = [];
  let x = 0;
  let y = 0;
  let nStems = 0;
  let haveWidth = false;
  let open = false;
  const gb = bias(gsubrs.length);
  const lb = bias(lsubrs.length);
  const move = (dx, dy) => {
    if (open) cmds.push(["Z"]);
    x += dx;
    y += dy;
    cmds.push(["M", x, y]);
    open = true;
  };
  const line = (dx, dy) => {
    x += dx;
    y += dy;
    cmds.push(["L", x, y]);
  };
  const curve = (a, b, c, d, e, f) => {
    const x1 = x + a, y1 = y + b, x2 = x1 + c, y2 = y1 + d;
    x = x2 + e;
    y = y2 + f;
    cmds.push(["C", x1, y1, x2, y2, x, y]);
  };
  const stems = () => {
    if (stack.length % 2 && !haveWidth) stack.shift();
    haveWidth = true;
    nStems += stack.length >> 1;
    stack.length = 0;
  };

  const run = (cs) => {
    let i = 0;
    while (i < cs.length) {
      const b0 = cs[i];
      if (b0 >= 32 || b0 === 28) {
        if (b0 === 28) {
          stack.push(cs.readInt16BE(i + 1));
          i += 3;
        } else if (b0 <= 246) {
          stack.push(b0 - 139);
          i++;
        } else if (b0 <= 250) {
          stack.push((b0 - 247) * 256 + cs[i + 1] + 108);
          i += 2;
        } else if (b0 <= 254) {
          stack.push(-(b0 - 251) * 256 - cs[i + 1] - 108);
          i += 2;
        } else {
          stack.push(cs.readInt32BE(i + 1) / 65536);
          i += 5;
        }
        continue;
      }
      i++;
      switch (b0) {
        case 1: case 3: case 18: case 23:
          stems();
          break;
        case 19: case 20:
          stems();
          i += (nStems + 7) >> 3;
          break;
        case 21:
          if (stack.length > 2 && !haveWidth) stack.shift();
          haveWidth = true;
          move(stack[0], stack[1]);
          stack.length = 0;
          break;
        case 22:
          if (stack.length > 1 && !haveWidth) stack.shift();
          haveWidth = true;
          move(stack[0], 0);
          stack.length = 0;
          break;
        case 4:
          if (stack.length > 1 && !haveWidth) stack.shift();
          haveWidth = true;
          move(0, stack[0]);
          stack.length = 0;
          break;
        case 5:
          for (let k = 0; k + 1 < stack.length; k += 2) line(stack[k], stack[k + 1]);
          stack.length = 0;
          break;
        case 6: case 7: {
          let horiz = b0 === 6;
          for (const v of stack) {
            horiz ? line(v, 0) : line(0, v);
            horiz = !horiz;
          }
          stack.length = 0;
          break;
        }
        case 8:
          for (let k = 0; k + 5 < stack.length; k += 6) curve(...stack.slice(k, k + 6));
          stack.length = 0;
          break;
        case 24: {
          let k = 0;
          for (; k + 6 < stack.length - 1; k += 6) curve(...stack.slice(k, k + 6));
          line(stack[k], stack[k + 1]);
          stack.length = 0;
          break;
        }
        case 25: {
          let k = 0;
          for (; k + 2 <= stack.length - 6; k += 2) line(stack[k], stack[k + 1]);
          curve(...stack.slice(k, k + 6));
          stack.length = 0;
          break;
        }
        case 26: {
          let k = 0;
          let dx1 = 0;
          if (stack.length % 2) dx1 = stack[k++];
          for (; k + 3 < stack.length; k += 4) {
            curve(dx1, stack[k], stack[k + 1], stack[k + 2], 0, stack[k + 3]);
            dx1 = 0;
          }
          stack.length = 0;
          break;
        }
        case 27: {
          let k = 0;
          let dy1 = 0;
          if (stack.length % 2) dy1 = stack[k++];
          for (; k + 3 < stack.length; k += 4) {
            curve(stack[k], dy1, stack[k + 1], stack[k + 2], stack[k + 3], 0);
            dy1 = 0;
          }
          stack.length = 0;
          break;
        }
        case 30: case 31: {
          let vert = b0 === 30;
          let k = 0;
          while (k + 3 < stack.length) {
            const last = stack.length - k === 5;
            const f = last ? stack[k + 4] : 0;
            if (vert) curve(0, stack[k], stack[k + 1], stack[k + 2], stack[k + 3], f);
            else curve(stack[k], 0, stack[k + 1], stack[k + 2], f, stack[k + 3]);
            k += last ? 5 : 4;
            vert = !vert;
          }
          stack.length = 0;
          break;
        }
        case 10: {
          const idx = stack.pop() + lb;
          run(lsubrs[idx]);
          break;
        }
        case 29: {
          const idx = stack.pop() + gb;
          run(gsubrs[idx]);
          break;
        }
        case 11:
          return;
        case 14:
          if (stack.length && !haveWidth) stack.shift();
          haveWidth = true;
          stack.length = 0;
          if (open) cmds.push(["Z"]);
          open = false;
          return;
        case 12: {
          const op = cs[i++];
          const s = stack.slice();
          stack.length = 0;
          if (op === 35) {
            curve(...s.slice(0, 6));
            curve(...s.slice(6, 12));
          } else if (op === 34) {
            curve(s[0], 0, s[1], s[2], s[3], 0);
            curve(s[4], 0, s[5], -s[2], s[6], 0);
          } else if (op === 36) {
            curve(s[0], s[1], s[2], s[3], s[4], 0);
            curve(s[5], 0, s[6], s[7], s[8], -(s[1] + s[3] + s[7]));
          } else if (op === 37) {
            const sx = s[0] + s[2] + s[4] + s[6] + s[8];
            const sy = s[1] + s[3] + s[5] + s[7] + s[9];
            curve(...s.slice(0, 6));
            if (Math.abs(sx) > Math.abs(sy)) curve(s[6], s[7], s[8], s[9], s[10], -sy);
            else curve(s[6], s[7], s[8], s[9], -sx, s[10]);
          }
          break;
        }
        default:
          stack.length = 0;
      }
    }
  };
  run(code);
  if (open) cmds.push(["Z"]);
  return cmds;
}

export function loadFont(file) {
  const buf = readFileSync(file);
  const t = tables(buf);
  const unitsPerEm = buf.readUInt16BE(t.head.offset + 18);
  const ascender = buf.readInt16BE(t.hhea.offset + 4);
  const nMetrics = buf.readUInt16BE(t.hhea.offset + 34);
  const advance = (gid) => buf.readUInt16BE(t.hmtx.offset + Math.min(gid, nMetrics - 1) * 4);

  // cmap format 4 (Unicode BMP)
  const cm = t.cmap.offset;
  let sub = -1;
  for (let i = 0; i < buf.readUInt16BE(cm + 2); i++) {
    const p = buf.readUInt16BE(cm + 4 + i * 8);
    const e = buf.readUInt16BE(cm + 6 + i * 8);
    const off = cm + buf.readUInt32BE(cm + 8 + i * 8);
    if (buf.readUInt16BE(off) === 4 && ((p === 3 && e === 1) || p === 0)) sub = off;
  }
  if (sub < 0) throw new Error("cmap format 4 topilmadi");
  const segX2 = buf.readUInt16BE(sub + 6);
  const ends = sub + 14;
  const starts = ends + segX2 + 2;
  const deltas = starts + segX2;
  const ranges = deltas + segX2;
  const glyphId = (code) => {
    for (let i = 0; i < segX2 / 2; i++) {
      const end = buf.readUInt16BE(ends + i * 2);
      if (code > end) continue;
      const start = buf.readUInt16BE(starts + i * 2);
      if (code < start) return 0;
      const delta = buf.readInt16BE(deltas + i * 2);
      const ro = buf.readUInt16BE(ranges + i * 2);
      if (!ro) return (code + delta) & 0xffff;
      const g = buf.readUInt16BE(ranges + i * 2 + ro + (code - start) * 2);
      return g ? (g + delta) & 0xffff : 0;
    }
    return 0;
  };

  // CFF
  const c = t["CFF "].offset;
  const cff = buf.subarray(c);
  const name = readIndex(cff, cff[2]);
  const top = readIndex(cff, name.end);
  const strings = readIndex(cff, top.end);
  const gsubrs = readIndex(cff, strings.end).items;
  const td = readDict(top.items[0]);
  const charstrings = readIndex(cff, td[17][0]).items;
  const [privSize, privOff] = td[18];
  const pd = readDict(cff.subarray(privOff, privOff + privSize));
  const lsubrs = pd[19] ? readIndex(cff, privOff + pd[19][0]).items : [];

  return { unitsPerEm, ascender, glyphId, advance, glyph: (gid) => charstringPath(charstrings[gid], gsubrs, lsubrs) };
}

/**
 * Matnni SVG path'ga aylantirish. size — shrift o'lchami (px), tracking — harflar orasidagi qo'shimcha joy (em ulushida).
 * Natija: { d, width, ascent } — d koordinatalari: x 0 dan, y = 0 asosiy chiziq (baseline).
 */
export function textPath(font, text, { size = 100, tracking = 0 } = {}) {
  const k = size / font.unitsPerEm;
  let pen = 0;
  const parts = [];
  const chars = [...text];
  chars.forEach((ch, idx) => {
    const gid = font.glyphId(ch.codePointAt(0));
    for (const cmd of font.glyph(gid)) {
      if (cmd[0] === "Z") parts.push("Z");
      else {
        const pts = [];
        for (let j = 1; j < cmd.length; j += 2) pts.push(`${(pen + cmd[j] * k).toFixed(2)} ${(-cmd[j + 1] * k).toFixed(2)}`);
        parts.push(cmd[0] + pts.join(" "));
      }
    }
    pen += font.advance(gid) * k + (idx < chars.length - 1 ? tracking * size : 0);
  });
  return { d: parts.join(""), width: pen, ascent: font.ascender * k };
}
