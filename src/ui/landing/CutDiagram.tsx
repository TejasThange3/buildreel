"use client";

import type { Segment } from "@/shared/types";
import { SEGMENT_CLASS } from "../segmentStyle";
import { useInView } from "./useInView";

// A real cut from this build: the 29 min recording of Phase 4 (one prompt at 1:57, then one long
// agent turn) and the 17.7 s reel Buildreel planned from it.
const RAW_S = 1752;
const REEL_S = 17.7;
const PROMPT_AT = 117;
const WORK_END = 1748;
const REEL = {
  intro: [0, 2.5],
  hold: [2.5, 7.5],
  fast: [7.5, 10.5],
  real: [10.5, 14.7],
  outro: [14.7, 17.7],
} as const;

// The reel bar, cell by cell; cards are outlines, the rest use the editor timeline fills.
const REEL_BARS = [
  { span: REEL.intro, fill: "none", stroke: "var(--color-line-strong)" },
  { span: REEL.hold, fill: "var(--color-voice)", opacity: 0.85 },
  { span: REEL.fast, fill: "url(#hatch)" },
  { span: REEL.real, fill: "var(--color-fg)", opacity: 0.75 },
  { span: REEL.outro, fill: "none", stroke: "var(--color-line-strong)" },
];

const W = 1000;
const TOP = 8;
const BOTTOM = 172;
const BAR = 36;
const rawX = (s: number) => (s / RAW_S) * W;
const reelX = (s: number) => (s / REEL_S) * W;

function band(rawFrom: number, rawTo: number, reelFrom: number, reelTo: number) {
  const y0 = TOP + BAR;
  return `M${rawX(rawFrom)},${y0} L${rawX(rawTo)},${y0} L${reelX(reelTo)},${BOTTOM} L${reelX(reelFrom)},${BOTTOM} Z`;
}

// One card under each reel cell, saying what plays there. The card grid's columns are the REEL
// durations (2.5, 5, 3, 4.2, 3); Tailwind needs them as a literal class.
const PARTS: { mode: Segment["mode"]; value: string; label: string; text: string }[] = [
  { mode: "card", value: "2.5 s", label: "Title", text: 'Opens on "How I built it"' },
  { mode: "hold", value: "5 s", label: "Prompt", text: "Your prompt, as you dictated it" },
  { mode: "fast", value: "532x", label: "Agent", text: "26 min of work, with its tool calls" },
  {
    mode: "real",
    value: "1x",
    label: "Review",
    text: "You checking it, where the screen moved most",
  },
  { mode: "card", value: "3 s", label: "Stats", text: "Steps, words dictated, time cut" },
];

export function CutDiagram() {
  const [ref, shown] = useInView<HTMLDivElement>();
  const reveal = (i: number) => ({
    opacity: shown ? 1 : 0,
    transition: `opacity 700ms var(--ease-out-expo) ${180 + i * 160}ms`,
  });

  return (
    <div ref={ref}>
      <div className="flex justify-between gap-4 font-mono text-xs text-fg-subtle">
        <span>
          Recording, 29 min, <span className="text-voice">prompt at 1:57</span>
        </span>
        <span className="tabular-nums">29:12</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${BOTTOM + BAR + 8}`}
        className="mt-3 w-full overflow-visible"
        role="img"
        aria-label="A 29 minute recording mapped onto an 18 second reel: the prompt becomes a 5 second card, 26 minutes of agent work become a 3 second timelapse, and the final check plays in real time."
      >
        <defs>
          <pattern
            id="hatch"
            width="7"
            height="7"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="3" height="7" fill="rgb(255 255 255 / 0.22)" />
          </pattern>
        </defs>
        <rect x="0" y={TOP} width={W} height={BAR} rx="6" fill="url(#hatch)" />
        <rect
          x={rawX(PROMPT_AT) - 2}
          y={TOP - 4}
          width="4"
          height={BAR + 8}
          rx="2"
          fill="var(--color-voice)"
        />
        <rect
          x={rawX(WORK_END)}
          y={TOP}
          width={W - rawX(WORK_END)}
          height={BAR}
          fill="var(--color-fg)"
        />

        <path
          d={band(PROMPT_AT, PROMPT_AT, REEL.hold[0], REEL.hold[1])}
          fill="var(--color-voice)"
          fillOpacity="0.18"
          style={reveal(0)}
        />
        <path
          d={band(PROMPT_AT, WORK_END, REEL.fast[0], REEL.fast[1])}
          fill="rgb(255 255 255 / 0.06)"
          style={reveal(1)}
        />
        <path
          d={band(WORK_END, RAW_S, REEL.real[0], REEL.real[1])}
          fill="rgb(255 255 255 / 0.16)"
          style={reveal(2)}
        />

        <g style={reveal(3)}>
          {REEL_BARS.map(({ span, fill, stroke, opacity }) => (
            <rect
              key={span[0]}
              x={reelX(span[0])}
              y={BOTTOM}
              width={reelX(span[1] - span[0]) - 3}
              height={BAR}
              rx="4"
              fill={fill}
              fillOpacity={opacity}
              stroke={stroke}
            />
          ))}
        </g>
      </svg>
      <ol className="mt-6 grid gap-3 sm:grid-cols-[2.5fr_5fr_3fr_4.2fr_3fr]">
        {PARTS.map(({ mode, value, label, text }, i) => (
          <li
            key={label}
            style={reveal(i)}
            className="flex gap-4 rounded-[var(--radius-panel)] border border-line bg-surface p-4 sm:flex-col sm:gap-0"
          >
            <div className="flex items-center gap-2 font-mono text-xs text-fg-subtle sm:w-auto max-sm:w-20 max-sm:shrink-0">
              <span aria-hidden className={`size-2.5 rounded-[3px] ${SEGMENT_CLASS[mode]}`} />
              {label}
            </div>
            <div className="sm:mt-6">
              <p className="text-xl font-semibold tracking-tight tabular-nums lg:text-2xl">
                {value}
              </p>
              <p className="mt-1 text-sm leading-snug text-pretty text-fg-muted">{text}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
