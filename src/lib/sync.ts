"use client";

import { remove, save } from "./store";
import { SYNC_KEYS } from "./sync-keys";
import { mergeData } from "./sync-merge";

// Natijalarni bulut bilan sinxronlash: profil, testlar tarixi, so'zlar va streak.
// Birinchi kirishda qurilmadagi va bulutdagi ma'lumotlar birlashtiriladi,
// keyin har o'zgarishdan ~3 soniya o'tib bulutga yuboriladi.

const META = "hq:sync";
type Meta = { uid: string; syncedAt: number; dirty: boolean };
type Data = Record<string, unknown>;

function readMeta(): Meta | null {
  try {
    return JSON.parse(localStorage.getItem(META) || "null") as Meta | null;
  } catch {
    return null;
  }
}

function writeMeta(m: Meta | null) {
  try {
    if (m) localStorage.setItem(META, JSON.stringify(m));
    else localStorage.removeItem(META);
  } catch {}
}

function readLocal(): Data {
  const out: Data = {};
  for (const k of SYNC_KEYS) {
    try {
      const raw = localStorage.getItem(k);
      if (raw) out[k] = JSON.parse(raw);
    } catch {}
  }
  return out;
}

let applying = false;
function writeLocal(data: Data) {
  applying = true;
  try {
    for (const k of SYNC_KEYS) if (data[k] != null) save(k, data[k]);
  } finally {
    applying = false;
  }
}

let active: { uid: string; stop: () => void } | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;

async function push(uid: string, keepalive = false) {
  const body = JSON.stringify({ data: readLocal() });
  const res = await fetch("/api/sync", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: keepalive && body.length < 60_000,
  });
  if (!res.ok) return;
  const j = (await res.json()) as { updatedAt: number };
  // Yuborish paytida yangi o'zgarish bo'lgan bo'lsa "o'zgargan" holicha qoladi
  writeMeta({ uid, syncedAt: j.updatedAt, dirty: JSON.stringify({ data: readLocal() }) !== body });
}

export function startSync(uid: string) {
  if (active?.uid === uid) return;
  active?.stop();

  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => void push(uid).catch(() => {}), 3000);
  };
  const onStore = (e: Event) => {
    const k = (e as CustomEvent<string>).detail;
    if (applying || !(SYNC_KEYS as readonly string[]).includes(k)) return;
    const m = readMeta();
    if (m?.uid !== uid) return;
    if (!m.dirty) writeMeta({ ...m, dirty: true });
    schedule();
  };
  const onHide = () => {
    if (document.visibilityState === "hidden" && readMeta()?.dirty) {
      clearTimeout(timer);
      void push(uid, true).catch(() => {});
    }
  };
  window.addEventListener("hq:store", onStore);
  document.addEventListener("visibilitychange", onHide);
  active = {
    uid,
    stop: () => {
      clearTimeout(timer);
      window.removeEventListener("hq:store", onStore);
      document.removeEventListener("visibilitychange", onHide);
    },
  };

  void (async () => {
    try {
      const res = await fetch("/api/sync", { cache: "no-store" });
      if (!res.ok || active?.uid !== uid) return;
      const server = (await res.json()) as { data: Data | null; updatedAt: number };
      const meta = readMeta();
      const local = readLocal();
      if (!meta || meta.uid !== uid) {
        // Bu qurilmada birinchi marta: ikkalasini birlashtiramiz
        writeLocal(server.data ? mergeData(local, server.data) : local);
        writeMeta({ uid, syncedAt: server.updatedAt, dirty: true });
        await push(uid);
      } else if (server.updatedAt > meta.syncedAt) {
        // Boshqa qurilmada o'zgargan
        if (meta.dirty) {
          writeLocal(mergeData(local, server.data ?? {}));
          await push(uid);
        } else {
          writeLocal(server.data ?? {});
          writeMeta({ uid, syncedAt: server.updatedAt, dirty: false });
        }
      } else if (meta.dirty) {
        await push(uid);
      }
    } catch {}
  })();
}

/** Hisobdan chiqishda: sinxronni to'xtatib, shu qurilmadagi shaxsiy natijalarni tozalaydi (ular bulutda qoladi) */
export function stopSync(clearLocal: boolean) {
  active?.stop();
  active = null;
  if (clearLocal && readMeta()) {
    for (const k of SYNC_KEYS) remove(k);
  }
  writeMeta(null);
}
