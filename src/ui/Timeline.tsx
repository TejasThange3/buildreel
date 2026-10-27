"use client";

import { useEffect, useRef } from "react";
import { formatTime } from "@/lib/format";
import { usePlayback } from "@/state/playback";
import { useProject } from "@/state/store";
import type { Segment } from "@/shared/types";
import { SEGMENT_CLASS } from "./segmentStyle";

const MODE_LABEL: Record<Segment["mode"], string> = {
  hold: "Prompt",
  fast: "Agent working",
  real: "Real time",
  card: "Card",
};

export function Timeline() {
  const edl = useProject((s) => s.edl);
  const playhead = useRef<HTMLDivElement>(null);
  const range = useRef<HTMLInputElement>(null);

  // The playhead follows the clock outside React, so the strip never re-renders per frame.
  useEffect(() => {
    const place = (outT: number) => {
      const at = edl.totalS > 0 ? outT / edl.totalS : 0;
      playhead.current?.style.setProperty("transform", `translateX(${at * 100}cqw)`);
      if (range.current) {
        range.current.value = String(outT);
        range.current.setAttribute("aria-valuetext", formatTime(outT));
      }
    };
    place(usePlayback.getState().outT);
    return usePlayback.subscribe((s) => place(s.outT));
  }, [edl]);

  return (
    <div>
      <div className="relative h-10 rounded-[var(--radius-chip)] [container-type:inline-size] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-fg">
        <div className="flex h-full gap-px overflow-hidden rounded-[var(--radius-chip)]">
          {edl.segments.map((s) => (
            <div
              key={s.id}
              title={`${MODE_LABEL[s.mode]}${s.step ? `, step ${s.step}` : ""}`}
              style={{ flexGrow: s.outDur }}
              className={`h-full min-w-px basis-0 ${SEGMENT_CLASS[s.mode]}`}
            />
          ))}
        </div>
        <div
          ref={playhead}
          className="pointer-events-none absolute inset-y-[-4px] left-0 w-0.5 bg-fg will-change-transform"
        />
        <input
          ref={range}
          type="range"
          min={0}
          max={edl.totalS}
          step={0.1}
          defaultValue={0}
          onChange={(e) => usePlayback.getState().seek(Number(e.target.value))}
          aria-label="Reel position"
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-fg-subtle">
        {(["hold", "fast", "real"] as const).map((mode) => (
          <li key={mode} className="flex items-center gap-2">
            <span className={`size-2.5 rounded-[2px] ${SEGMENT_CLASS[mode]}`} aria-hidden />
            {MODE_LABEL[mode]}
          </li>
        ))}
      </ul>
    </div>
  );
}
