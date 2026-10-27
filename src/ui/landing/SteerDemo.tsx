"use client";

import { useEffect, useState } from "react";
import type { Segment } from "@/shared/types";
import { SEGMENT_CLASS } from "../segmentStyle";
import { useInView } from "./useInView";
import { useReducedMotion } from "./usePageState";

const SENTENCE = "make it a minute and keep the step where export worked";
const TYPE_MS = 38;
const HOLD_MS = 3200;

// An illustrative six-step plan before and after the sentence, as [hold, fast, real] seconds per
// step. With the 2.5 s intro and 3 s outro they sum to exactly 90 and 60: step 4 (export) is kept
// and gains real time, two short reviews drop out.
const INTRO_S = 2.5;
const OUTRO_S = 3;
const BEFORE_S = 90;
const STEPS: { title: string; before: number[]; after: number[] }[] = [
  { title: "Parse the session log", before: [4.5, 3, 7.5], after: [3, 2, 4] },
  { title: "Probe the recording", before: [3, 2, 7.5], after: [2, 1.5, 0] },
  { title: "Align log and video", before: [4, 3, 7.5], after: [3, 2, 4] },
  { title: "Export to mp4", before: [5, 3, 7.5], after: [4, 3, 13.5] },
  { title: "Add the steer box", before: [3, 2, 7.5], after: [2, 1.5, 0] },
  { title: "Ship the landing page", before: [4, 3, 7.5], after: [3, 2, 4] },
];
const KEPT_STEP = 3;
const MODES: Segment["mode"][] = ["hold", "fast", "real"];

type Bar = { mode: Segment["mode"]; before: [number, number]; after: [number, number] };

// Lays both plans out on one 90 s axis, so the shorter reel visibly ends earlier.
function bars(): Bar[] {
  const parts: [Segment["mode"], number, number][] = [["card", INTRO_S, INTRO_S]];
  for (const step of STEPS)
    MODES.forEach((mode, i) => parts.push([mode, step.before[i] ?? 0, step.after[i] ?? 0]));
  parts.push(["card", OUTRO_S, OUTRO_S]);
  let b = 0;
  let a = 0;
  return parts.map(([mode, bs, as]) => {
    const bar: Bar = { mode, before: [b, bs], after: [a, as] };
    b += bs;
    a += as;
    return bar;
  });
}
const BARS = bars();

const total = (parts: number[]) => parts.reduce((sum, s) => sum + s, 0);

// Each bar is laid out at its "before" box and moved to its "after" box with a transform, so the
// re-plan animates on the compositor instead of re-running layout every frame.
function barStyle({ before, after }: Bar, done: boolean) {
  const [bLeft, bWidth] = before;
  const [aLeft, aWidth] = after;
  return {
    left: `${(bLeft / BEFORE_S) * 100}%`,
    width: `${(bWidth / BEFORE_S) * 100}%`,
    transform: done
      ? `translateX(${((aLeft - bLeft) / bWidth) * 100}%) scaleX(${aWidth / bWidth})`
      : "none",
  };
}

// Types the sentence, holds the re-planned reel, then starts over while the section is on screen.
// The section owns this so its example list can light up what the sentence applied.
export function useSteerTyping() {
  const [ref, inView] = useInView<HTMLElement>(0.3, false);
  const still = useReducedMotion();
  const [typed, setTyped] = useState(0);
  // With reduced motion the demo shows only its final state.
  const done = still || typed >= SENTENCE.length;

  useEffect(() => {
    if (!inView || still) return;
    const id = window.setTimeout(
      () => setTyped((n) => (n >= SENTENCE.length ? 0 : n + 1)),
      done ? HOLD_MS : TYPE_MS,
    );
    return () => window.clearTimeout(id);
  }, [inView, still, typed, done]);

  return { ref, typed, done };
}

const MAC_DOTS = ["bg-[#ff5f57]", "bg-[#febc2e]", "bg-[#28c840]"];

export function SteerDemo({ typed, done }: { typed: number; done: boolean }) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-panel)] border border-line-strong bg-canvas/70 shadow-[inset_0_1px_0_rgb(255_255_255/0.06),0_40px_80px_-20px_rgb(0_0_0/0.6)] backdrop-blur">
      <p className="sr-only">
        Example: the spoken sentence &ldquo;{SENTENCE}&rdquo; shortens a 90 second reel to 60
        seconds, gives the export step more real time and drops two short reviews.
      </p>
      <div aria-hidden>
        <div className="flex items-center gap-1.5 border-b border-line px-4 py-3">
          {MAC_DOTS.map((dot) => (
            <span key={dot} className={`size-3 rounded-full ${dot}`} />
          ))}
          <span className="ml-3 font-mono text-xs text-fg-subtle">Buildreel editor</span>
          <span className="ml-auto font-mono text-xs text-fg-subtle tabular-nums">
            Reel {done ? "1:00" : "1:30"}
          </span>
        </div>

        <div className="p-4 sm:p-6">
          <div
            data-typing={typed > 0 && !done}
            className="rounded-full border border-line-strong bg-surface px-5 py-3.5 shadow-[inset_0_1px_0_rgb(255_255_255/0.08)] transition-[border-color,box-shadow] duration-300 data-[typing=true]:border-voice/60 data-[typing=true]:shadow-[0_0_0_4px_rgb(255_122_89/0.12),inset_0_1px_0_rgb(255_255_255/0.08)]"
          >
            <p className="truncate font-mono text-sm text-fg">
              {done ? SENTENCE : SENTENCE.slice(0, typed)}
              <span className="ml-px inline-block h-4 w-px translate-y-0.5 bg-voice" />
            </p>
          </div>
          <p className="mt-3 h-4 font-mono text-xs text-fg-subtle">
            {done ? "Applied: length 60 s, keep step 4" : ""}
          </p>

          <div className="relative mt-5 h-9 overflow-hidden rounded-[var(--radius-chip)]">
            {BARS.map((bar, i) => (
              <div
                key={i}
                style={barStyle(bar, done)}
                className={`absolute inset-y-0 origin-left border-r border-canvas transition-transform duration-700 ease-[var(--ease-out-expo)] motion-reduce:transition-none ${SEGMENT_CLASS[bar.mode]}`}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between font-mono text-xs text-fg-subtle tabular-nums">
            <span>0:00</span>
            <span>1:30</span>
          </div>

          <ol className="mt-6 divide-y divide-line border-t border-line">
            {STEPS.map((step, i) => {
              const before = total(step.before);
              const after = total(step.after);
              return (
                <li key={step.title} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="w-5 font-mono text-xs text-fg-subtle tabular-nums">{i + 1}</span>
                  <span className="truncate text-fg-muted">{step.title}</span>
                  {i === KEPT_STEP && (
                    <span
                      className={`rounded-full border border-line-strong px-2 py-0.5 font-mono text-[11px] text-fg transition-opacity duration-500 ${
                        done ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      kept
                    </span>
                  )}
                  <span
                    className={`ml-auto font-mono text-xs tabular-nums transition-colors duration-500 ${
                      done && after !== before ? "text-fg" : "text-fg-subtle"
                    }`}
                  >
                    {(done ? after : before).toFixed(1)} s
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}
