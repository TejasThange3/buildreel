"use client";

import { FilmSlateIcon } from "@phosphor-icons/react";
import { useState, type DragEvent } from "react";
import { useProject } from "@/state/store";

export function DropZone() {
  const importFiles = useProject((s) => s.importFiles);
  const importing = useProject((s) => s.importing);
  const importError = useProject((s) => s.importError);
  const [dragging, setDragging] = useState(false);

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    void importFiles([...event.dataTransfer.files]);
  };

  return (
    <section
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className="flex flex-1 items-center justify-center px-4 py-16"
    >
      <div
        data-dragging={dragging}
        className="w-full max-w-xl rounded-[var(--radius-panel)] border border-dashed border-line-strong bg-surface px-8 py-14 text-center transition-[border-color,transform] duration-200 ease-[var(--ease-out-expo)] data-[dragging=true]:scale-[1.01] data-[dragging=true]:border-fg"
      >
        <FilmSlateIcon size={28} weight="light" className="mx-auto text-fg-muted" aria-hidden />
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-balance">Drop your build</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-pretty text-fg-muted">
          One screen recording and its Claude Code session logs. Everything stays in your browser.
        </p>

        <label className="mt-8 inline-flex h-10 cursor-pointer items-center rounded-full bg-fg px-5 text-sm font-medium text-canvas transition-transform duration-150 active:scale-[0.97] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-fg">
          {importing ? "Reading your files" : "Choose files"}
          <input
            type="file"
            multiple
            accept="video/*,.mkv,.jsonl"
            disabled={importing}
            className="sr-only"
            onChange={(event) => void importFiles([...(event.target.files ?? [])])}
          />
        </label>

        <p role="status" className="mt-4 min-h-5 text-sm text-fg-muted">
          {importError ?? ""}
        </p>

        <p className="mt-6 font-mono text-xs leading-relaxed text-fg-subtle">
          Logs are in ~/.claude/projects/&lt;project folder&gt;/*.jsonl
        </p>
      </div>
    </section>
  );
}
