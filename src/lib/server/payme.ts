import "server-only";
import { getOrder, markOrderPaid, type Order } from "./billing";
import { safeEqual } from "./session";
import { getStore, withLock } from "./store";

// Payme Merchant API (JSON-RPC 2.0). Payme serverimizga so'rov yuboradi:
// CheckPerformTransaction → CreateTransaction → PerformTransaction (yoki CancelTransaction).
// Hujjat: https://developer.help.paycom.uz/metody-merchant-api/

export const PAYME_TIMEOUT_MS = 43_200_000; // 12 soat

export type PaymeTx = {
  id: string; // Payme tranzaksiya ID
  time: number; // Payme'dagi yaratilish vaqti
  amount: number; // tiyin
  orderId: string;
  state: 1 | 2 | -1 | -2;
  create_time: number;
  perform_time: number;
  cancel_time: number;
  reason: number | null;
  transaction: string; // bizning ichki ID
};

type Msg = { ru: string; uz: string; en: string };
const m = (ru: string, uz: string, en: string): Msg => ({ ru, uz, en });

const E = {
  auth: [-32504, m("Недостаточно привилегий", "Ruxsat yetarli emas", "Insufficient privileges")],
  parse: [-32700, m("Ошибка разбора JSON", "JSON xatosi", "Parse error")],
  request: [-32600, m("Неверный запрос", "Noto'g'ri so'rov", "Invalid request")],
  method: [-32601, m("Метод не найден", "Metod topilmadi", "Method not found")],
  system: [-32400, m("Системная ошибка", "Tizim xatosi", "System error")],
  amount: [-31001, m("Неверная сумма", "Noto'g'ri summa", "Incorrect amount")],
  txNotFound: [-31003, m("Транзакция не найдена", "Tranzaksiya topilmadi", "Transaction not found")],
  cantCancel: [-31007, m("Заказ выполнен. Невозможно отменить транзакцию", "Xizmat ko'rsatilgan, bekor qilib bo'lmaydi", "Order completed, cannot cancel")],
  cantPerform: [-31008, m("Невозможно выполнить операцию", "Amalni bajarib bo'lmaydi", "Unable to perform operation")],
  orderNotFound: [-31050, m("Заказ не найден", "Buyurtma topilmadi", "Order not found")],
  orderClosed: [-31051, m("Заказ уже оплачен или отменён", "Buyurtma to'langan yoki bekor qilingan", "Order already paid or cancelled")],
  orderBusy: [-31052, m("Заказ ожидает оплаты другой транзакцией", "Buyurtma boshqa tranzaksiya bilan to'lanmoqda", "Order is being paid by another transaction")],
} as const;

class PaymeError extends Error {
  code: number;
  msg: Msg;
  data?: string;
  constructor(e: readonly [number, Msg], data?: string) {
    super(e[1].en);
    this.code = e[0];
    this.msg = e[1];
    this.data = data;
  }
}

const field = () => process.env.PAYME_ACCOUNT_FIELD || "order_id";
const txKey = (id: string) => `payme:tx:${id}`;
const orderTxKey = (orderId: string) => `payme:order:${orderId}`;
const TX_INDEX = "payme:txs";

/** Basic auth: "Paycom:<KEY>" */
export function paymeAuthorized(header: string | null) {
  const key = process.env.PAYME_KEY;
  if (!key || !header?.startsWith("Basic ")) return false;
  const decoded = Buffer.from(header.slice(6).trim(), "base64").toString("utf8");
  const i = decoded.indexOf(":");
  return i >= 0 && safeEqual(decoded.slice(i + 1), key);
}

function fiscalDetail(o: Order) {
  const code = process.env.PAYME_IKPU;
  const pkg = process.env.PAYME_PACKAGE_CODE;
  if (!code || !pkg) return undefined;
  return {
    receipt_type: 0,
    items: [
      {
        title: `HanQadam Premium — ${o.days} kun`,
        price: o.amount * 100,
        count: 1,
        code,
        package_code: pkg,
        vat_percent: Number(process.env.PAYME_VAT_PERCENT ?? 0),
      },
    ],
  };
}

