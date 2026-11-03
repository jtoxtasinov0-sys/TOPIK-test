import { handlePayme } from "@/lib/server/payme";

export const maxDuration = 30;

// Payme Merchant API endpoint — Payme kabinetida "Endpoint URL" sifatida ko'rsatiladi:
// https://<sayt>/api/billing/payme
export async function POST(req: Request) {
  const raw = await req.text();
  const out = await handlePayme(raw, req.headers.get("authorization"));
  return Response.json(out, { status: 200, headers: { "Cache-Control": "no-store" } });
}
