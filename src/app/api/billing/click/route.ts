import { handleClick } from "@/lib/server/click";

export const maxDuration = 30;

// Click SHOP API — Click kabinetida Prepare URL va Complete URL ikkalasiga ham shu manzil yoziladi:
// https://<sayt>/api/billing/click
export async function POST(req: Request) {
  let form: URLSearchParams;
  try {
    const type = req.headers.get("content-type") ?? "";
    form = type.includes("application/json")
      ? new URLSearchParams(Object.entries((await req.json()) as Record<string, string>).map(([k, v]) => [k, String(v)]))
      : new URLSearchParams(await req.text());
  } catch {
    return Response.json({ error: -8, error_note: "Error in request from click" });
  }
  try {
    return Response.json(await handleClick(form), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("Click xatosi:", e);
    return Response.json({
      click_trans_id: form.get("click_trans_id"),
      merchant_trans_id: form.get("merchant_trans_id"),
      error: -7,
      error_note: "Failed to update user",
    });
  }
}
