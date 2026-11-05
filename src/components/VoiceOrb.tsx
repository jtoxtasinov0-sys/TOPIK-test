"use client";

import { useEffect, useRef } from "react";

// Ovozli ustozning kichik "shari" (sayt ranglarida: binafsha → ko'k).
// Ustoz gapirganda — rangli va ovoziga qarab tirik harakatlanadi;
// siz gapirganda — rangsiz (kulrang) bo'lib, faqat sezilar-sezilmas nafas oladi.

export type OrbMode = "idle" | "listen" | "think" | "speak";

type RGB = [number, number, number];

// [yorug' qism, o'rta, soya]
const BRAND: RGB[] = [
  [214, 190, 255],
  [139, 61, 255],
  [52, 26, 150],
];
const GREY: RGB[] = [
  [236, 237, 240],
  [160, 164, 172],
  [92, 96, 104],
];
// Shar ichida aylanadigan nurlar
const SWIRL: RGB[] = [
  [58, 134, 255],
  [214, 61, 255],
  [46, 222, 255],
];

const TAU = Math.PI * 2;
const mix = (a: RGB, b: RGB, k: number): RGB => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const rgba = (c: RGB, a: number) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

function render(ctx: CanvasRenderingContext2D, S: number, t: number, level: number, color: number, active: number) {
  ctx.clearRect(0, 0, S, S);
  const cx = S / 2;
  const cy = S / 2;
  const R = S * 0.34 * (1 + level * 0.18);
  const [c1, c2, c3] = [0, 1, 2].map((i) => mix(GREY[i], BRAND[i], color));

  // Gapirganda tashqi yumshoq nur va to'lqin halqasi
  if (active > 0.01) {
    const gr = Math.min(R * 1.45, S / 2 - 1);
    const glow = ctx.createRadialGradient(cx, cy, R * 0.8, cx, cy, gr);
    glow.addColorStop(0, rgba(c2, 0.35 * active * (0.4 + level)));
    glow.addColorStop(1, rgba(c2, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, gr, 0, TAU);
    ctx.fill();
  }

  // Shar tanasi
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.clip();
  const body = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.08, cx, cy, R * 1.05);
  body.addColorStop(0, rgba(c1, 1));
  body.addColorStop(0.55, rgba(c2, 1));
  body.addColorStop(1, rgba(c3, 1));
  ctx.fillStyle = body;
  ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

  // Ichki aylanuvchi nurlar — faqat rangli holatda
  if (color > 0.02) {
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < SWIRL.length; i++) {
      const a = t * (0.9 + i * 0.35) + (i * TAU) / 3;
      const d = R * (0.32 + 0.12 * Math.sin(t * 1.3 + i) + level * 0.18);
      const bx = cx + Math.cos(a) * d;
      const by = cy + Math.sin(a) * d * 0.85;
      const br = R * (0.55 + level * 0.3);
      const g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
      g.addColorStop(0, rgba(SWIRL[i], 0.55 * color * (0.45 + active * 0.55)));
      g.addColorStop(1, rgba(SWIRL[i], 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, TAU);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  }

  // Shisha yaltirashi (yuqori chap)
  const hx = cx - R * 0.32;
  const hy = cy - R * 0.42;
  const hl = ctx.createRadialGradient(hx, hy, 0, hx, hy, R * 0.55);
  hl.addColorStop(0, "rgba(255,255,255,0.75)");
  hl.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = hl;
  ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

  // Pastki ichki soya — hajm beradi
  const sh = ctx.createRadialGradient(cx, cy + R * 0.9, R * 0.2, cx, cy + R * 0.6, R * 1.1);
  sh.addColorStop(0, "rgba(10,5,40,0)");
  sh.addColorStop(1, "rgba(10,5,40,0.25)");
  ctx.fillStyle = sh;
  ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
  ctx.restore();
}

export function VoiceOrb({
  mode,
  getLevel,
  size = 44,
  onClick,
  label,
  disabled,
}: {
  mode: OrbMode;
  /** 0..1 — har kadrda so'raladi (React qayta chizmasdan) */
  getLevel: () => number;
  size?: number;
  onClick?: () => void;
  label: string;
  disabled?: boolean;
}) {
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
    const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 0.35 : 1;

    let level = 0;
    let color = 1;
    let active = 0;
    let t = 0;
    let last = performance.now();
    let id = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const { mode: m, getLevel: gl } = live.current;
      // Siz gapirayotganda shar rangsiz va deyarli harakatsiz; ustoz gapirganda — tirik
      let target = 0;
      if (m === "speak") target = Math.max(0, Math.min(1, gl()));
      else if (m === "listen") target = Math.max(0, Math.min(1, gl())) * 0.25;
      else if (m === "think") target = 0.12 + 0.08 * Math.sin(now / 260);
      level += (target - level) * (target > level ? 0.4 : 0.12);
      color += ((m === "listen" ? 0 : m === "idle" ? 0.85 : 1) - color) * 0.08;
      active += ((m === "speak" ? 1 : m === "think" ? 0.5 : 0) - active) * 0.08;
      t += dt * (m === "speak" ? 1.6 + level * 2.5 : m === "think" ? 2.2 : m === "idle" ? 0.5 : 0.3) * calm;
      render(ctx, size, t, level, color, active);
      id = requestAnimationFrame(frame);
    };
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [size]);

  const canvasEl = <canvas ref={canvas} style={{ width: size, height: size, display: "block" }} aria-hidden />;
  if (!onClick) return <span style={{ width: size, height: size, display: "inline-block", flexShrink: 0 }}>{canvasEl}</span>;
  return (
    <button type="button" className="orb" onClick={onClick} disabled={disabled} aria-label={label} style={{ width: size, height: size }}>
      {canvasEl}
    </button>
  );
}
