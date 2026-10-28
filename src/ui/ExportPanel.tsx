"use client";

import { DownloadSimpleIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { exportMp4, ExportUnsupportedError } from "@/lib/render/exportMp4";
import { useProject } from "@/state/store";
import { readFonts } from "./overlayFonts";

type Status =
  | { kind: "idle" }
  | { kind: "running"; progress: number }
  | { kind: "done"; url: string; name: string }
  | { kind: "failed"; message: string };

const HEIGHTS = [1080, 720];

function download(url: string, name: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
}

export function ExportPanel() {
  const recording = useProject((s) => s.recording);
  const edl = useProject((s) => s.edl);
  const [height, setHeight] = useState(1080);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const abort = useRef<AbortController>(undefined);

  // A finished file's URL lives until the next export or until the panel goes away.
  const doneUrl = status.kind === "done" ? status.url : undefined;
  useEffect(() => {
    if (!doneUrl) return;
    return () => URL.revokeObjectURL(doneUrl);
  }, [doneUrl]);
  useEffect(() => () => abort.current?.abort(), []);

  if (!recording) return null;

  const start = async () => {
    const controller = new AbortController();
    abort.current = controller;
    setStatus({ kind: "running", progress: 0 });
    try {
      const blob = await exportMp4({
        file: recording.file,
        edl,
        keyTimes: recording.keyTimes,
        fonts: readFonts(),
        maxHeight: height,
        onProgress: (progress) => setStatus({ kind: "running", progress }),
        signal: controller.signal,
      });
      const url = URL.createObjectURL(blob);
      const name = `${recording.file.name.replace(/\.[^.]+$/, "")}-reel.mp4`;
      setStatus({ kind: "done", url, name });
      download(url, name);
    } catch (error) {
      if (controller.signal.aborted) setStatus({ kind: "idle" });
      else if (error instanceof ExportUnsupportedError)
        setStatus({ kind: "failed", message: error.message });
      else {
        setStatus({ kind: "failed", message: "The export failed. Try 720p, or reload and retry." });
        reportError(error);
      }
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div
          role="radiogroup"
          aria-label="Export resolution"
          className="inline-flex rounded-full bg-surface p-1 outline outline-1 -outline-offset-1 outline-line"
        >
          {HEIGHTS.map((h) => (
            <button
              key={h}
              type="button"
              role="radio"
              aria-checked={height === h}
              disabled={status.kind === "running"}
              onClick={() => setHeight(h)}
              className="h-8 rounded-full px-3.5 font-mono text-xs text-fg-muted tabular-nums transition-colors hover:text-fg disabled:opacity-50 aria-checked:bg-fg aria-checked:text-canvas aria-checked:hover:text-canvas"
            >
              {h}p
            </button>
          ))}
        </div>
        {status.kind === "running" ? (
          <button
            type="button"
            onClick={() => abort.current?.abort()}
            className="h-10 rounded-full border border-line-strong px-5 text-sm font-medium transition-colors hover:bg-white/5"
          >
            Cancel
          </button>
        ) : (
          <button
            type="button"
            onClick={start}
            disabled={edl.segments.length === 0}
            className="h-10 rounded-full bg-fg px-5 text-sm font-medium text-canvas transition-opacity disabled:opacity-40"
          >
            Export mp4
          </button>
        )}
      </div>

      {status.kind === "running" && (
        <div>
          <div
            role="progressbar"
            aria-label="Export progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(status.progress * 100)}
            className="h-1.5 overflow-hidden rounded-full bg-surface"
          >
            <div
              style={{ transform: `scaleX(${status.progress})` }}
              className="h-full origin-left bg-fg transition-transform duration-200"
            />
          </div>
          <p className="mt-2 font-mono text-xs text-fg-subtle tabular-nums">
            Encoding {Math.round(status.progress * 100)}%. Keep this tab open.
          </p>
        </div>
      )}
      {status.kind === "done" && (
        <a
          href={status.url}
          download={status.name}
          className="inline-flex items-center gap-2 text-sm text-fg-muted transition-colors hover:text-fg"
        >
          <DownloadSimpleIcon aria-hidden className="size-4" />
          Download again
        </a>
      )}
      {status.kind === "failed" && (
        <p role="alert" className="text-sm text-fg-muted">
          {status.message}
        </p>
      )}
    </div>
  );
}
