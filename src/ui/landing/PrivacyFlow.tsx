"use client";

import { useEffect, useState } from "react";
import { redact } from "@/lib/log/redact";
import { useInView } from "./useInView";
import { usePageVisible, useReducedMotion } from "./usePageState";

// What leaves the browser, shown as it happens: log lines pass the redactor one by one, and only
// the cleaned text arrives at the server. The cleaned lines are redact()'s own output.
const FILES = [
  { name: "screen-recording.mkv", note: "decoded here" },
  { name: "session.jsonl", note: "parsed here" },
  { name: "every frame", note: "drawn here" },
  { name: "reel.mp4", note: "encoded here" },
];
const LINES = [
  "ANTHROPIC_API_KEY=sk-ant-x91kQ",
  "send the build to dev@example.com",
  'password: "correct-horse-battery"',
].map((raw) => ({ raw, clean: redact(raw) }));
const ARRIVALS = [
  { kind: "dictated", text: "make it a minute" },
  { kind: "step title", text: "Export to mp4" },
  { kind: "excerpt", text: "add an export panel with…" },
];

// One tick per beat: three redactions, three arrivals, then a hold before the loop restarts.
const TICK_MS = 750;
const TICKS = 11;
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
      <section className={ZONE}>
        <div aria-hidden className={ZONE_HEAD}>
          <span>01</span>
          <span>your browser</span>
        </div>
        <ul aria-hidden className={VISUAL}>
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

      <section className={`${ZONE} border-line max-lg:border-t lg:border-l`}>
        <div aria-hidden className={ZONE_HEAD}>
          <span>02</span>
          <span>redact.ts</span>
        </div>
        <ul aria-hidden className={VISUAL}>
          {LINES.map(({ raw, clean }, i) => {
            const cleaned = beat > i;
            return (
              <li
                key={raw}
                className="grid rounded-[var(--radius-chip)] border border-line bg-canvas/60 px-3 py-2.5 font-mono text-xs transition-colors duration-300 group-hover:border-line-strong"
              >
                <span
                  className={`col-start-1 row-start-1 truncate text-fg transition-opacity duration-300 ${cleaned ? "opacity-0" : ""}`}
                >
                  {raw}
                </span>
                <span
                  className={`col-start-1 row-start-1 truncate text-fg-muted transition-opacity duration-300 ${cleaned ? "" : "opacity-0"}`}
                >
                  {clean}
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

      <section className={`${ZONE} border-line max-lg:border-t lg:border-l`}>
        <div aria-hidden className={ZONE_HEAD}>
          <span>03</span>
          <span>POST /api/steer</span>
        </div>
        <ul aria-hidden className={VISUAL}>
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
          The sentence you dictate, step titles and short prompt excerpts, all cleaned first.
        </p>
      </section>
    </div>
  );
}
