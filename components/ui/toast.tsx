"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";

type ToastTone = "success" | "info" | "error";

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastApi {
  toast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastApi>({ toast: () => {} });

export const useToast = () => useContext(ToastContext);

const TONE_STYLE: Record<ToastTone, string> = {
  success: "border-success/30 bg-success-soft text-success",
  info: "border-border bg-surface text-ink",
  error: "border-danger/30 bg-danger-soft text-danger",
};

const TONE_ICON: Record<ToastTone, ReactNode> = {
  success: <CheckIcon />,
  info: <InfoIcon />,
  error: <AlertIcon />,
};

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<number[]>([]);

  const toast = useCallback((message: string, tone: ToastTone = "success") => {
    const id = nextId++;
    setToasts((prev) => [...prev.slice(-3), { id, message, tone }]);
    const timer = window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
    timers.current.push(timer);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 left-1/2 z-[90] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`anim-fade-up pointer-events-auto flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm font-medium shadow-[0_4px_16px_rgba(43,40,35,0.12)] ${TONE_STYLE[t.tone]}`}
          >
            {TONE_ICON[t.tone]}
            <span className="leading-snug">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function CheckIcon() {
  return (
    <svg className="size-4 shrink-0" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M4 10.5L8.2 14.5L16 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg className="size-4 shrink-0" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 9v4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="10" cy="6.2" r="1" fill="currentColor" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg className="size-4 shrink-0" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M10 3L17.5 16.5H2.5L10 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M10 8.5v3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="10" cy="14.2" r="0.9" fill="currentColor" />
    </svg>
  );
}