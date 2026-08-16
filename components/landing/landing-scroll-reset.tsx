"use client";

import { useLayoutEffect } from "react";

export function LandingScrollReset() {
  useLayoutEffect(() => {
    const historyObject = window.history;
    const previousRestoration = historyObject.scrollRestoration;
    historyObject.scrollRestoration = "manual";

    const reset = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    reset();
    const frame = window.requestAnimationFrame(reset);

    return () => {
      window.cancelAnimationFrame(frame);
      historyObject.scrollRestoration = previousRestoration;
    };
  }, []);

  return null;
}
