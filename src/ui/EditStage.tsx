"use client";

import type { ReactNode } from "react";
import { formatDuration } from "@/lib/plan/autoPlan";
import { SAMPLE_NAME } from "@/state/sample";
import { useProject } from "@/state/store";
import { ExportPanel } from "./ExportPanel";
import { Player } from "./Player";
import { PostDraftPanel } from "./PostDraftPanel";
import { ProjectSave } from "./ProjectSave";
import { PromptReview } from "./PromptReview";
import { SteerBox } from "./SteerBox";
import { StepList } from "./StepList";
import { TargetPicker } from "./TargetPicker";
import { Timeline } from "./Timeline";

type SectionProps = { title: string; hint?: string; action?: ReactNode; children?: ReactNode };

function Section({ title, hint, action, children }: SectionProps) {
  return (
    <section className="border-t border-line pt-5 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium">{title}</h2>
        {action}
      </div>
      {hint && <p className="mt-1 text-sm leading-relaxed text-pretty text-fg-muted">{hint}</p>}
      {children && <div className="mt-3">{children}</div>}
    </section>
  );
}

// One line on what the reel is, so the editor reads before anyone has to learn its parts.
function Intro() {
  const isSample = useProject((s) => s.recording?.name === SAMPLE_NAME);
  const rawS = useProject((s) => s.recording?.probe.durationS ?? 0);
  const reelS = useProject((s) => s.edl.totalS);
  const prompts = useProject((s) => s.steps.length);
  const cut = `${formatDuration(rawS)} of screen recording, ${prompts} prompt${prompts === 1 ? "" : "s"}, cut to a ${formatDuration(reelS)} reel.`;

  return (
    <div className="lg:col-span-2">
      <p className="font-mono text-xs tracking-wide text-fg-subtle uppercase">
        {isSample ? "Sample build" : "Your reel"}
      </p>
      <p className="mt-2 max-w-3xl text-lg leading-snug text-balance">
        {isSample
          ? `A real session: three Buildreel features dictated with Wispr Flow and built by Claude Code. ${cut}`
          : cut}
      </p>
      <p className="mt-2 text-sm text-fg-muted">
        Press play to watch it. Then steer it by voice, switch steps off, or export it.
      </p>
    </div>
  );
}

export function EditStage() {
  return (
    <div className="mx-auto grid w-full max-w-7xl flex-1 gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:py-8">
      <Intro />
      <div className="flex min-w-0 flex-col gap-5">
        <Player />
        <Timeline />
        <Section
          title="Steer by voice"
          hint='Hold your Wispr Flow key and say a change, like "make it a minute" or "give step 2 more time". Undo sits next to it.'
        >
          <SteerBox />
        </Section>
        <Section
          title="Prompt cards"
          hint="Fix a word or hide a card before you export. The original stays in your log."
        >
          <PromptReview />
        </Section>
      </div>
      <aside className="flex min-w-0 flex-col gap-5 lg:border-l lg:border-line lg:pl-8">
        <Section title="Reel length" action={<TargetPicker />} />
        <Section
          title="Steps"
          hint="One step per prompt. Click one to jump to it; switch it off to cut it."
        >
          <StepList />
        </Section>
        <Section title="Export" hint="Renders in this browser. SRT is the captions file.">
          <ExportPanel />
        </Section>
        <Section title="Post draft" hint="Ready to paste, written from the steps in the reel.">
          <PostDraftPanel />
        </Section>
        <Section title="Project">
          <ProjectSave />
        </Section>
      </aside>
    </div>
  );
}
