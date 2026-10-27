"use client";

import { useSyncExternalStore } from "react";

const REDUCE = "(prefers-reduced-motion: reduce)";

function onMotionChange(notify: () => void) {
  const query = window.matchMedia(REDUCE);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
}

// The server renders the still version; the client switches to motion after hydrating.
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    onMotionChange,
    () => window.matchMedia(REDUCE).matches,
    () => true,
  );
}

function onVisibilityChange(notify: () => void) {
  document.addEventListener("visibilitychange", notify);
  return () => document.removeEventListener("visibilitychange", notify);
}

export function usePageVisible(): boolean {
  return useSyncExternalStore(
    onVisibilityChange,
    () => !document.hidden,
    () => false,
  );
}
