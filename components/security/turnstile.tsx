"use client";

import { useEffect, useRef, useState } from "react";

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

type TurnstileInstance = {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string;
      theme?: "light" | "dark" | "auto";
      callback?: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
    },
  ) => string;
  reset: (widgetId?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileInstance;
  }
}

export function Turnstile({ name, onToken }: { name?: string; onToken?: (token: string) => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tokenRef = useRef<HTMLInputElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey) return;
    if (window.turnstile) {
      setReady(true);
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    const script = existing ?? document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    if (!existing) document.head.appendChild(script);

    const handleLoad = () => setReady(Boolean(window.turnstile));
    script.addEventListener("load", handleLoad);
    return () => script.removeEventListener("load", handleLoad);
  }, [siteKey]);

  useEffect(() => {
    if (!ready || !siteKey || !containerRef.current || !window.turnstile || widgetIdRef.current) return;

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme: "light",
      callback: (token) => {
        if (tokenRef.current) tokenRef.current.value = token;
        onToken?.(token);
      },
      "expired-callback": () => {
        if (tokenRef.current) tokenRef.current.value = "";
        onToken?.("");
      },
      "error-callback": () => {
        if (tokenRef.current) tokenRef.current.value = "";
        onToken?.("");
      },
    });

    return () => {
      if (widgetIdRef.current && window.turnstile) window.turnstile.reset(widgetIdRef.current);
      widgetIdRef.current = null;
      if (tokenRef.current) tokenRef.current.value = "";
      onToken?.("");
    };
  }, [ready, siteKey, onToken]);

  if (!siteKey) {
    return (
      <p className="rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-xs text-warning">
        Proteksi anti-bot belum dikonfigurasi. Tambahkan NEXT_PUBLIC_TURNSTILE_SITE_KEY di environment.
      </p>
    );
  }

  return (
    <div>
      <div ref={containerRef} className="min-h-[65px]" aria-label="Verifikasi anti-bot" />
      {name ? <input ref={tokenRef} type="hidden" name={name} defaultValue="" /> : null}
    </div>
  );
}
