"use client";

import { formatTime } from "@/lib/format";
import { stepStarts } from "@/lib/plan/remap";
import { usePlayback } from "@/state/playback";
import { useProject } from "@/state/store";

export function StepList() {
  const steps = useProject((s) => s.steps);
  const edl = useProject((s) => s.edl);
  const dropped = useProject((s) => s.constraints.dropped);
  const toggleStep = useProject((s) => s.toggleStep);
  const seek = usePlayback((s) => s.seek);

  const startOf = stepStarts(edl);

  return (
    <ol className="flex flex-col gap-1" aria-label="Steps">
      {steps.map((step) => {
        const off = dropped.includes(step.index);
        const reelT = startOf.get(step.index);
        const status = off ? "Dropped" : reelT === undefined ? "Cut for time" : formatTime(reelT);
        return (
          <li
            key={step.index}
            data-off={off || reelT === undefined}
            className="group flex items-start gap-3 rounded-[var(--radius-chip)] p-2 transition-colors hover:bg-surface data-[off=true]:opacity-55"
          >
            <button
              type="button"
              disabled={reelT === undefined}
              onClick={() => reelT !== undefined && seek(reelT)}
              className="flex min-w-0 flex-1 items-start gap-3 text-left disabled:cursor-default"
            >
              <span className="w-6 shrink-0 pt-0.5 text-right font-mono text-xs text-fg-subtle tabular-nums">
                {step.index}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{step.title}</span>
                <span className="mt-0.5 block font-mono text-xs text-fg-subtle tabular-nums">
                  {status}
                </span>
              </span>
            </button>
            <label className="relative mt-0.5 inline-flex h-6 w-10 shrink-0 cursor-pointer items-center">
              <input
                type="checkbox"
                checked={!off}
                onChange={() => toggleStep(step.index)}
                aria-label={`Keep step ${step.index}`}
                className="peer sr-only"
              />
              <span className="absolute inset-0 rounded-full bg-raised outline outline-1 -outline-offset-1 outline-line transition-colors peer-checked:bg-fg peer-focus-visible:outline-2 peer-focus-visible:outline-fg" />
              <span className="relative ml-1 size-4 rounded-full bg-fg-subtle transition-transform duration-200 ease-[var(--ease-out-expo)] peer-checked:translate-x-4 peer-checked:bg-canvas" />
            </label>
          </li>
        );
      })}
    </ol>
  );
}
