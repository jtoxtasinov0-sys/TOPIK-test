"use client";

import { useEffect, useRef } from "react";

// Ovozli ustozning "jonli shari": bir-biriga quyilib aylanadigan rangli nur dog'lari.
// Tinglayotganda — sizning ovozingizga, gapirayotganda — ustoz ovoziga qarab kattalashib-kichrayadi.

export type OrbMode = "idle" | "listen" | "think" | "speak";

type RGB = [number, number, number];

// Siri uslubidagi ranglar: pushti, moviy (cyan), yashil va binafsha — holatga qarab urg'u o'zgaradi
const PINK: RGB = [255, 62, 132];
const CYAN: RGB = [46, 222, 255];
const GREEN: RGB = [52, 232, 158];
const VIOLET: RGB = [150, 84, 255];
const MAGENTA: RGB = [226, 72, 255];

const PALETTES: Record<OrbMode, RGB[]> = {
  idle: [VIOLET, CYAN, PINK, GREEN],
  listen: [PINK, MAGENTA, CYAN, GREEN],
  think: [VIOLET, CYAN, MAGENTA, GREEN],
  speak: [CYAN, GREEN, PINK, VIOLET],
};

const TAU = Math.PI * 2;
const rgba = (c: RGB, a: number) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

function render(ctx: CanvasRenderingContext2D, S: number, t: number, level: number, cols: RGB[], mode: OrbMode) {
  ctx.clearRect(0, 0, S, S);
  const cx = S / 2;
  const cy = S / 2;
  const R = S * 0.28 * (1 + level * 0.18 + Math.sin(t * 1.3) * 0.015);
  const edge = S / 2 - 2; // kanvas chetidan chiqmasin (aks holda nur to'rtburchak bo'lib kesiladi)

  // Tashqi nur
  ctx.globalCompositeOperation = "source-over";
  const glowR = Math.min(R * 1.65, edge);
  const glow = ctx.createRadialGradient(cx, cy, R * 0.55, cx, cy, glowR);
  glow.addColorStop(0, rgba(cols[0], 0.3 + level * 0.35));
  glow.addColorStop(0.6, rgba(cols[1], 0.1 + level * 0.12));
  glow.addColorStop(1, rgba(cols[1], 0));
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, glowR, 0, TAU);
  ctx.fill();

  // Tinglash: tashqariga tarqaladigan to'lqin halqalari
  if (mode === "listen") {
    for (let k = 0; k < 3; k++) {
      const p = (t * 0.45 + k / 3) % 1;
      const r = R * (1.04 + p * 0.55);
      if (r > edge) continue;
      ctx.strokeStyle = rgba(cols[k], (1 - p) * (0.25 + level * 0.5));
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, TAU);
      ctx.stroke();
    }
  }

  // Gapirish: shar atrofida ovoz to'lqini
  if (mode === "speak") {
    ctx.beginPath();
    const N = 96;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * TAU;
      const wob = Math.sin(a * 6 + t * 5) * 0.5 + Math.sin(a * 11 - t * 7) * 0.3 + Math.sin(a * 3 + t * 2) * 0.2;
      const r = R * (1.08 + level * 0.22 * (0.6 + 0.4 * wob));
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.strokeStyle = rgba(cols[0], 0.35 + level * 0.45);
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  // O'ylash: shar atrofida aylanib yuradigan nuqtalar
  if (mode === "think") {
    for (let k = 0; k < 3; k++) {
      const a = t * 1.6 + (k * TAU) / 3;
      const x = cx + Math.cos(a) * R * 1.22;
      const y = cy + Math.sin(a) * R * 1.22;
      const g = ctx.createRadialGradient(x, y, 0, x, y, R * 0.12);
      g.addColorStop(0, rgba(cols[k], 0.95));
      g.addColorStop(1, rgba(cols[k], 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, R * 0.12, 0, TAU);
      ctx.fill();
    }
  }

  // Sharning o'zi
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.clip();
  const body = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R);
  body.addColorStop(0, "#1b1f4a");
  body.addColorStop(1, "#05060f");
  ctx.fillStyle = body;
  ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 4; i++) {
    const a = t * (0.7 + i * 0.23) + i * 1.7;
    const d = R * (0.26 + 0.16 * Math.sin(t * 0.9 + i) + level * 0.22);
    const bx = cx + Math.cos(a) * d;
    const by = cy + Math.sin(a * 1.17) * d;
    const br = R * (0.6 + 0.16 * Math.sin(t * 1.1 + i * 2) + level * 0.35);
    const g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
    g.addColorStop(0, rgba(cols[i], 0.8));
    g.addColorStop(0.5, rgba(cols[i], 0.32));
    g.addColorStop(1, rgba(cols[i], 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, TAU);
    ctx.fill();
  }

  // Markazdagi oq nur — ovoz kuchayganda yorqinlashadi
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * (0.45 + level * 0.25));
  core.addColorStop(0, `rgba(255,255,255,${0.28 + level * 0.55})`);
  core.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = core;
  ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

  // Shisha yaltirashi
  ctx.globalCompositeOperation = "screen";
  const hx = cx - R * 0.35;
  const hy = cy - R * 0.42;
  const hl = ctx.createRadialGradient(hx, hy, 0, hx, hy, R * 0.75);
  hl.addColorStop(0, "rgba(255,255,255,0.5)");
  hl.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = hl;
  ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
  ctx.restore();

  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.stroke();
}

export function VoiceOrb({
  mode,
  getLevel,
  size = 240,
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
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(size * dpr);
    c.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 0.35 : 1;

    const cols: RGB[] = PALETTES.idle.map((x) => [...x] as RGB);
    let level = 0;
    let t = 0;
    let last = performance.now();
    let id = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const { mode: m, getLevel: gl } = live.current;
      let target = 0;
      if (m === "think") target = 0.18 + 0.1 * Math.sin(now / 240);
      else if (m === "listen" || m === "speak") target = Math.max(0, Math.min(1, gl()));
      else target = 0.04 + 0.03 * Math.sin(now / 900);
      level += (target - level) * (target > level ? 0.35 : 0.1);
      const speed = m === "think" ? 2.2 : m === "idle" ? 0.55 : 1.1 + level * 2.2;
      t += dt * speed * calm;
      const pal = PALETTES[m];
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) cols[i][j] += (pal[i][j] - cols[i][j]) * 0.06;
      render(ctx, size, t, level, cols, m);
      id = requestAnimationFrame(frame);
    };
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [size]);

  return (
    <button type="button" className="orb" onClick={onClick} disabled={disabled} aria-label={label} style={{ width: size, height: size }}>
      <canvas ref={canvas} style={{ width: size, height: size }} />
    </button>
  );
}
