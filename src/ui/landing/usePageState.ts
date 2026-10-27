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

let webgl2: boolean | undefined;

// Paper Shaders throws from an unawaited promise when WebGL2 is missing, so its components mount
// only after this check passes. The probe context is released straight away.
function hasWebGL2(): boolean {
  if (webgl2 === undefined) {
    const gl = document.createElement("canvas").getContext("webgl2");
    webgl2 = gl !== null;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  }
  return webgl2;
}

const noSubscribe = () => () => {};

export function useWebGL2(): boolean {
  return useSyncExternalStore(noSubscribe, hasWebGL2, () => false);
}
