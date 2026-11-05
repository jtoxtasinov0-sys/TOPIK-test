import { connection } from "next/server";
import { hasKey } from "@/lib/gemini";
import { APP_ICON_PROMPT, APP_ICON_SIZES } from "@/lib/images";
import { cachedImage, createImage } from "@/lib/server/images";
import { fallbackAppIcon } from "@/lib/server/app-icon";
import { trackUsage } from "@/lib/server/usage";

export const maxDuration = 60;

// Ilova (PWA) ikonkasi: Gemini bir marta chizadi, server 180/192/512 px ga kichraytirib beradi.
// Gemini hali chizmagan yoki ishlamasa — zaxira «한» ikonkasi (qisqa kesh bilan, keyin haqiqiysi keladi).

export async function GET(req: Request) {
  await connection();
  const n = Number(new URL(req.url).searchParams.get("size"));
  const size = (APP_ICON_SIZES as readonly number[]).includes(n) ? n : 512;
  try {
    let img = await cachedImage(APP_ICON_PROMPT, "app", size);
    if (!img && hasKey()) {
      img = await createImage(APP_ICON_PROMPT, "app", size);
      await trackUsage("image");
    }
    if (img && img.mime === "image/png") {
      return new Response(new Uint8Array(img.data), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=604800" } });
    }
  } catch {}
  return new Response(new Uint8Array(fallbackAppIcon(size)), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=300", "X-Icon-Fallback": "1" },
  });
}
