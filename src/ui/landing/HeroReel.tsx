"use client";

import { SEGMENT_CLASS } from "../segmentStyle";
import { useInView } from "./useInView";
import { usePageVisible, useReducedMotion } from "./usePageState";

// One reel, drawn as a frosted track on the glass face: the title card, then per step the dictated
// prompt (coral), the agent fast-forwarded (hatched) and the review (solid), then the stats card.
// No text sits over the light, only the track and a playhead. Sized in cqw of the slab.
const REEL: [keyof typeof SEGMENT_CLASS, number][] = [
  ["card", 2.5],
  ["hold", 4],
  ["fast", 3],
  ["real", 6],
  ["hold", 3.5],
  ["fast", 2.5],
  ["real", 7],
  ["hold", 4],
  ["fast", 3],
  ["real", 5.5],
  ["card", 3],
];
const LOOP_MS = 9000;

export function HeroReel() {
  const [ref, inView] = useInView<HTMLDivElement>(0.2, false);
  const visible = usePageVisible();
  const still = useReducedMotion();
  const playing = inView && visible && !still;

  return (
    <div ref={ref} className="absolute inset-x-[9cqw] bottom-[8.5cqw]">
      <div className="flex items-baseline justify-between font-mono text-[2.4cqw] text-white/55">
        <span>reel.mp4</span>
        <span className="tabular-nums">1:30</span>
      </div>
      <div className="relative mt-[1.6cqw] rounded-[1.6cqw] border border-white/15 bg-white/[0.04] p-[0.9cqw] shadow-[inset_0_1px_0_rgb(255_255_255/0.18)] backdrop-blur-[3px]">
        <div className="flex h-[3.6cqw] gap-[0.5cqw]">
          {REEL.map(([mode, seconds], i) => (
            <div
              key={i}
              style={{ flexGrow: seconds }}
              className={`basis-0 rounded-[0.7cqw] opacity-90 ${SEGMENT_CLASS[mode]}`}
            />
          ))}
        </div>
        {/* A full-width track that slides, so the playhead moves by transform alone. */}
        <div
          style={{
            animation: `sweep ${LOOP_MS}ms linear infinite`,
            animationPlayState: playing ? "running" : "paused",
          }}
          className="pointer-events-none absolute inset-y-[-0.8cqw] right-[0.9cqw] left-[0.9cqw]"
        >
          <div className="h-full w-[0.45cqw] -translate-x-1/2 rounded-full bg-white shadow-[0_0_2cqw_0.4cqw_rgb(255_255_255/0.45)]" />
        </div>
      </div>
    </div>
  );
}
