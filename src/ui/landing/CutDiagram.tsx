"use client";

import { type PointerEvent, useState } from "react";
import type { Segment } from "@/shared/types";
import { formatTime } from "@/lib/format";
import { SEGMENT_CLASS } from "../segmentStyle";
import { useInView } from "./useInView";

// A real cut from this build: the 29 min recording of Phase 4 (one prompt at 1:57, then one long
// agent turn) and the 17.7 s reel Buildreel planned from it.
const RAW_S = 1752;
const REEL_S = 17.7;
const PROMPT_AT = 117;
const WORK_END = 1748;

type Part = {
  mode: Segment["mode"];
  span: [number, number];
  value: string;
  label: string;
  text: string;
  // Where this part comes from in the recording, as a function of reel time; cards have none.
  source?: (t: number) => number;
  band?: [number, number];
};

const PARTS: Part[] = [
  {
    mode: "card",
    span: [0, 2.5],
    value: "2.5 s",
    label: "Title",
    text: "Opens on the reel's title",
  },
  {
    mode: "hold",
    span: [2.5, 7.5],
    value: "5 s",
    label: "Prompt",
    text: "Your prompt, as you dictated it, held long enough to read",
    source: () => PROMPT_AT,
    band: [PROMPT_AT, PROMPT_AT],
  },
  {
    mode: "fast",
    span: [7.5, 10.5],
    value: "532x",
    label: "Agent",
    text: "26 min of agent work in 3 s, with its tool calls",
    source: (t) => PROMPT_AT + ((t - 7.5) / 3) * (WORK_END - PROMPT_AT),
    band: [PROMPT_AT, WORK_END],
  },
  {
    mode: "real",
    span: [10.5, 14.7],
    value: "1x",
    label: "Review",
    text: "You checking the result, where the screen moved most",
    source: (t) => Math.min(WORK_END + (t - 10.5), RAW_S),
    band: [WORK_END, RAW_S],
  },
  {
    mode: "card",
    span: [14.7, 17.7],
    value: "3 s",
    label: "Stats",
    text: "Steps, words dictated, time cut",
  },
];

const W = 1000;
const TOP = 8;
const BAR = 36;
const BOTTOM = 172;
const rawX = (s: number) => (s / RAW_S) * W;
const reelX = (s: number) => (s / REEL_S) * W;

function band([rawFrom, rawTo]: [number, number], [reelFrom, reelTo]: [number, number]) {
  const y0 = TOP + BAR;
  return `M${rawX(rawFrom)},${y0} L${rawX(rawTo)},${y0} L${reelX(reelTo)},${BOTTOM} L${reelX(reelFrom)},${BOTTOM} Z`;
}

const partAt = (t: number) => PARTS.findIndex(({ span }) => t >= span[0] && t < span[1]);

