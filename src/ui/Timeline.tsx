"use client";

import { useEffect, useRef } from "react";
import { formatTime } from "@/lib/format";
import { usePlayback } from "@/state/playback";
import { useProject } from "@/state/store";
import type { Segment } from "@/shared/types";

// Prompt cards are dictated, so they carry the voice accent; work is hatched like a blur of
// fast-forward; real time is solid; cards are outlines.
const MODE_STYLE: Record<Segment["mode"], string> = {
  hold: "bg-voice/80",
  fast: "bg-[repeating-linear-gradient(135deg,rgb(255_255_255/0.28)_0_3px,transparent_3px_7px)]",
  real: "bg-fg/70",
  card: "outline outline-1 -outline-offset-1 outline-line-strong",
};

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
      <div className="relative h-10 [container-type:inline-size]">
        <div className="flex h-full gap-px overflow-hidden rounded-[var(--radius-chip)]">
          {edl.segments.map((s) => (
            <div
              key={s.id}
              title={`${MODE_LABEL[s.mode]}${s.step ? `, step ${s.step}` : ""}`}
              style={{ flexGrow: s.outDur }}
              className={`h-full min-w-px basis-0 ${MODE_STYLE[s.mode]}`}
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
            <span className={`size-2.5 rounded-[2px] ${MODE_STYLE[mode]}`} aria-hidden />
            {MODE_LABEL[mode]}
          </li>
        ))}
      </ul>
    </div>
  );
}
