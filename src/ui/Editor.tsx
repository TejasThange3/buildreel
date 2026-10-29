"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchSample } from "@/state/sample";
import { useProject } from "@/state/store";
import { DropZone } from "./DropZone";
import { EditStage } from "./EditStage";
import { Logo } from "./Logo";
import { SyncPanel } from "./SyncPanel";

const STAGES = ["Add files", "Sync", "Edit and export"];

// Where the user is in the three stages, so the editor explains its own order.
function StagePath({ current }: { current: number }) {
  return (
    <ol aria-label="Stages" className="hidden items-center gap-2 text-xs sm:flex">
      {STAGES.map((stage, i) => (
        <li
          key={stage}
          aria-current={i === current ? "step" : undefined}
          className="flex items-center gap-2 text-fg-subtle aria-[current=step]:text-fg"
        >
          {i > 0 && <span aria-hidden className="h-px w-4 bg-line-strong" />}
          <span className="font-mono tabular-nums">{i + 1}</span>
          {stage}
        </li>
      ))}
    </ol>
  );
}

export default function Editor() {
  const hasProject = useProject((s) => s.recording !== undefined);
  const synced = useProject((s) => s.synced);
  const importFiles = useProject((s) => s.importFiles);
  const reset = useProject((s) => s.reset);
  const [loadingSample, setLoadingSample] = useState(!hasProject);

  // A first visit opens the sample build, so there is a reel to play before anyone has files.
  useEffect(() => {
    if (useProject.getState().recording) return;
    let cancelled = false;
    fetchSample()
      .then((files) => (cancelled ? undefined : importFiles(files)))
      .catch((error: unknown) =>
        useProject.setState({
          importError: error instanceof Error ? error.message : String(error),
        }),
      )
      // A cancelled run (React mounts effects twice in development) leaves the flag to the next.
      .finally(() => {
        if (!cancelled) setLoadingSample(false);
      });
    return () => {
      cancelled = true;
    };
  }, [importFiles]);

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="flex h-14 items-center justify-between border-b border-line px-4 sm:px-6">
        <Link href="/">
          <Logo />
        </Link>
        <StagePath current={!hasProject ? 0 : !synced ? 1 : 2} />
        {hasProject && (
          <button
            type="button"
            onClick={reset}
            className="h-9 rounded-full border border-line-strong px-4 text-sm font-medium transition-colors hover:bg-white/5"
          >
            Use your own files
          </button>
        )}
      </header>
      <main className="flex flex-1 flex-col">
        {loadingSample && !hasProject ? (
          <p
            role="status"
            className="flex flex-1 items-center justify-center text-sm text-fg-muted"
          >
            Opening the sample build
          </p>
        ) : !hasProject ? (
          <DropZone />
        ) : !synced ? (
          <SyncPanel />
        ) : (
          <EditStage />
        )}
      </main>
    </div>
  );
}
