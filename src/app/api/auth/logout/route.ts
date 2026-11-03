import { clearCookie, isSecure, SESSION_COOKIE } from "@/lib/server/session";

export async function POST(req: Request) {
  const headers = new Headers({ "Cache-Control": "no-store" });
  headers.append("Set-Cookie", clearCookie(SESSION_COOKIE, isSecure(req)));
  return Response.json({ ok: true }, { headers });
}
