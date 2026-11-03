import "server-only";
import { createHash } from "node:crypto";
import { getOrder, markOrderPaid } from "./billing";
import { safeEqual } from "./session";
import { getStore, withLock } from "./store";

// Click SHOP API: Click serverimizga ikki bosqichda so'rov yuboradi —
// Prepare (action=0) va Complete (action=1). Ikkalasi ham shu bitta manzilga kelishi mumkin.
// Hujjat: https://docs.click.uz/click-api-request/

type ClickPrep = { prepareId: number; clickTransId: string; orderId: string; state: "prepared" | "completed" | "cancelled"; createdAt: number };

const prepKey = (clickTransId: string) => `click:prep:${clickTransId}`;

const md5 = (s: string) => createHash("md5").update(s).digest("hex");

export function clickSign(f: Record<string, string>, secret: string) {
  const prepare = f.action === "1" ? f.merchant_prepare_id ?? "" : "";
  return md5(`${f.click_trans_id}${f.service_id}${secret}${f.merchant_trans_id}${prepare}${f.amount}${f.action}${f.sign_time}`);
}

type Res = Record<string, string | number | undefined>;

export async function handleClick(form: URLSearchParams, now = Date.now()): Promise<Res> {
  const f = Object.fromEntries(form.entries()) as Record<string, string>;
  const base: Res = { click_trans_id: f.click_trans_id, merchant_trans_id: f.merchant_trans_id };
  const err = (error: number, error_note: string, extra: Res = {}): Res => ({ ...base, ...extra, error, error_note });

  const secret = process.env.CLICK_SECRET_KEY;
  if (!secret || f.service_id !== process.env.CLICK_SERVICE_ID) return err(-8, "Error in request from click");
  if (!f.sign_string || !safeEqual(f.sign_string.toLowerCase(), clickSign(f, secret))) return err(-1, "SIGN CHECK FAILED!");
  if (f.action !== "0" && f.action !== "1") return err(-3, "Action not found");
  if (!f.click_trans_id) return err(-8, "Error in request from click");

  const kv = getStore();
  const order = await getOrder(f.merchant_trans_id);
  if (!order) return err(-5, "User does not exist");
  if (Math.abs(Number(f.amount) - order.amount) > 0.01) return err(-2, "Incorrect parameter amount");

  // ---------- Prepare ----------
  if (f.action === "0") {
    if (order.status === "paid") return err(-4, "Already paid");
    if (order.status === "cancelled") return err(-9, "Transaction cancelled");
    return withLock(`click:${f.click_trans_id}`, async () => {
      const existing = await kv.get<ClickPrep>(prepKey(f.click_trans_id));
      const prepareId = existing?.prepareId ?? (await kv.incr("click:seq"));
      if (!existing) {
        await kv.set(prepKey(f.click_trans_id), {
          prepareId,
          clickTransId: f.click_trans_id,
          orderId: order.id,
          state: "prepared",
          createdAt: now,
        } satisfies ClickPrep);
      }
      return err(0, "Success", { merchant_prepare_id: prepareId });
    });
  }

  // ---------- Complete ----------
  return withLock(`click:${f.click_trans_id}`, async () => {
    const prep = await kv.get<ClickPrep>(prepKey(f.click_trans_id));
    if (!prep || String(prep.prepareId) !== f.merchant_prepare_id || prep.orderId !== order.id) {
      return err(-6, "Transaction does not exist");
    }
    const ref = `click:${f.click_trans_id}`;
    if (prep.state === "completed") return err(-4, "Already paid", { merchant_confirm_id: prep.prepareId });
    if (prep.state === "cancelled") return err(-9, "Transaction cancelled");

    // Click to'lov amalga oshmaganini bildirdi (masalan, kartada mablag' yetarli emas)
    if (Number(f.error) < 0) {
      await kv.set(prepKey(f.click_trans_id), { ...prep, state: "cancelled" } satisfies ClickPrep);
      return err(-9, "Transaction cancelled");
    }
    if (order.status !== "pending" && order.paidBy !== ref) return err(-4, "Already paid");

    const paid = await markOrderPaid(order.id, ref, now);
    if (!paid || paid.paidBy !== ref) return err(-7, "Failed to update user");
    await kv.set(prepKey(f.click_trans_id), { ...prep, state: "completed" } satisfies ClickPrep);
    return err(0, "Success", { merchant_confirm_id: prep.prepareId });
  });
}
