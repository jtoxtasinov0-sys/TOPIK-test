import { connection } from "next/server";
import { hasKey } from "@/lib/gemini";
import { APP_ICON_PROMPT, APP_ICON_SIZES } from "@/lib/images";
import { cachedImage, createImage } from "@/lib/server/images";
import { fallbackAppIcon } from "@/lib/server/app-icon";
import { trackUsage } from "@/lib/server/usage";

export const maxDuration = 60;

// Ilova (PWA) ikonkasi: Gemini bir marta chizadi, server 180/192/512 px ga kichraytirib beradi.
// Telefon ikonkani o'sha zahoti so'raydi va uzoq kutmaydi — shuning uchun rasm hali yo'q bo'lsa,
// Gemini orqa fonda chizishni boshlaydi, telefon esa darhol zaxira «한» ikonkasini oladi (keshlanmaydi).

export async function GET(req: Request) {
  await connection();
  const n = Number(new URL(req.url).searchParams.get("size"));
  const size = (APP_ICON_SIZES as readonly number[]).includes(n) ? n : 512;
  try {
    const img = await cachedImage(APP_ICON_PROMPT, "app", size);
    if (img) {
      return new Response(new Uint8Array(img.data), { headers: { "Content-Type": img.mime, "Cache-Control": "public, max-age=604800" } });
    }
    if (hasKey()) {
      void createImage(APP_ICON_PROMPT, "app")
        .then(() => trackUsage("image"))
        .catch(() => {}); // xato admin panelda ko'rinadi (/api/admin/images)
    }
  } catch {}
  return new Response(new Uint8Array(fallbackAppIcon(size)), {
    headers: { "Content-Type": "image/png", "Cache-Control": "no-store", "X-Icon-Fallback": "1" },
  });
}