export function CutDiagram() {
  const [ref, shown] = useInView<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  // The reel time under the pointer, while it is over the reel bar.
  const [scrub, setScrub] = useState<number | null>(null);

  const reveal = (i: number) => ({
    opacity: shown ? 1 : 0,
    transition: `opacity 700ms var(--ease-out-expo) ${180 + i * 140}ms`,
  });
  const emphasis = (i: number) => (active === null ? 1 : active === i ? 1 : 0.3);

  const onScrub = (e: PointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const t = Math.min(Math.max(((e.clientX - box.left) / box.width) * REEL_S, 0), REEL_S - 0.01);
    setScrub(t);
    setActive(partAt(t));
  };
  const endScrub = () => {
    setScrub(null);
    setActive(null);
  };

  const scrubPart = scrub === null ? undefined : PARTS[partAt(scrub)];
  const scrubSource = scrub === null ? undefined : scrubPart?.source?.(scrub);

  return (
    <div ref={ref}>
      <div className="flex items-baseline justify-between gap-4 font-mono text-xs text-fg-subtle">
        <span>
          Recording, 29 min, <span className="text-voice">prompt at 1:57</span>
        </span>
        <span aria-live="polite" className="text-right tabular-nums max-sm:hidden">
          {scrub === null
            ? "Move along the reel"
            : `Reel ${formatTime(scrub)}  ·  ${
                scrubSource === undefined
                  ? "card, not from the recording"
                  : `recording ${formatTime(scrubSource)}`
              }`}
        </span>
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
        {PARTS.map(
          ({ band: b }, i) =>
            b &&
            b[1] > b[0] && (
              <rect
                key={i}
                x={rawX(b[0])}
                y={TOP}
                width={rawX(b[1]) - rawX(b[0])}
                height={BAR}
                fill="rgb(255 255 255 / 0.22)"
                style={{ opacity: active === i ? 1 : 0, transition: "opacity 250ms" }}
              />
            ),
        )}
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

        {PARTS.map(
          ({ band: b, span, mode }, i) =>
            b && (
              <g key={i} style={reveal(i)}>
                <path
                  d={band(b, span)}
                  fill={mode === "hold" ? "var(--color-voice)" : "rgb(255 255 255)"}
                  fillOpacity={mode === "hold" ? 0.18 : mode === "fast" ? 0.06 : 0.16}
                  style={{ opacity: emphasis(i), transition: "opacity 250ms" }}
                />
              </g>
            ),
        )}

        <g style={reveal(4)}>
          {PARTS.map(({ span, mode }, i) => (
            <rect
              key={i}
              x={reelX(span[0])}
              y={BOTTOM}
              width={reelX(span[1] - span[0]) - 3}
              height={BAR}
              rx="4"
              fill={
                mode === "card"
                  ? "var(--color-canvas)"
                  : mode === "hold"
                    ? "var(--color-voice)"
                    : mode === "fast"
                      ? "url(#hatch)"
                      : "var(--color-fg)"
              }
              fillOpacity={mode === "hold" ? 0.85 : mode === "real" ? 0.75 : 1}
              stroke={active === i ? "var(--color-fg)" : "var(--color-line-strong)"}
              strokeWidth={active === i ? 2 : 1}
              style={{ opacity: emphasis(i), transition: "opacity 250ms" }}
            />
          ))}
        </g>

        {scrub !== null && (
          <g pointerEvents="none">
            {scrubSource !== undefined && (
              <line
                x1={rawX(scrubSource)}
                y1={TOP + BAR}
                x2={reelX(scrub)}
                y2={BOTTOM}
                stroke="var(--color-fg)"
                strokeOpacity="0.5"
                strokeDasharray="3 4"
              />
            )}
            <rect
              x={reelX(scrub) - 1}
              y={BOTTOM - 6}
              width="2"
              height={BAR + 12}
              rx="1"
              fill="var(--color-fg)"
            />
            {scrubSource !== undefined && (
              <rect
                x={rawX(scrubSource) - 1}
                y={TOP - 6}
                width="2"
                height={BAR + 12}
                rx="1"
                fill="var(--color-fg)"
              />
            )}
          </g>
        )}
        {/* The hit area covers the reel bar plus some slack, so scrubbing does not flicker. */}
        <rect
          x="0"
          y={BOTTOM - 14}
          width={W}
          height={BAR + 28}
          fill="transparent"
          className="cursor-ew-resize"
          onPointerMove={onScrub}
          onPointerLeave={endScrub}
        />
      </svg>

      <ol className="mt-8 grid gap-3 sm:grid-cols-[2.5fr_5fr_3fr_4.2fr_3fr]">
        {PARTS.map(({ mode, value, label, text }, i) => (
          <li key={label} style={reveal(i)} className="flex">
            <div
              onPointerEnter={() => setActive(i)}
              onPointerLeave={() => setActive(null)}
              data-active={active === i}
              data-dim={active !== null && active !== i}
              className="group relative flex w-full flex-col overflow-hidden rounded-[var(--radius-panel)] border border-line bg-surface p-5 transition-[transform,border-color,background-color,opacity] duration-300 ease-[var(--ease-out-expo)] data-[active=true]:-translate-y-1 data-[active=true]:border-line-strong data-[active=true]:bg-raised data-[dim=true]:opacity-50"
            >
              <span
                aria-hidden
                className={`absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 transition-transform duration-500 ease-[var(--ease-out-expo)] group-data-[active=true]:scale-x-100 ${SEGMENT_CLASS[mode]}`}
              />
              <div className="flex items-center gap-2 font-mono text-xs text-fg-subtle">
                <span aria-hidden className={`size-2.5 rounded-[3px] ${SEGMENT_CLASS[mode]}`} />
                {label}
              </div>
              <p className="mt-8 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
              <p className="mt-1.5 text-sm leading-snug text-pretty text-fg-muted">{text}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
