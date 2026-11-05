"use client";

import { useEffect, useRef, useState } from "react";
import { VISUALS, type VisualId } from "@/data/visuals";
import { imageUrl, widthFor, type ImageStyle } from "@/lib/images";

type St = "load" | "ok" | "err";

/**
 * Rasm holati: yuklanmoqda / tayyor / xato. Sahifa serverda chizilganda rasm React ulanishidan oldin
 * yuklanib bo'lishi mumkin (onLoad chaqirilmaydi) — shuning uchun mount paytida img.complete tekshiriladi.
 */
export function useImgState(src: string) {
  const ref = useRef<HTMLImageElement>(null);
  const [st, setSt] = useState<{ src: string; st: St }>({ src, st: "load" });
  const cur = st.src === src ? st.st : "load";
  useEffect(() => {
    const el = ref.current;
    // Faqat muvaffaqiyatli yuklanganini tekshiramiz: lazy rasmda complete=true bo'lib, hali yuklanmagan holat ham bo'ladi
    if (el?.complete && el.naturalWidth > 0) setSt({ src, st: "ok" });
  }, [src]);
  return {
    st: cur,
    ref,
    onLoad: () => setSt({ src, st: "ok" }),
    onError: () => setSt({ src, st: "err" }),
  };
}

/** Ikonka manzili (o'lchamga mos kenglik bilan) */
export const visualSrc = (id: VisualId, size: number) => imageUrl(VISUALS[id].prompt, { style: "icon" as ImageStyle, w: widthFor(size) });

/** Barcha sayt ikonkalari — sahifalardagi o'lchamlarda: bosh sahifada katta (66–72 px), boshqa joylarda 40–64 px */
export function allVisualSrcs(): string[] {
  return (Object.keys(VISUALS) as VisualId[]).flatMap((id) => (/^(home|who):/.test(id) ? [visualSrc(id, 56), visualSrc(id, 72)] : [visualSrc(id, 56)]));
}

const warmed = new Set<string>();

/**
 * Rasmlarni fonda oldindan yuklash (brauzer va service worker keshiga) — sahifa yoki menyu ochilganda darhol ko'rinadi.
 * Bir vaqtda bir nechtasi yuklanadi, shunda hozirgi sahifa sekinlashmaydi.
 */
export function preloadImages(urls: string[], concurrency = 3) {
  if (typeof window === "undefined") return;
  const queue = urls.filter((u) => !warmed.has(u));
  for (const u of queue) warmed.add(u);
  let active = 0;
  const pump = () => {
    while (active < concurrency && queue.length) {
      active++;
      const img = new Image();
      const done = () => {
        active--;
        pump();
      };
      img.onload = done;
      img.onerror = done;
      img.decoding = "async";
      img.src = queue.shift()!;
    }
  };
  pump();
}

/** «Trafikni tejash» rejimi yoki 2G bo'lmasa — fonda ko'proq yuklash mumkin */
export function fastConnection() {
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return !c || (!c.saveData && !/2g/.test(c.effectiveType ?? ""));
}

/** Sayt ikonkasi: Gemini chizgan rasm, tayyor bo'lguncha (yoki xato bo'lsa) emoji. eager — darhol yuklash (menyu, birinchi ekran) */
export function Visual({
  id,
  size = 56,
  shape = "round",
  className = "",
  eager = false,
}: {
  id: VisualId;
  size?: number;
  shape?: "round" | "tile";
  className?: string;
  eager?: boolean;
}) {
  const v = VISUALS[id];
  const src = visualSrc(id, size);
  const { st, ref, onLoad, onError } = useImgState(src);
  return (
    <span className={`visual ${shape} ${st} ${className}`} style={{ width: size, height: size, fontSize: Math.round(size * 0.48) }} aria-hidden>
      {st !== "ok" && <span className="visual-fb">{v.emoji}</span>}
      {st !== "err" && (
        // eslint-disable-next-line @next/next/no-img-element -- rasm API'dan keladi
        <img ref={ref} src={src} alt="" loading={eager ? "eager" : "lazy"} decoding="async" onLoad={onLoad} onError={onError} />
      )}
    </span>
  );
}

/** Ro'yxatda ikonka bo'lsa — rasm, bo'lmasa oddiy emoji */
export function VisualOr({ id, emoji, size = 52, shape = "tile" }: { id: string; emoji: string; size?: number; shape?: "round" | "tile" }) {
  if (id in VISUALS) return <Visual id={id as VisualId} size={size} shape={shape} />;
  return <span style={{ fontSize: Math.round(size * 0.55), lineHeight: 1 }}>{emoji}</span>;
}