async function checkOrder(amount: unknown, account: unknown) {
  const id = (account as Record<string, unknown> | undefined)?.[field()];
  const order = await getOrder(id);
  if (!order) throw new PaymeError(E.orderNotFound, field());
  if (order.status !== "pending") throw new PaymeError(E.orderClosed, field());
  if (typeof amount !== "number" || amount !== order.amount * 100) throw new PaymeError(E.amount);
  return order;
}

async function saveTx(tx: PaymeTx) {
  await getStore().set(txKey(tx.id), tx);
}

async function cancelTx(tx: PaymeTx, reason: number, now: number) {
  const kv = getStore();
  const next: PaymeTx = { ...tx, state: tx.state === 2 ? -2 : -1, cancel_time: now, reason };
  await saveTx(next);
  if ((await kv.get<string>(orderTxKey(tx.orderId))) === tx.id) await kv.del(orderTxKey(tx.orderId));
  return next;
}

type Params = Record<string, unknown>;

async function dispatch(method: string, p: Params, now: number): Promise<unknown> {
  const kv = getStore();
  switch (method) {
    case "CheckPerformTransaction": {
      const order = await checkOrder(p.amount, p.account);
      const busy = await kv.get<string>(orderTxKey(order.id));
      if (busy) {
        const t = await kv.get<PaymeTx>(txKey(busy));
        if (t?.state === 1) throw new PaymeError(E.orderBusy, field());
      }
      const detail = fiscalDetail(order);
      return detail ? { allow: true, detail } : { allow: true };
    }

    case "CreateTransaction": {
      const id = String(p.id ?? "");
      if (!id) throw new PaymeError(E.request);
      return withLock(`payme:${id}`, async () => {
        const existing = await kv.get<PaymeTx>(txKey(id));
        if (existing) {
          if (existing.state !== 1) throw new PaymeError(E.cantPerform);
          if (now - existing.create_time > PAYME_TIMEOUT_MS) {
            await cancelTx(existing, 4, now);
            throw new PaymeError(E.cantPerform);
          }
          return { create_time: existing.create_time, transaction: existing.transaction, state: existing.state };
        }
        const order = await checkOrder(p.amount, p.account);
        return withLock(`payme-order:${order.id}`, async () => {
          const busy = await kv.get<string>(orderTxKey(order.id));
          if (busy && busy !== id) {
            const t = await kv.get<PaymeTx>(txKey(busy));
            if (t?.state === 1 && now - t.create_time <= PAYME_TIMEOUT_MS) throw new PaymeError(E.orderBusy, field());
            if (t?.state === 1) await cancelTx(t, 4, now);
          }
          const tx: PaymeTx = {
            id,
            time: Number(p.time) || now,
            amount: order.amount * 100,
            orderId: order.id,
            state: 1,
            create_time: now,
            perform_time: 0,
            cancel_time: 0,
            reason: null,
            transaction: `${order.id}${String(now).slice(-4)}`,
          };
          await saveTx(tx);
          await kv.set(orderTxKey(order.id), id);
          await kv.zadd(TX_INDEX, tx.time, id);
          return { create_time: tx.create_time, transaction: tx.transaction, state: tx.state };
        });
      });
    }

    case "PerformTransaction": {
      const id = String(p.id ?? "");
      return withLock(`payme:${id}`, async () => {
        const tx = await kv.get<PaymeTx>(txKey(id));
        if (!tx) throw new PaymeError(E.txNotFound);
        if (tx.state === 2) return { transaction: tx.transaction, perform_time: tx.perform_time, state: tx.state };
        if (tx.state !== 1) throw new PaymeError(E.cantPerform);
        if (now - tx.create_time > PAYME_TIMEOUT_MS) {
          await cancelTx(tx, 4, now);
          throw new PaymeError(E.cantPerform);
        }
        const ref = `payme:${tx.id}`;
        const before = await getOrder(tx.orderId);
        if (!before || (before.status !== "pending" && before.paidBy !== ref)) {
          // Buyurtma boshqa yo'l bilan to'langan yoki o'chgan — ikki marta pul olmaymiz
          await cancelTx(tx, 5, now);
          throw new PaymeError(E.cantPerform);
        }
        const paid = await markOrderPaid(tx.orderId, ref, now);
        if (!paid || paid.paidBy !== ref) throw new PaymeError(E.cantPerform);
        const done: PaymeTx = { ...tx, state: 2, perform_time: now };
        await saveTx(done);
        return { transaction: done.transaction, perform_time: done.perform_time, state: done.state };
      });
    }

    case "CancelTransaction": {
      const id = String(p.id ?? "");
      return withLock(`payme:${id}`, async () => {
        const tx = await kv.get<PaymeTx>(txKey(id));
        if (!tx) throw new PaymeError(E.txNotFound);
        if (tx.state === 1) {
          const c = await cancelTx(tx, Number(p.reason) || 0, now);
          return { transaction: c.transaction, cancel_time: c.cancel_time, state: c.state };
        }
        // Raqamli xizmat darhol taqdim etiladi — bajarilgan to'lovni bekor qilib bo'lmaydi
        if (tx.state === 2) throw new PaymeError(E.cantCancel);
        return { transaction: tx.transaction, cancel_time: tx.cancel_time, state: tx.state };
      });
    }

    case "CheckTransaction": {
      const tx = await kv.get<PaymeTx>(txKey(String(p.id ?? "")));
      if (!tx) throw new PaymeError(E.txNotFound);
      return {
        create_time: tx.create_time,
        perform_time: tx.perform_time,
        cancel_time: tx.cancel_time,
        transaction: tx.transaction,
        state: tx.state,
        reason: tx.reason,
      };
    }

    case "GetStatement": {
      const from = Number(p.from);
      const to = Number(p.to);
      if (!Number.isFinite(from) || !Number.isFinite(to)) throw new PaymeError(E.request);
      const ids = await kv.zrange(TX_INDEX, { min: from, max: to });
      const txs = (await Promise.all(ids.map((i) => kv.get<PaymeTx>(txKey(i))))).filter((t): t is PaymeTx => !!t);
      return {
        transactions: txs.map((t) => ({
          id: t.id,
          time: t.time,
          amount: t.amount,
          account: { [field()]: t.orderId },
          create_time: t.create_time,
          perform_time: t.perform_time,
          cancel_time: t.cancel_time,
          transaction: t.transaction,
          state: t.state,
          reason: t.reason,
          receivers: null,
        })),
      };
    }

    case "SetFiscalData":
      return { success: true };

    default:
      throw new PaymeError(E.method);
  }
}

/** Payme so'rovini qayta ishlaydi. Har doim HTTP 200 bilan qaytariladigan JSON obyekt. */
export async function handlePayme(raw: string, authHeader: string | null, now = Date.now()) {
  let id: unknown = null;
  try {
    let body: { id?: unknown; method?: unknown; params?: unknown };
    try {
      body = JSON.parse(raw);
    } catch {
      throw new PaymeError(E.parse);
    }
    id = body?.id ?? null;
    if (!paymeAuthorized(authHeader)) throw new PaymeError(E.auth);
    if (typeof body.method !== "string" || typeof body.params !== "object" || !body.params) throw new PaymeError(E.request);
    const result = await dispatch(body.method, body.params as Params, now);
    return { jsonrpc: "2.0", id, result };
  } catch (e) {
    const err = e instanceof PaymeError ? e : new PaymeError(E.system);
    if (!(e instanceof PaymeError)) console.error("Payme xatosi:", e);
    return { jsonrpc: "2.0", id, error: { code: err.code, message: err.msg, ...(err.data ? { data: err.data } : {}) } };
  }
}
