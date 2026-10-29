"use client";

import { useEffect } from "react";
import { adjacentStart, SEEK_S, shortcutFor } from "@/lib/keys";
import { stepStarts } from "@/lib/plan/remap";
import { usePlayback } from "@/state/playback";
import { useProject } from "@/state/store";

// Keys belong to whatever is being typed in or chosen; a focused button keeps Space and Enter.
function ownsKey(target: EventTarget | null, key: string): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target.closest("input, textarea, select")) return true;
  return target.closest("button, a") !== null && (key === " " || key === "Enter");
}

export function useShortcuts(togglePlay: () => void) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const shortcut = shortcutFor(event);
      if (!shortcut || event.repeat || ownsKey(event.target, event.key)) return;
      event.preventDefault();
      const { edl, undo, redo } = useProject.getState();
      const { outT, seek } = usePlayback.getState();
      const clamp = (t: number) => Math.min(Math.max(t, 0), edl.totalS);
      const step = (direction: 1 | -1) => {
        const target = adjacentStart([...stepStarts(edl).values()], outT, direction);
        seek(target ?? (direction === 1 ? edl.totalS : 0));
      };
      if (shortcut === "play") togglePlay();
      else if (shortcut === "back") seek(clamp(outT - SEEK_S));
      else if (shortcut === "forward") seek(clamp(outT + SEEK_S));
      else if (shortcut === "previousStep") step(-1);
      else if (shortcut === "nextStep") step(1);
      else if (shortcut === "undo") undo();
      else redo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay]);
}
