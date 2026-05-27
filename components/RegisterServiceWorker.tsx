"use client";

import { useEffect } from "react";

export function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let ctrlSeen = Boolean(navigator.serviceWorker.controller);

    const onControllerChange = () => {
      if (!ctrlSeen && navigator.serviceWorker.controller) {
        ctrlSeen = true;
        return;
      }
      if (!ctrlSeen || !navigator.serviceWorker.controller) return;
      const last = window.sessionStorage.getItem("snapspend-sw-reload-at");
      const now = Date.now();
      if (last && now - Number(last) < 2000) return;
      window.sessionStorage.setItem("snapspend-sw-reload-at", String(now));
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    const pingUpdate = () => {
      void navigator.serviceWorker.getRegistration().then((r) => r?.update());
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") pingUpdate();
    };

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
        pingUpdate();
      } catch {
        /* non-fatal */
      }
    };

    const onLoad = () => {
      void register();
    };

    window.addEventListener("focus", pingUpdate);
    document.addEventListener("visibilitychange", onVisibility);
    if (document.readyState === "complete") void register();
    else window.addEventListener("load", onLoad);

    return () => {
      window.removeEventListener("focus", pingUpdate);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("load", onLoad);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  return null;
}
