import { connection } from "next/server";
import { errorResponse } from "@/lib/gemini";
import { TRIAL_DAYS } from "@/lib/plans";
import { providers, userOrders } from "@/lib/server/billing";
import { authEnabled, currentUser } from "@/lib/server/guard";
import { accessOf, isAdminEmail, publicUser } from "@/lib/server/users";

const NO_STORE = { "Cache-Control": "private, no-store" };

// Joriy foydalanuvchi, obuna holati va to'lov tarixi
export async function GET(req: Request) {
  await connection();
  const base = { authEnabled: authEnabled(), providers: providers(), trialDays: TRIAL_DAYS };
  if (!base.authEnabled) return Response.json({ ...base, user: null }, { headers: NO_STORE });
  try {
    const user = await currentUser(req);
    if (!user) return Response.json({ ...base, user: null }, { headers: NO_STORE });
    const orders = (await userOrders(user.id, 12))
      .filter((o) => o.status === "paid")
      .map((o) => ({ id: o.id, planId: o.planId, days: o.days, amount: o.amount, provider: o.provider, paidAt: o.paidAt }));
    return Response.json(
      { ...base, user: publicUser(user), access: accessOf(user), admin: isAdminEmail(user.email), orders },
      { headers: NO_STORE }
    );
  } catch (e) {
    return errorResponse(e);
  }
}
