import { connection } from "next/server";
import { AiError, errorResponse } from "@/lib/gemini";
import { requireAdmin } from "@/lib/server/guard";
import { getPayment, readReceipt } from "@/lib/server/payments";

// Chek rasmi — faqat admin ko'radi
export async function GET(req: Request) {
  await connection();
  try {
    await requireAdmin(req);
    const p = await getPayment(new URL(req.url).searchParams.get("id") ?? "");
    const img = p ? await readReceipt(p) : null;
    if (!img) throw new AiError("Chek rasmi topilmadi", 404);
    return new Response(new Uint8Array(img.data), {
      headers: { "Content-Type": img.mime, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
