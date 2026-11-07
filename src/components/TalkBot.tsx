"use client";

import { useEffect, useRef } from "react";
import type { OrbMode } from "./VoiceOrb";

// Erkin suhbatdagi «robot do'st»: kichkina, mehribon robot boshi (sayt ranglarida: binafsha → ko'k).
// - gapirganda: og'zi ovoz balandligiga qarab ochilib-yopiladi, antenna yonadi, yonidan ovoz to'lqinlari tarqaladi,
//   boshi ovozga mos sal tebranadi, yonoqlari qizaradi;
// - o'ylayotganda: ko'zlari atrofga qaraydi, og'zida uchta nuqta sakraydi, antenna miltillaydi;
// - kutayotganda: nafas oladi va vaqti-vaqti bilan ko'zini pirpiratadi (jilmaygan og'iz).
// Hammasi bitta canvas'da, React qayta chizmasdan (requestAnimationFrame) — telefonda ham yengil.

const TAU = Math.PI * 2;

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const k = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.arcTo(x + w, y, x + w, y + h, k);
  ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k);
  ctx.arcTo(x, y, x + w, y, k);
  ctx.closePath();
}

type State = { t: number; level: number; speak: number; think: number; blink: number; nextBlink: number; lookX: number; lookY: number };

function draw(ctx: CanvasRenderingContext2D, S: number, s: State) {
  ctx.clearRect(0, 0, S, S);
  const { t, level, speak, think } = s;
  const cx = S / 2;
  // Nafas olish / gapirganda tebranish
  const bob = Math.sin(t * 2.1) * S * 0.012 + speak * level * S * 0.02 * Math.sin(t * 9);
  const tilt = speak * level * 0.05 * Math.sin(t * 5.3) + think * 0.06 * Math.sin(t * 1.4);
  const hw = S * 0.62;
  const hh = S * 0.5;
  const hx = cx - hw / 2;
  const hy = S * 0.36 + bob;

  // Orqa nur
  const glowA = 0.18 + speak * (0.25 + level * 0.45) + think * 0.12;
  const glow = ctx.createRadialGradient(cx, hy + hh / 2, hw * 0.3, cx, hy + hh / 2, S * 0.55);
  glow.addColorStop(0, `rgba(139,61,255,${glowA})`);
  glow.addColorStop(1, "rgba(139,61,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, S, S);

  // Ovoz to'lqinlari (ikki yonida)
  if (speak > 0.02) {
    ctx.lineCap = "round";
    for (let i = 0; i < 3; i++) {
      const ph = (t * 1.6 + i / 3) % 1;
      const a = speak * (0.25 + level * 0.9) * (1 - ph);
      if (a < 0.02) continue;
      const r = hw * 0.55 + ph * S * 0.16;
      ctx.lineWidth = Math.max(1, S * 0.025);
      ctx.strokeStyle = `rgba(46,222,255,${Math.min(0.9, a)})`;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        const a0 = side < 0 ? Math.PI - 0.5 : -0.5;
        ctx.arc(cx, hy + hh / 2, r, a0, a0 + 1);
        ctx.stroke();
      }
    }
  }

  ctx.save();
  ctx.translate(cx, hy + hh / 2);
  ctx.rotate(tilt);
  ctx.translate(-cx, -(hy + hh / 2));

  // Antenna
  const ax = cx;
  const atop = hy - S * 0.16;
  ctx.strokeStyle = "#6f5bd6";
  ctx.lineWidth = Math.max(1.2, S * 0.035);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(ax, hy + 1);
  ctx.lineTo(ax, atop);
  ctx.stroke();
  const blinkOn = think > 0.5 ? (Math.sin(t * 9) > 0 ? 1 : 0.35) : 1;
  const bulb = Math.min(1, 0.35 + speak * (0.4 + level) + think * 0.4) * blinkOn;
  const br = S * 0.055 * (1 + speak * level * 0.35);
  const bg = ctx.createRadialGradient(ax, atop, 0, ax, atop, br * 3);
  bg.addColorStop(0, `rgba(46,222,255,${0.7 * bulb})`);
  bg.addColorStop(1, "rgba(46,222,255,0)");
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(ax, atop, br * 3, 0, TAU);
  ctx.fill();
  ctx.fillStyle = bulb > 0.6 ? "#bff6ff" : "#8fd8ff";
  ctx.beginPath();
  ctx.arc(ax, atop, br, 0, TAU);
  ctx.fill();

  // Quloqlar
  const ew = S * 0.07;
  const eh = hh * 0.42;
  ctx.fillStyle = "#4a2fc4";
  rr(ctx, hx - ew * 0.75, hy + hh * 0.3, ew, eh, ew / 2);
  ctx.fill();
  rr(ctx, hx + hw - ew * 0.25, hy + hh * 0.3, ew, eh, ew / 2);
  ctx.fill();

  // Bosh
  const head = ctx.createLinearGradient(hx, hy, hx + hw, hy + hh);
  head.addColorStop(0, "#a05bff");
  head.addColorStop(0.55, "#7b3dff");
  head.addColorStop(1, "#3a86ff");
  ctx.fillStyle = head;
  rr(ctx, hx, hy, hw, hh, S * 0.15);
  ctx.fill();
  // Yaltirash
  const shine = ctx.createLinearGradient(hx, hy, hx, hy + hh * 0.5);
  shine.addColorStop(0, "rgba(255,255,255,0.35)");
  shine.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = shine;
  rr(ctx, hx + hw * 0.08, hy + hh * 0.05, hw * 0.84, hh * 0.4, S * 0.1);
  ctx.fill();

  // Yuz ekrani
  const fx = hx + hw * 0.12;
  const fy = hy + hh * 0.17;
  const fw = hw * 0.76;
  const fh = hh * 0.68;
  ctx.fillStyle = "#170d47";
  rr(ctx, fx, fy, fw, fh, S * 0.1);
  ctx.fill();

  // Ko'zlar
  const eyeY = fy + fh * 0.36 + s.lookY * fh * 0.08;
  const eyeDX = fw * 0.22;
  const eyeW = fw * 0.15;
  const open = Math.max(0.12, 1 - s.blink);
  const happy = speak * 0.25;
  const eyeH = fh * 0.26 * open * (1 - happy);
  ctx.fillStyle = "#5ff2ff";
  ctx.shadowColor = "rgba(46,222,255,0.9)";
  ctx.shadowBlur = S * 0.06;
  for (const side of [-1, 1]) {
    const ex = cx + side * eyeDX + s.lookX * fw * 0.06 - eyeW / 2;
    rr(ctx, ex, eyeY - eyeH / 2, eyeW, Math.max(1.5, eyeH), eyeW / 2);
    ctx.fill();
  }

  // Og'iz
  const my = fy + fh * 0.72;
  if (think > 0.5) {
    // O'ylayapti: uchta sakrovchi nuqta
    for (let i = 0; i < 3; i++) {
      const dy = Math.max(0, Math.sin(t * 7 - i * 0.9)) * fh * 0.08;
      ctx.beginPath();
      ctx.arc(cx + (i - 1) * fw * 0.13, my - dy, Math.max(1.2, S * 0.022), 0, TAU);
      ctx.fill();
    }
  } else {
    const mouthOpen = speak * Math.min(1, level * 1.4);
    if (mouthOpen > 0.06) {
      const mw = fw * (0.26 + mouthOpen * 0.12);
      const mh = fh * (0.06 + mouthOpen * 0.22);
      rr(ctx, cx - mw / 2, my - mh / 2, mw, mh, Math.min(mw, mh) / 2);
      ctx.fill();
    } else {
      // Jilmayish
      ctx.strokeStyle = "#5ff2ff";
      ctx.lineWidth = Math.max(1.2, S * 0.03);
      ctx.beginPath();
      ctx.arc(cx, my - fh * 0.1, fw * 0.14, 0.25 * Math.PI, 0.75 * Math.PI);
      ctx.stroke();
    }
  }
  ctx.shadowBlur = 0;

  // Yonoqlar
  const blush = 0.15 + speak * 0.3;
  ctx.fillStyle = `rgba(255,120,190,${blush})`;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + side * fw * 0.36, my - fh * 0.04, fw * 0.07, fh * 0.05, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

export function TalkBot({ mode, getLevel, size = 56 }: { mode: OrbMode; /** 0..1 — har kadrda so'raladi */ getLevel: () => number; size?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef({ mode, getLevel });
  useEffect(() => {
    live.current = { mode, getLevel };
  });

  useEffect(() => {
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    c.width = Math.round(size * dpr);
    c.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 0.4 : 1;
    const s: State = { t: 0, level: 0, speak: 0, think: 0, blink: 0, nextBlink: 1.5, lookX: 0, lookY: 0 };
    let last = performance.now();
    let id = 0;
    let blinkT = -1;
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const { mode: m, getLevel: gl } = live.current;
      let target = 0;
      try {
        target = m === "speak" ? Math.max(0, Math.min(1, gl())) : 0;
      } catch {}
      s.level += (target - s.level) * (target > s.level ? 0.55 : 0.25);
      s.speak += ((m === "speak" ? 1 : 0) - s.speak) * 0.12;
      s.think += ((m === "think" ? 1 : 0) - s.think) * 0.12;
      s.t += dt * calm;
      // Pirpiratish: 2–5 soniyada bir marta
      s.nextBlink -= dt;
      if (s.nextBlink <= 0 && blinkT < 0) {
        blinkT = 0;
        s.nextBlink = 2 + Math.random() * 3;
      }
      if (blinkT >= 0) {
        blinkT += dt;
        s.blink = Math.sin(Math.min(1, blinkT / 0.16) * Math.PI);
        if (blinkT > 0.16) {
          blinkT = -1;
          s.blink = 0;
        }
      }
      // O'ylayotganda ko'zlar atrofga qaraydi; boshqa paytda — sal-pal
      const lx = s.think > 0.5 ? Math.sin(s.t * 1.7) : Math.sin(s.t * 0.6) * 0.3;
      const ly = s.think > 0.5 ? -0.6 + Math.sin(s.t * 1.1) * 0.3 : 0;
      s.lookX += (lx - s.lookX) * 0.1;
      s.lookY += (ly - s.lookY) * 0.1;
      draw(ctx, size, s);
      id = requestAnimationFrame(frame);
    };
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [size]);

  return <canvas ref={canvas} className="talkbot" style={{ width: size, height: size }} aria-hidden />;
}
