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

/** Sayt ikonkasi: Gemini chizgan rasm, tayyor bo'lguncha (yoki xato bo'lsa) emoji */
export function Visual({ id, size = 56, shape = "round", className = "" }: { id: VisualId; size?: number; shape?: "round" | "tile"; className?: string }) {
  const v = VISUALS[id];
  const src = imageUrl(v.prompt, { style: "icon" as ImageStyle, w: widthFor(size) });
  const { st, ref, onLoad, onError } = useImgState(src);
  return (
    <span className={`visual ${shape} ${st} ${className}`} style={{ width: size, height: size, fontSize: Math.round(size * 0.48) }} aria-hidden>
      {st !== "ok" && <span className="visual-fb">{v.emoji}</span>}
      {st !== "err" && (
        // eslint-disable-next-line @next/next/no-img-element -- rasm API'dan keladi
        <img ref={ref} src={src} alt="" loading="lazy" decoding="async" onLoad={onLoad} onError={onError} />
      )}
    </span>
  );
}

/** Ro'yxatda ikonka bo'lsa — rasm, bo'lmasa oddiy emoji */
export function VisualOr({ id, emoji, size = 52, shape = "tile" }: { id: string; emoji: string; size?: number; shape?: "round" | "tile" }) {
  if (id in VISUALS) return <Visual id={id as VisualId} size={size} shape={shape} />;
  return <span style={{ fontSize: Math.round(size * 0.55), lineHeight: 1 }}>{emoji}</span>;
}
