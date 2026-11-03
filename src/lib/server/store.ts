import "server-only";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";

// Kalit-qiymat ombori: foydalanuvchilar, sinov muddatlari va sinxronlangan natijalar.
// Production: Upstash Redis (Vercel Marketplace → Upstash) REST API orqali, kutubxonasiz.
// Lokal ishlab chiqish: .data/db.json fayli.

export class StoreError extends Error {
  name = "StoreError";
}

export type ZRangeOpts = { min?: number; max?: number; rev?: boolean; limit?: number };

export interface Kv {
  get<T>(key: string): Promise<T | null>;
  /** nx: faqat kalit yo'q bo'lsa yozadi. Yozilgan bo'lsa true qaytaradi. */
  set(key: string, value: unknown, opts?: { nx?: boolean; ttlSec?: number }): Promise<boolean>;
  del(key: string): Promise<void>;
  incr(key: string, ttlSec?: number): Promise<number>;
  zadd(key: string, score: number, member: string): Promise<void>;
  zrange(key: string, opts?: ZRangeOpts): Promise<string[]>;
  zcard(key: string): Promise<number>;
}

// ---------------- Upstash Redis (REST) ----------------
function upstash(url: string, token: string): Kv {
  const base = url.replace(/\/+$/, "");
  async function send<T>(pathname: string, body: unknown): Promise<T> {
    let res: Response;
    try {
      res = await fetch(base + pathname, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      });
    } catch {
      throw new StoreError("Ma'lumotlar bazasi bilan bog'lanib bo'lmadi");
    }
    const json = (await res.json().catch(() => null)) as unknown;
    if (!res.ok || !json) throw new StoreError(`Ma'lumotlar bazasi xatosi (${res.status})`);
    return json as T;
  }
  async function cmd<T>(...args: (string | number)[]): Promise<T> {
    const j = await send<{ result?: T; error?: string }>("", args.map(String));
    if (j.error) throw new StoreError(j.error);
    return j.result as T;
  }
  async function pipeline(cmds: (string | number)[][]) {
    const j = await send<{ result?: unknown; error?: string }[]>("/pipeline", cmds.map((c) => c.map(String)));
    const bad = j.find((r) => r.error);
    if (bad) throw new StoreError(bad.error);
    return j.map((r) => r.result);
  }
  return {
    async get<T>(key: string) {
      const raw = await cmd<string | null>("GET", key);
      if (raw == null) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    },
    async set(key, value, opts = {}) {
      const args: (string | number)[] = ["SET", key, JSON.stringify(value)];
      if (opts.nx) args.push("NX");
      if (opts.ttlSec) args.push("EX", opts.ttlSec);
      return (await cmd<string | null>(...args)) === "OK";
    },
    async del(key) {
      await cmd("DEL", key);
    },
    async incr(key, ttlSec) {
      if (!ttlSec) return Number(await cmd<number>("INCR", key));
      const [n] = await pipeline([
        ["INCR", key],
        ["EXPIRE", key, ttlSec],
      ]);
      return Number(n);
    },
    async zadd(key, score, member) {
      await cmd("ZADD", key, score, member);
    },
    async zrange(key, o = {}) {
      const lo = o.min ?? "-inf";
      const hi = o.max ?? "+inf";
      const args: (string | number)[] = ["ZRANGE", key];
      // REV bilan BYSCORE chegaralari teskari tartibda beriladi
      if (o.rev) args.push(hi, lo, "BYSCORE", "REV");
      else args.push(lo, hi, "BYSCORE");
      if (o.limit) args.push("LIMIT", 0, o.limit);
      return (await cmd<string[]>(...args)) ?? [];
    },
    async zcard(key) {
      return Number(await cmd<number>("ZCARD", key));
    },
  };
}

// ---------------- Xotira + fayl (lokal ishlab chiqish / bitta serverli VPS) ----------------
type Data = { kv: Record<string, { v: string; exp?: number }>; z: Record<string, Record<string, number>> };

