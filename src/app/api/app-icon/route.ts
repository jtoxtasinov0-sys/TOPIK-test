import { APP_ICON_SIZES, appIconUrl } from "@/lib/images";

// Eski manzil: oldin o'rnatilgan ilovalar shu yerdan ikonka so'raydi — endi vektor logodan tayyorlangan
// statik ikonkaga yo'naltiramiz (public/brand/icon-*.png).
export function GET(req: Request) {
  const n = Number(new URL(req.url).searchParams.get("size"));
  const size = (APP_ICON_SIZES as readonly number[]).includes(n) ? (n as (typeof APP_ICON_SIZES)[number]) : 512;
  return Response.redirect(new URL(appIconUrl(size), req.url), 308);
}
