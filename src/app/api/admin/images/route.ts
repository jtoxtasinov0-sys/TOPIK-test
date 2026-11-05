import { connection } from "next/server";
import { errorResponse, hasKey, imageModelStatus } from "@/lib/gemini";
import { APP_ICON_PROMPT } from "@/lib/images";
import { requireAdmin } from "@/lib/server/guard";
import { cachedImage, createImage, imageDir, imageLog } from "@/lib/server/images";
import { trackUsage } from "@/lib/server/usage";

export const maxDuration = 60;

const NO_STORE = { "Cache-Control": "private, no-store" };

// Admin: rasm yaratish holati — kalit bormi, qaysi model, ilova ikonkasi tayyormi, oxirgi xato nima
export async function GET(req: Request) {
  await connection();
  try {
    await requireAdmin(req);
    const [model, icon] = await Promise.all([imageModelStatus(), cachedImage(APP_ICON_PROMPT, "app")]);
    return Response.json(
      { hasKey: hasKey(), model, appIcon: icon ? { ready: true, mime: icon.mime, bytes: icon.data.length } : { ready: false }, log: imageLog(), dir: imageDir() },
      { headers: NO_STORE }
    );
  } catch (e) {
    return errorResponse(e);
  }
}

// Admin: ilova ikonkasini hozir chizish (natija yoki Gemini xatosi aynan qaytadi)
export async function POST(req: Request) {
  await connection();
  try {
    await requireAdmin(req);
    const started = Date.now();
    const img = await createImage(APP_ICON_PROMPT, "app");
    await trackUsage("image");
    return Response.json({ ok: true, ms: Date.now() - started, mime: img.mime, bytes: img.data.length }, { headers: NO_STORE });
  } catch (e) {
    return errorResponse(e);
  }
}
