"use client";

import { useProject } from "@/state/store";

const TARGETS = [30, 60, 90];

export function TargetPicker() {
  const targetS = useProject((s) => s.constraints.targetS);
  const setTarget = useProject((s) => s.setTarget);

  return (
    <div
      role="radiogroup"
      aria-label="Reel length"
      className="inline-flex rounded-full bg-surface p-1 outline outline-1 -outline-offset-1 outline-line"
    >
      {TARGETS.map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={targetS === s}
          onClick={() => setTarget(s)}
          className="h-8 rounded-full px-3.5 font-mono text-xs text-fg-muted tabular-nums transition-colors aria-checked:bg-fg aria-checked:text-canvas hover:text-fg aria-checked:hover:text-canvas"
        >
          {s}s
        </button>
      ))}
    </div>
  );
}