export function createMemoryStore(file?: string): Kv {
  let data: Data = { kv: {}, z: {} };
  let loadedMtime = -1;
  let queue: Promise<unknown> = Promise.resolve();

  async function load() {
    if (!file) return;
    try {
      const st = await stat(file);
      if (st.mtimeMs === loadedMtime) return;
      data = JSON.parse(await readFile(file, "utf8")) as Data;
      data.kv ??= {};
      data.z ??= {};
      loadedMtime = st.mtimeMs;
    } catch {
      // fayl hali yo'q — bo'sh baza
    }
  }
  async function persist() {
    if (!file) return;
    await mkdir(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(data));
    await rename(tmp, file);
    loadedMtime = (await stat(file)).mtimeMs;
  }
  // Barcha amallar ketma-ket bajariladi (bir vaqtdagi yozuvlar bir-birini buzmasligi uchun)
  function run<T>(fn: (now: number) => T, write = false): Promise<T> {
    const job = queue.then(async () => {
      await load();
      const now = Date.now();
      for (const [k, e] of Object.entries(data.kv)) if (e.exp && e.exp <= now) delete data.kv[k];
      const out = fn(now);
      if (write) await persist();
      return out;
    });
    queue = job.catch(() => {});
    return job;
  }

  return {
    get<T>(key: string) {
      return run(() => {
        const e = data.kv[key];
        if (!e) return null;
        try {
          return JSON.parse(e.v) as T;
        } catch {
          return null;
        }
      });
    },
    set(key, value, opts = {}) {
      return run((now) => {
        if (opts.nx && data.kv[key]) return false;
        data.kv[key] = { v: JSON.stringify(value), ...(opts.ttlSec ? { exp: now + opts.ttlSec * 1000 } : {}) };
        return true;
      }, true);
    },
    del(key) {
      return run(() => {
        delete data.kv[key];
      }, true);
    },
    incr(key, ttlSec) {
      return run((now) => {
        const cur = data.kv[key];
        const n = (cur ? Number(JSON.parse(cur.v)) || 0 : 0) + 1;
        data.kv[key] = { v: JSON.stringify(n), ...(ttlSec ? { exp: now + ttlSec * 1000 } : cur?.exp ? { exp: cur.exp } : {}) };
        return n;
      }, true);
    },
    zadd(key, score, member) {
      return run(() => {
        (data.z[key] ??= {})[member] = score;
      }, true);
    },
    zrange(key, o = {}) {
      return run(() => {
        const lo = o.min ?? -Infinity;
        const hi = o.max ?? Infinity;
        const items = Object.entries(data.z[key] ?? {})
          .filter(([, s]) => s >= lo && s <= hi)
          .sort((a, b) => (o.rev ? b[1] - a[1] : a[1] - b[1]));
        return (o.limit ? items.slice(0, o.limit) : items).map(([m]) => m);
      });
    },
    zcard(key) {
      return run(() => Object.keys(data.z[key] ?? {}).length);
    },
  };
}

// ---------------- Tanlash ----------------
const g = globalThis as unknown as { __hqStore?: Kv };

function kvEnv() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

export function hasStore() {
  return !!kvEnv() || process.env.NODE_ENV !== "production" || process.env.ALLOW_FILE_DB === "1";
}

export function getStore(): Kv {
  if (g.__hqStore) return g.__hqStore;
  const env = kvEnv();
  if (env) return (g.__hqStore = upstash(env.url, env.token));
  if (!hasStore()) {
    throw new StoreError("Ma'lumotlar bazasi sozlanmagan: KV_REST_API_URL va KV_REST_API_TOKEN kerak (README'ga qarang)");
  }
  const file = process.env.FILE_DB_PATH || path.join(process.cwd(), ".data", "db.json");
  return (g.__hqStore = createMemoryStore(file));
}

/** Faqat testlar uchun */
export function setStore(kv: Kv | undefined) {
  g.__hqStore = kv;
}
