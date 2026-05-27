"use client";

import { useCallback, useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function InstallAppButton({ className = "" }: { className?: string }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      setShowIosHint(false);
    };

    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const onInstall = useCallback(async () => {
    if (installed) return;
    if (deferred) {
      setBusy(true);
      try {
        await deferred.prompt();
        const { outcome } = await deferred.userChoice;
        if (outcome === "accepted") setInstalled(true);
        setDeferred(null);
      } finally {
        setBusy(false);
      }
      return;
    }
    if (isIos()) {
      setShowIosHint((v) => !v);
    }
  }, [deferred, installed]);

  if (installed) {
    return (
      <span className={`install-pill installed ${className}`.trim()} aria-live="polite">
        App installed
      </span>
    );
  }

  const canPrompt = Boolean(deferred);
  const showButton = canPrompt || isIos();

  if (!showButton) return null;

  return (
    <div className={`install-wrap ${className}`.trim()}>
      <button
        type="button"
        className="install-btn"
        onClick={onInstall}
        disabled={busy}
        aria-busy={busy}>
        <span className="install-btn-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3v12M7 10l5 5 5-5" />
            <path d="M5 21h14" />
          </svg>
        </span>
        {busy ? "Installing…" : "Install Snapspend"}
      </button>
      {showIosHint && (
        <p className="install-ios-hint">
          On iPhone: tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>.
        </p>
      )}
    </div>
  );
}
