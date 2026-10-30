"use client";

import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { formatTime } from "@/lib/format";
import { alignEvents } from "@/lib/timeline/align";
import { useProject } from "@/state/store";

const NUDGE_S = 0.5;

export function SyncPanel() {
  const recording = useProject((s) => s.recording);
  const syncTarget = useProject((s) => s.syncTarget);
  const offsetS = useProject((s) => s.offsetS);
  const stepCount = useProject((s) => s.steps.length);
  const droppedSteps = useProject((s) => s.droppedSteps);
  const markPromptAt = useProject((s) => s.markPromptAt);
  const confirmSync = useProject((s) => s.confirmSync);
  const reset = useProject((s) => s.reset);
  const video = useRef<HTMLVideoElement>(null);
  const [time, setTime] = useState(0);

  // Open on the frame where the sync prompt should land, and follow it when the offset moves.
  const promptT =
    syncTarget && recording
      ? alignEvents([syncTarget], recording.probe.startedAt, offsetS)[0]?.t
      : undefined;
  useEffect(() => {
    if (video.current && promptT !== undefined) video.current.currentTime = promptT;
  }, [promptT]);

  if (!recording) return null;
  const seek = (t: number) => {
    if (video.current)
      video.current.currentTime = Math.min(Math.max(t, 0), recording.probe.durationS);
  };

  return (
    <section className="mx-auto grid w-full max-w-6xl flex-1 content-center gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10">
      <div>
        <video
          ref={video}
          src={recording.url}
          muted
          playsInline
          preload="auto"
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onSeeked={(e) => setTime(e.currentTarget.currentTime)}
          className="aspect-video w-full rounded-[var(--radius-panel)] bg-surface outline outline-1 -outline-offset-1 outline-line"
        />
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            aria-label={`Back ${NUDGE_S} seconds`}
            onClick={() => seek(time - NUDGE_S)}
            className="grid size-10 place-items-center rounded-full border border-line text-fg-muted transition-colors hover:text-fg active:scale-[0.97]"
          >
            <CaretLeftIcon size={16} />
          </button>
          <input
            type="range"
            min={0}
            max={recording.probe.durationS}
            step={0.1}
            value={time}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label="Position in recording"
            className="h-10 flex-1 cursor-pointer accent-fg"
          />
          <button
            type="button"
            aria-label={`Forward ${NUDGE_S} seconds`}
            onClick={() => seek(time + NUDGE_S)}
            className="grid size-10 place-items-center rounded-full border border-line text-fg-muted transition-colors hover:text-fg active:scale-[0.97]"
          >
            <CaretRightIcon size={16} />
          </button>
          <span className="w-16 text-right font-mono text-sm text-fg-muted tabular-nums">
            {formatTime(time)}
          </span>
        </div>
      </div>

      <aside className="flex flex-col">
        <h1 className="text-xl font-semibold tracking-tight text-balance">
          Is this where your prompt was sent?
        </h1>
        {syncTarget && promptT !== undefined ? (
          <>
            <p className="mt-3 text-sm leading-relaxed text-fg-muted text-pretty">
              It should land at <span className="font-mono text-fg">{formatTime(promptT)}</span>.
              Scrub to the frame where it appears in the chat, then mark it.
            </p>
            <blockquote className="mt-6 line-clamp-6 rounded-[var(--radius-panel)] bg-surface p-4 text-sm leading-relaxed text-fg">
              {syncTarget.text}
            </blockquote>
            <p className="mt-3 font-mono text-xs text-fg-subtle">
              {stepCount} {stepCount === 1 ? "step" : "steps"} in this recording
              {droppedSteps > 0 ? `, ${droppedSteps} outside it` : ""}
            </p>
            {stepCount === 0 && (
              <p role="alert" className="mt-3 text-sm leading-relaxed text-pretty text-fg-muted">
                None of the prompts fall inside this recording yet. Find the frame where prompt 1
                appears and mark it, or check that the log is from the same session.
              </p>
            )}
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => markPromptAt(time)}
                className="h-10 rounded-full border border-line-strong px-5 text-sm font-medium transition-colors hover:bg-raised active:scale-[0.97]"
              >
                Prompt 1 is here
              </button>
              <button
                type="button"
                onClick={confirmSync}
                disabled={stepCount === 0}
                className="h-10 rounded-full bg-fg px-5 text-sm font-medium text-canvas active:scale-[0.97] disabled:opacity-40"
              >
                Looks right
              </button>
            </div>
          </>
        ) : (
          <p className="mt-3 text-sm leading-relaxed text-fg-muted text-pretty">
            These logs have no prompts to sync against. Check that they are Claude Code session
            logs.
          </p>
        )}
        <button
          type="button"
          onClick={reset}
          className="mt-6 self-start text-sm text-fg-subtle underline-offset-4 hover:text-fg-muted hover:underline"
        >
          Choose different files
        </button>
      </aside>
    </section>
  );
}
