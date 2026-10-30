"use client";

import { FloppyDiskIcon } from "@phosphor-icons/react";
import { saveProject } from "@/shared/project";
import { useProject } from "@/state/store";
import { downloadText } from "./download";

export function ProjectSave() {
  const recording = useProject((s) => s.recording);
  const offsetS = useProject((s) => s.offsetS);
  const constraints = useProject((s) => s.constraints);
  const autoTitles = useProject((s) => s.autoTitles);
  if (!recording) return null;

  const save = () => {
    const { name } = recording;
    const text = saveProject({
      recording: {
        name,
        durationS: recording.probe.durationS,
        startedAt: recording.probe.startedAt,
      },
      offsetS,
      constraints,
      autoTitles,
    });
    downloadText(text, "application/json", `${name.replace(/\.[^.]+$/, "")}-project.json`);
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm leading-relaxed text-fg-muted">
        Keeps the sync and every edit. Open it later with the same recording and logs.
      </p>
      <button
        type="button"
        onClick={save}
        className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-line-strong px-4 text-sm font-medium transition-colors hover:bg-white/5"
      >
        <FloppyDiskIcon aria-hidden className="size-4" />
        Save
      </button>
    </div>
  );
}
