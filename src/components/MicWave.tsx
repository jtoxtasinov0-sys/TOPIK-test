"use client";

import { useEffect, useRef, useState } from "react";

// Mikrofon yozayotganda jonli ovoz grafigi: har bir ustun — ovoz balandligi, o'ngdan chapga oqib boradi.
// Gapirganingizda ustunlar baland va rangli, jim tursangiz — past va kulrang. Shunda ovoz yozilayotgani darhol ko'rinadi.

/** Mikrofon RMS (0..~0.3) → ko'zga tabiiy ko'rinadigan 0..1 balandlik */
export function micToLevel(rms: number) {
  return Math.min(1, Math.pow(Math.max(0, rms) * 8, 0.7));
}

const BAR = 3;
const GAP = 2;
const STEP = BAR + GAP;
const SAMPLE_MS = 45;
const LOUD = 0.14;

export function MicWave({ getLevel, height = 34 }: { getLevel: () => number; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const levelRef = useRef(getLevel);
  useEffect(() => {
    levelRef.current = getLevel;
  }, [getLevel]);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let W = 0;
    let H = 0;
    const resize = () => {
      const r = cv.getBoundingClientRect();
      W = r.width;
      H = r.height;
      cv.width = Math.max(1, Math.round(W * dpr));
      cv.height = Math.max(1, Math.round(H * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    ro?.observe(cv);

    const hist: number[] = [];
    let smooth = 0;
    let last = 0;
    let raf = 0;
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      let lvl = 0;
      try {
        lvl = Math.max(0, Math.min(1, levelRef.current()));
      } catch {}
      smooth = smooth * 0.45 + lvl * 0.55;
      if (t - last < SAMPLE_MS) return;
      last = t;
      hist.push(smooth);
      const max = Math.ceil(W / STEP) + 1;
      if (hist.length > max) hist.splice(0, hist.length - max);

      ctx.clearRect(0, 0, W, H);
      const loud = ctx.createLinearGradient(0, 0, 0, H);
      loud.addColorStop(0, "#d63dff");
      loud.addColorStop(0.5, "#8b3dff");
      loud.addColorStop(1, "#3a86ff");
      for (let i = 0; i < hist.length; i++) {
        const v = hist[hist.length - 1 - i];
        const x = W - (i + 1) * STEP;
        if (x < -BAR) break;
        const h = Math.max(3, v * (H - 2));
        ctx.globalAlpha = Math.max(0.25, 1 - (i * STEP) / (W * 1.15)); // eski ustunlar asta-sekin xiralashadi
        ctx.fillStyle = v > LOUD ? loud : "#b9b4d3";
        const y = (H - h) / 2;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, BAR, h, 1.5);
        else ctx.rect(x, y, BAR, h);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, []);

  return <canvas ref={ref} className="micwave" style={{ height }} aria-hidden />;
}

/** Yozuv davomiyligi: 0:07 */
export function RecTimer() {
  const [s, setS] = useState(0);
  useEffect(() => {
    const t0 = performance.now();
    const id = window.setInterval(() => setS(Math.floor((performance.now() - t0) / 1000)), 250);
    return () => window.clearInterval(id);
  }, []);
  return (
    <span className="rec-time">
      {Math.floor(s / 60)}:{String(s % 60).padStart(2, "0")}
    </span>
  );
}

/** Ovozli sahifalar uchun to'liq «yozilmoqda» paneli: qizil nuqta + jonli to'lqin + vaqt */
export function RecMeter({ getLevel }: { getLevel: () => number }) {
  return (
    <div className="rec-meter" role="status" aria-label="Ovozingiz yozilmoqda">
      <span className="rec-dot" />
      <MicWave getLevel={getLevel} />
      <RecTimer />
    </div>
  );
}
