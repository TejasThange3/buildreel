"use client";

import { useEffect, useState } from "react";
import type { Segment } from "@/shared/types";
import { SEGMENT_CLASS } from "../segmentStyle";
import { useInView } from "./useInView";

const SENTENCE = "make it a minute and keep the step where export worked";
const TYPE_MS = 38;
const HOLD_MS = 2600;

// An illustrative 90 s plan and the 60 s plan the sentence produces (they sum to exactly 90 and
// 60): step 4 (export) is kept and gains real time, two short reviews drop out. [mode, seconds].
type Mode = Segment["mode"];
const BEFORE: [Mode, number][] = [
  ["card", 2.5],
  ["hold", 4.5],
  ["fast", 3],
  ["real", 7.5],
  ["hold", 3],
  ["fast", 2],
  ["real", 7.5],
  ["hold", 4],
  ["fast", 3],
  ["real", 7.5],
  ["hold", 5],
  ["fast", 3],
  ["real", 7.5],
  ["hold", 3],
  ["fast", 2],
  ["real", 7.5],
  ["hold", 4],
  ["fast", 3],
  ["real", 7.5],
  ["card", 3],
];
const AFTER: [Mode, number][] = [
  ["card", 2.5],
  ["hold", 3],
  ["fast", 2],
  ["real", 4],
  ["hold", 2],
  ["fast", 1.5],
  ["real", 0],
  ["hold", 3],
  ["fast", 2],
  ["real", 4],
  ["hold", 4],
  ["fast", 3],
  ["real", 13.5],
  ["hold", 2],
  ["fast", 1.5],
  ["real", 0],
  ["hold", 3],
  ["fast", 2],
  ["real", 4],
  ["card", 3],
];

export function SteerDemo() {
  const [ref, inView] = useInView<HTMLDivElement>(0.5, false);
  const [typed, setTyped] = useState(0);
  const done = typed >= SENTENCE.length;

  // Types the sentence, holds the re-planned reel, then starts over while the demo is on screen.
  useEffect(() => {
    if (!inView) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (still) {
      const id = requestAnimationFrame(() => setTyped(SENTENCE.length));
      return () => cancelAnimationFrame(id);
    }
    const id = window.setTimeout(
      () => setTyped((n) => (n >= SENTENCE.length ? 0 : n + 1)),
      done ? HOLD_MS : TYPE_MS,
    );
    return () => window.clearTimeout(id);
  }, [inView, typed, done]);

  return (
    <div ref={ref} className="mx-auto w-full max-w-2xl">
      <p className="sr-only">
        Example: the spoken sentence &ldquo;{SENTENCE}&rdquo; shortens a 90 second reel to 60
        seconds and keeps the step where export worked.
      </p>
      <div
        data-typing={typed > 0 && !done}
        className="rounded-full border border-line-strong bg-surface/80 px-5 py-3.5 shadow-[inset_0_1px_0_rgb(255_255_255/0.08)] backdrop-blur transition-[border-color,box-shadow] duration-300 data-[typing=true]:border-voice/60 data-[typing=true]:shadow-[0_0_0_4px_rgb(255_122_89/0.12),inset_0_1px_0_rgb(255_255_255/0.08)]"
      >
        <p aria-hidden className="truncate font-mono text-sm text-fg">
          {SENTENCE.slice(0, typed)}
          <span aria-hidden className="ml-px inline-block h-4 w-px translate-y-0.5 bg-voice" />
        </p>
      </div>

      <p className="mt-4 h-5 text-center font-mono text-xs text-fg-subtle" aria-live="polite">
        {done ? "Applied: length 60 s, keep step 4" : ""}
      </p>

      {/* Both plans are drawn and crossfade, so the change animates only opacity. */}
      <div className="relative mt-6 h-9" aria-hidden>
        {[BEFORE, AFTER].map((plan, p) => (
          <div
            key={p}
            style={{ opacity: (p === 1) === done ? 1 : 0 }}
            className="absolute inset-0 flex gap-px overflow-hidden rounded-[var(--radius-chip)] transition-opacity duration-500 ease-[var(--ease-out-expo)]"
          >
            {plan.map(([mode, seconds], i) => (
              <div
                key={i}
                style={{ flexGrow: seconds }}
                className={`h-full basis-0 ${SEGMENT_CLASS[mode]}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between font-mono text-xs text-fg-subtle tabular-nums">
        <span>0:00</span>
        <span>{done ? "1:00" : "1:30"}</span>
      </div>
    </div>
  );
}
