"use client";

import { useEffect, useState } from "react";
import { appIconUrl } from "@/lib/images";
import { load, save, useHydrated } from "@/lib/store";
import { Icon } from "./Icon";

// PWA: service worker'ni ro'yxatdan o'tkazish va «Ilovani o'rnatish» kartasi.

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((f) => f());

/** AppShell ichida bir marta: service worker va o'rnatish hodisasini ushlab qolish (hodisa sahifa ochilishi bilan keladi) */
export function PwaRegister() {
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      deferred = e as InstallEvent;
      notify();
    };
    const onInstalled = () => {
      deferred = null;
      save(HIDE_KEY, Date.now() + 3650 * 86400000);
      notify();
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  return null;
}

const HIDE_KEY = "hq:install-hide";

type Env = "standalone" | "ios" | "inapp" | "other";

function detect(): Env {
  const nav = navigator as Navigator & { standalone?: boolean };
  if (window.matchMedia?.("(display-mode: standalone)").matches || nav.standalone) return "standalone";
  const ua = navigator.userAgent;
  // Telegram, Instagram, Facebook ichidagi brauzerlarda o'rnatib bo'lmaydi
  if (/Telegram|Instagram|FBAN|FBAV|Line\//i.test(ua)) return "inapp";
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
  return "other";
}

/** Bosh sahifadagi «Ilovani o'rnatish» kartasi (o'rnatilgan bo'lsa yoki yopilgan bo'lsa ko'rinmaydi) */
export function InstallApp() {
  const ready = useHydrated();
  const [, force] = useState(0);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const f = () => force((x) => x + 1);
    listeners.add(f);
    return () => {
      listeners.delete(f);
    };
  }, []);

  if (!ready || hidden) return null;
  if (load<number>(HIDE_KEY, 0) > Date.now()) return null;
  const env = detect();
  if (env === "standalone") return null;

  const close = () => {
    save(HIDE_KEY, Date.now() + 14 * 86400000);
    setHidden(true);
  };
  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null;
    if (outcome === "accepted") close();
    else force((x) => x + 1);
  };

  return (
    <div className="card install-card" style={{ marginTop: 18 }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- ilova ikonkasi API'dan keladi */}
      <img src={appIconUrl(192)} alt="HanUstoz ikonkasi" width={64} height={64} className="install-icon" />
      <div className="grow stack" style={{ gap: 4 }}>
        <b>HanUstoz’ni telefoningizga o‘rnating</b>
        <span className="small muted">Ekranda ikonka bilan turadi, ilova kabi tez ochiladi va oldin ochilgan darslar internetsiz ham ishlaydi.</span>
        {deferred ? (
          <button className="btn btn-primary btn-sm" style={{ alignSelf: "flex-start", marginTop: 6 }} onClick={install}>
            📲 Ilovani o‘rnatish
          </button>
        ) : env === "ios" ? (
          <ol className="small install-steps">
            <li>
              Safari’da pastdagi <b>Ulashish</b> tugmasini bosing <span aria-hidden>(⬆️)</span>
            </li>
            <li>
              <b>«Ekranga qo‘shish»</b> (Add to Home Screen) ni tanlang
            </li>
            <li>
              <b>«Qo‘shish»</b> ni bosing — ikonka ekranda paydo bo‘ladi
            </li>
          </ol>
        ) : env === "inapp" ? (
          <div className="small callout" style={{ marginTop: 6 }}>
            Bu oynada (Telegram, Instagram) o‘rnatib bo‘lmaydi. Yuqoridagi <b>⋯</b> menyudan <b>«Brauzerda ochish»</b> ni tanlang (Chrome yoki Safari).
          </div>
        ) : (
          <div className="small muted" style={{ marginTop: 4 }}>
            Chrome menyusi (<b>⋮</b>) → <b>«Ilovani o‘rnatish»</b> yoki <b>«Bosh ekranga qo‘shish»</b>.
          </div>
        )}
      </div>
      <button className="icon-btn sm" onClick={close} aria-label="Yopish" style={{ alignSelf: "flex-start" }}>
        <Icon name="x" size={16} />
      </button>
    </div>
  );
}
