"use client";

import {
  CheckIcon,
  CopySimpleIcon,
  FileTextIcon,
  FilmSlateIcon,
  XIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useState, type DragEvent, type ReactNode } from "react";
import { sortFiles } from "@/lib/files";
import { useProject } from "@/state/store";

// The editor only renders in the browser, so the platform is known on first render.
const WINDOWS = /Windows/.test(navigator.userAgent);
const MAC = /Mac|iPhone|iPad/.test(navigator.userAgent);
const LOG_PATH = WINDOWS ? "%USERPROFILE%\\.claude\\projects" : "~/.claude/projects";
const LOG_HOW = WINDOWS
  ? "In the file window paste it into the address bar and press Enter."
  : MAC
    ? "In the file window press Cmd Shift G, paste it and press Return."
    : "In the file window press Ctrl L, paste it and press Enter.";

type SlotProps = {
  step: number;
  title: string;
  pick: string;
  icon: ReactNode;
  chosen: string[];
  accept: string;
  multiple?: boolean;
  onPick: (files: File[]) => void;
  onRemove: (name: string) => void;
  children: ReactNode;
};

function Slot(props: SlotProps) {
  const { step, title, pick, icon, chosen, accept, multiple, onPick, onRemove, children } = props;
  const done = chosen.length > 0;
  return (
    <div
      data-done={done}
      className="flex flex-col rounded-[var(--radius-panel)] border border-line bg-surface p-5 text-left transition-colors data-[done=true]:border-line-strong"
    >
      <div className="flex items-center gap-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-full border border-line-strong font-mono text-xs text-fg-muted">
          {done ? <CheckIcon aria-hidden className="size-3.5 text-fg" /> : step}
        </span>
        <h2 className="text-sm font-medium">{title}</h2>
        <span aria-hidden className="ml-auto text-fg-subtle">
          {icon}
        </span>
      </div>
      <div className="mt-3 flex-1 text-sm leading-relaxed text-fg-muted">{children}</div>
      {done && (
        <ul className="mt-3 space-y-1 font-mono text-xs break-all text-fg">
          {chosen.map((name) => (
            <li key={name} className="flex items-start gap-2">
              <span className="min-w-0 flex-1">{name}</span>
              <button
                type="button"
                onClick={() => onRemove(name)}
                aria-label={`Remove ${name}`}
                className="shrink-0 text-fg-subtle transition-colors hover:text-fg"
              >
                <XIcon aria-hidden className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <label className="mt-4 inline-flex h-9 cursor-pointer items-center self-start rounded-full border border-line-strong px-4 text-sm font-medium transition-colors hover:bg-white/5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-fg">
        {done ? (multiple ? "Add another" : "Change") : "Choose"}
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          aria-label={pick}
          className="sr-only"
          onChange={(event) => onPick([...(event.target.files ?? [])])}
        />
      </label>
    </div>
  );
}

function CopyPath() {
  const [copied, setCopied] = useState(false);
  const copy = () =>
    navigator.clipboard.writeText(LOG_PATH).then(
      () => setCopied(true),
      () => setCopied(false),
    );
  return (
    <span className="mt-2 flex items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-md bg-canvas px-2 py-1 font-mono text-xs text-fg">
        {LOG_PATH}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy the log folder path"
        className="grid size-7 shrink-0 place-items-center rounded-md border border-line text-fg-muted transition-colors hover:text-fg"
      >
        {copied ? <CheckIcon className="size-3.5" /> : <CopySimpleIcon className="size-3.5" />}
      </button>
    </span>
  );
}

export function DropZone() {
  const importFiles = useProject((s) => s.importFiles);
  const importing = useProject((s) => s.importing);
  const importError = useProject((s) => s.importError);
  const [video, setVideo] = useState<File>();
  const [logs, setLogs] = useState<File[]>([]);
  const [project, setProject] = useState<File>();
  const [dragging, setDragging] = useState(false);

  // Picks and drops add up, so the recording and the log can come from different folders.
  const add = (files: File[]) => {
    const sorted = sortFiles(files);
    if (sorted.videos[0]) setVideo(sorted.videos[0]);
    if (sorted.projects[0]) setProject(sorted.projects[0]);
    if (sorted.logs.length > 0)
      setLogs((current) => [
        ...current.filter((f) => !sorted.logs.some((l) => l.name === f.name)),
        ...sorted.logs,
      ]);
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    add([...event.dataTransfer.files]);
  };

  const ready = video !== undefined && logs.length > 0;
  const start = () => {
    if (video) void importFiles([video, ...logs, ...(project ? [project] : [])]);
  };

  return (
    <section
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      data-dragging={dragging}
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-12 data-[dragging=true]:opacity-80"
    >
      <h1 className="text-2xl font-semibold tracking-tight text-balance">
        Make a reel of your build
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-pretty text-fg-muted">
        Add the screen recording of your session and the Claude Code log from the same time. You can
        also drop both anywhere on this page. Everything stays in your browser.{" "}
        <Link href="/guide" className="text-fg underline underline-offset-4">
          Read the guide
        </Link>
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Slot
          step={1}
          title="Your screen recording"
          pick="Choose your screen recording"
          icon={<FilmSlateIcon className="size-5" />}
          chosen={video ? [video.name] : []}
          accept="video/*,.mkv"
          onPick={add}
          onRemove={() => setVideo(undefined)}
        >
          The OBS file of your session. OBS saves to your Videos folder unless you changed it.
        </Slot>
        <Slot
          step={2}
          title="Your Claude Code log"
          pick="Choose your Claude Code log"
          icon={<FileTextIcon className="size-5" />}
          chosen={logs.map((f) => f.name)}
          accept=".jsonl"
          multiple
          onPick={add}
          onRemove={(name) => setLogs((current) => current.filter((f) => f.name !== name))}
        >
          Claude Code keeps every session as a .jsonl file in this folder:
          <CopyPath />
          <span className="mt-2 block">
            {LOG_HOW} Open the folder named after your project and pick the newest file. If you set
            CLAUDE_CONFIG_DIR, the projects folder is inside that directory instead.
          </span>
        </Slot>
      </div>

      <label className="mt-4 flex cursor-pointer items-center gap-2 self-start text-sm text-fg-muted transition-colors hover:text-fg has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-fg">
        <input
          type="file"
          accept=".json"
          className="sr-only"
          onChange={(event) => add([...(event.target.files ?? [])])}
        />
        {project
          ? `Saved project: ${project.name}`
          : "Optional: add a saved project to pick up where you left off"}
      </label>
      {project && (
        <button
          type="button"
          onClick={() => setProject(undefined)}
          className="mt-1 self-start text-xs text-fg-subtle underline underline-offset-4 transition-colors hover:text-fg"
        >
          Remove the saved project
        </button>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={start}
          disabled={!ready || importing}
          className="h-11 rounded-full bg-fg px-6 text-sm font-medium text-canvas transition-opacity disabled:opacity-40"
        >
          {importing ? "Reading your files" : "Make my reel"}
        </button>
        <p role="status" className="text-sm text-fg-muted">
          {importError ?? (ready ? "" : "Add both files to continue.")}
        </p>
      </div>
    </section>
  );
}
