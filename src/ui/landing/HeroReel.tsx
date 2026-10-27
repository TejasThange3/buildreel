"use client";

import { useEffect, useState } from "react";
import { SEGMENT_CLASS } from "../segmentStyle";
import { useInView } from "./useInView";
import { usePageVisible, useReducedMotion } from "./usePageState";

// What a Buildreel reel looks like, played inside the hero glass: the dictated prompt, the agent's
// work fast-forwarded, then the result in real time. Text is sized in cqw of the slab so it scales
// with the glass from phones to wide screens.
const PHASES = [
  { mode: "hold", ms: 3200 },
  { mode: "fast", ms: 3000 },
  { mode: "real", ms: 2800 },
] as const;

const TOOLS = ["Edit Timeline.tsx", "Bash npm test", "Edit segmentStyle.ts", "Read store.ts"];

export function HeroReel() {
  const [ref, inView] = useInView<HTMLDivElement>(0.2, false);
  const visible = usePageVisible();
  const still = useReducedMotion();
  const [phase, setPhase] = useState(0);
  // Pausing drops the progress animation, so resuming restarts it together with a full timer.
  const playing = inView && visible && !still;

  useEffect(() => {
    if (!playing) return;
    const id = window.setTimeout(() => setPhase((p) => (p + 1) % PHASES.length), PHASES[phase]?.ms);
    return () => window.clearTimeout(id);
  }, [playing, phase]);

  const show = (i: number) =>
    `absolute inset-0 transition-[opacity,transform] duration-500 ease-[var(--ease-out-expo)] ${
      phase === i ? "opacity-100" : "pointer-events-none translate-y-[1cqw] opacity-0"
    }`;

  return (
    <div
      ref={ref}
      className="absolute inset-[10cqw] flex flex-col overflow-hidden rounded-[2.5cqw] bg-black/45 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)]"
    >
      <div className="relative flex-1">
        <div className={show(0)}>
          <div className="flex h-full flex-col px-[4cqw] pt-[3.5cqw]">
            <div className="flex items-center justify-between font-mono text-[2.6cqw] text-fg-subtle">
              <span>Step 3</span>
              <span className="inline-flex items-center gap-[1cqw] rounded-full bg-voice/15 px-[1.6cqw] py-[0.4cqw] text-[2.2cqw] tracking-wider text-voice">
                <span className="size-[1.1cqw] rounded-full bg-voice" />
                DICTATED
              </span>
            </div>
            <p className="mt-[3cqw] text-[3.6cqw] leading-snug font-medium text-pretty text-fg">
              Add a timeline strip coloured by segment mode, with a playhead I can drag.
            </p>
          </div>
        </div>

        <div className={show(1)}>
          <div className="flex h-full flex-col px-[4cqw] pt-[3.5cqw]">
            <div className="flex items-baseline justify-between font-mono text-[2.6cqw] text-fg-subtle">
              <span>Agent working</span>
              <span className="text-[5cqw] font-semibold text-fg tabular-nums">280x</span>
            </div>
            <ul className="mt-[2cqw] flex flex-wrap gap-[1.2cqw]">
              {TOOLS.map((tool, i) => (
                <li
                  key={tool}
                  style={{ transitionDelay: phase === 1 ? `${250 + i * 450}ms` : "0ms" }}
                  className={`rounded-[1cqw] border border-white/10 bg-white/5 px-[1.6cqw] py-[0.6cqw] font-mono text-[2.4cqw] text-fg-muted transition-opacity duration-300 ${
                    phase === 1 ? "opacity-100" : "opacity-0"
                  }`}
                >
                  {tool}
                </li>
              ))}
            </ul>
            <p className="mt-auto pb-[2cqw] font-mono text-[2.4cqw] text-fg-subtle">
              14 min of work, 3 s on screen
            </p>
          </div>
        </div>

        <div className={show(2)}>
          <div className="flex h-full flex-col px-[4cqw] pt-[3.5cqw]">
            <div className="flex items-baseline justify-between font-mono text-[2.6cqw] text-fg-subtle">
              <span>You checking it</span>
              <span className="text-[5cqw] font-semibold text-fg tabular-nums">1x</span>
            </div>
            <div className="mt-[2.5cqw] overflow-hidden rounded-[1.2cqw] border border-white/10 bg-raised/80">
              <div className="flex items-center gap-[0.8cqw] border-b border-white/10 px-[1.6cqw] py-[1cqw]">
                {[0, 1, 2].map((dot) => (
                  <span key={dot} className="size-[1cqw] rounded-full bg-white/20" />
                ))}
                <span className="ml-[1cqw] font-mono text-[2cqw] text-fg-subtle">
                  localhost:3000
                </span>
              </div>
              <div className="relative m-[2cqw] flex h-[4cqw] gap-[0.4cqw]">
                {(["card", "hold", "fast", "real", "hold", "fast", "real", "card"] as const).map(
                  (mode, i) => (
                    <div key={i} className={`flex-1 rounded-[0.5cqw] ${SEGMENT_CLASS[mode]}`} />
                  ),
                )}
                <div
                  className={`absolute -inset-y-[0.8cqw] inset-x-0 ${
                    playing && phase === 2 ? "animate-[sweep_2600ms_linear_both]" : ""
                  }`}
                >
                  <div className="h-full w-[0.4cqw] rounded-full bg-fg" />
                </div>
              </div>
            </div>
            <p className="mt-auto pb-[2cqw] font-mono text-[2.4cqw] text-fg-subtle">
              Real time, with your cursor
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-[0.6cqw] px-[4cqw] pb-[3cqw]">
        {PHASES.map(({ mode, ms }, i) => (
          <div key={mode} className="h-[0.9cqw] flex-1 overflow-hidden rounded-full bg-white/10">
            {/* The active part runs a fill animation, which restarts each time it becomes active. */}
            <div
              style={{
                transform: `scaleX(${i < phase || (still && i === phase) ? 1 : 0})`,
                animation: playing && i === phase ? `fill-x ${ms}ms linear forwards` : undefined,
              }}
              className={`h-full origin-left ${SEGMENT_CLASS[mode]}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
