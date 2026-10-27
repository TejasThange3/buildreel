"use client";

import { useEffect, useState } from "react";
import { useInView } from "./useInView";
import { usePageVisible, useReducedMotion } from "./usePageState";

// What leaves the browser, shown as it happens: log lines pass the redactor one by one, and only
// the cleaned text arrives at the server. Lines are shortened samples of what redact.ts removes.
const FILES = [
  { name: "screen-recording.mkv", note: "decoded here" },
  { name: "session.jsonl", note: "parsed here" },
  { name: "every frame", note: "drawn here" },
  { name: "reel.mp4", note: "encoded here" },
];
const LINES = [
  { keep: "ANTHROPIC_API_KEY=", secret: "sk-ant-x91…" },
  { keep: "send it to ", secret: "dev@example.com" },
  { keep: "Authorization: Bearer ", secret: "eyJ0eXAi…" },
];
const ARRIVALS = [
  { kind: "dictated", text: "make it a minute" },
  { kind: "step title", text: "Export to mp4" },
];

// One tick per beat: three redactions, two arrivals, then a hold before the loop restarts.
const TICK_MS = 750;
const TICKS = 10;
const FINAL = TICKS - 1;

const ZONE = "group flex flex-col p-6 transition-colors duration-300 hover:bg-white/[0.02] sm:p-8";
const ZONE_HEAD = "flex items-baseline justify-between font-mono text-xs text-fg-subtle";
const VISUAL = "mt-6 flex flex-col gap-2 lg:h-44";

export function PrivacyFlow() {
  const [ref, inView] = useInView<HTMLDivElement>(0.35, false);
  const visible = usePageVisible();
  const still = useReducedMotion();
  const [tick, setTick] = useState(0);
  const playing = inView && visible && !still;
  const beat = still ? FINAL : tick;

  useEffect(() => {
    if (!playing) return;
    const id = window.setTimeout(() => setTick((t) => (t + 1) % TICKS), TICK_MS);
    return () => window.clearTimeout(id);
  }, [playing, tick]);

  return (
    <div
      ref={ref}
      className="relative grid overflow-hidden rounded-[var(--radius-panel)] border border-line bg-surface/60 lg:grid-cols-3"
    >
      <p className="sr-only">
        Your recording, logs, frames and exported video stay in your browser. Keys, tokens and
        emails are removed from any text before it is sent. Only the sentence you dictate and short
        step titles reach the server.
      </p>

      <section aria-hidden className={ZONE}>
        <div className={ZONE_HEAD}>
          <span>01</span>
          <span>your browser</span>
        </div>
        <ul className={VISUAL}>
          {FILES.map(({ name, note }) => (
            <li
              key={name}
              className="flex items-center justify-between rounded-[var(--radius-chip)] border border-line bg-canvas/60 px-3 py-2.5 font-mono text-xs transition-colors duration-300 group-hover:border-line-strong"
            >
              <span className="text-fg">{name}</span>
              <span className="text-fg-subtle">{note}</span>
            </li>
          ))}
        </ul>
        <h3 className="mt-6 text-lg font-semibold tracking-tight">Stays in your browser</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
          Video and logs are read, cut and encoded on your machine.
        </p>
      </section>

      <section aria-hidden className={`${ZONE} border-line max-lg:border-t lg:border-l`}>
        <div className={ZONE_HEAD}>
          <span>02</span>
          <span>redact.ts</span>
        </div>
        <ul className={VISUAL}>
          {LINES.map(({ keep, secret }, i) => {
            const cleaned = beat > i;
            return (
              <li
                key={keep}
                className="relative truncate rounded-[var(--radius-chip)] border border-line bg-canvas/60 px-3 py-2.5 font-mono text-xs transition-colors duration-300 group-hover:border-line-strong text-fg-muted"
              >
                {keep}
                <span className="relative inline-grid align-bottom">
                  <span
                    className={`col-start-1 row-start-1 text-fg transition-[opacity,filter] duration-300 ${cleaned ? "opacity-0 blur-[3px]" : ""}`}
                  >
                    {secret}
                  </span>
                  <span
                    className={`col-start-1 row-start-1 w-fit rounded bg-white/10 px-1 text-fg-subtle transition-opacity duration-300 ${cleaned ? "" : "opacity-0"}`}
                  >
                    [redacted]
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
        <h3 className="mt-6 text-lg font-semibold tracking-tight">Cleaned on the way out</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
          Keys, tokens and emails are removed before any text is shown or sent.
        </p>
      </section>

      <section aria-hidden className={`${ZONE} border-line max-lg:border-t lg:border-l`}>
        <div className={ZONE_HEAD}>
          <span>03</span>
          <span>POST /api/steer</span>
        </div>
        <ul className={VISUAL}>
          {ARRIVALS.map(({ kind, text }, i) => {
            const arrived = beat > LINES.length + i;
            return (
              <li
                key={text}
                style={{
                  opacity: arrived ? 1 : 0,
                  transform: arrived ? "none" : "translateX(-16px)",
                }}
                className="flex items-center justify-between rounded-[var(--radius-chip)] border border-line bg-canvas/60 px-3 py-2.5 font-mono text-xs transition-[opacity,transform,border-color] duration-500 ease-[var(--ease-out-expo)] group-hover:border-line-strong"
              >
                <span className="text-fg">&ldquo;{text}&rdquo;</span>
                <span className={kind === "dictated" ? "text-voice" : "text-fg-subtle"}>
                  {kind}
                </span>
              </li>
            );
          })}
        </ul>
        <h3 className="mt-6 text-lg font-semibold tracking-tight">Reaches our server</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
          Only the sentence you dictate and short step titles, so the planner understands you.
        </p>
      </section>
    </div>
  );
}
