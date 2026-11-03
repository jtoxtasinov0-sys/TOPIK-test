import { connection } from "next/server";
import { errorResponse } from "@/lib/gemini";
import { TRIAL_DAYS } from "@/lib/access";
import { authEnabled, currentUser } from "@/lib/server/guard";
import { accessOf, isAdminEmail, publicUser } from "@/lib/server/users";

const NO_STORE = { "Cache-Control": "private, no-store" };

// Joriy foydalanuvchi va bepul sinov holati
export async function GET(req: Request) {
  await connection();
  const base = { authEnabled: authEnabled(), trialDays: TRIAL_DAYS };
  if (!base.authEnabled) return Response.json({ ...base, user: null }, { headers: NO_STORE });
  try {
    const user = await currentUser(req);
    if (!user) return Response.json({ ...base, user: null }, { headers: NO_STORE });
    return Response.json({ ...base, user: publicUser(user), access: accessOf(user), admin: isAdminEmail(user.email) }, { headers: NO_STORE });
  } catch (e) {
    return errorResponse(e);
  }
}
