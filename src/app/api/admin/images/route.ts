import { connection } from "next/server";
import { errorResponse, hasKey, imageModelStatus } from "@/lib/gemini";
import { requireAdmin } from "@/lib/server/guard";
import { imageDir, imageLog } from "@/lib/server/images";

export const maxDuration = 60;

const NO_STORE = { "Cache-Control": "private, no-store" };

// Admin: test rasmlari va sayt ikonkalarini yaratish holati — kalit bormi, qaysi model, oxirgi xato nima
export async function GET(req: Request) {
  await connection();
  try {
    await requireAdmin(req);
    const model = await imageModelStatus();
    return Response.json({ hasKey: hasKey(), model, log: imageLog(), dir: imageDir() }, { headers: NO_STORE });
  } catch (e) {
    return errorResponse(e);
  }
}
