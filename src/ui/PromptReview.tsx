"use client";

import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { useProject } from "@/state/store";
import type { Step } from "@/shared/types";

type RowProps = { step: Step; text: string; edited: boolean; hidden: boolean };

function PromptRow({ step, text, edited, hidden }: RowProps) {
  const editPrompt = useProject((s) => s.editPrompt);
  const togglePrompt = useProject((s) => s.togglePrompt);
  const [draft, setDraft] = useState(text);

  // Edits land on blur, so one change is one undo step rather than one per keystroke.
  const save = () => {
    editPrompt(step.index, draft);
    if (!draft.trim()) setDraft(step.prompt);
  };

  return (
    <li className="flex items-start gap-3 rounded-[var(--radius-chip)] p-2 transition-colors hover:bg-surface">
      <span className="w-6 shrink-0 pt-2.5 text-right font-mono text-xs text-fg-subtle tabular-nums">
        {step.index}
      </span>
      <div className="min-w-0 flex-1">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={save}
          disabled={hidden}
          rows={2}
          aria-label={`Prompt card for step ${step.index}`}
          className="w-full resize-y rounded-lg bg-transparent p-2 text-sm leading-relaxed text-fg outline outline-1 -outline-offset-1 outline-line transition-[outline-color,opacity] focus:outline-voice/60 disabled:opacity-40"
        />
        <p className="mt-1 px-2 font-mono text-xs text-fg-subtle">
          {hidden ? "Hidden from the reel" : edited ? "Edited. Clear to restore." : "As dictated"}
        </p>
      </div>
      <button
        type="button"
        onClick={() => togglePrompt(step.index)}
        aria-pressed={hidden}
        aria-label={`${hidden ? "Show" : "Hide"} prompt card for step ${step.index}`}
        className="mt-1 grid size-9 shrink-0 place-items-center rounded-full border border-line text-fg-muted transition-colors hover:border-line-strong hover:text-fg aria-pressed:text-fg-subtle"
      >
        {hidden ? (
          <EyeSlashIcon aria-hidden className="size-4" />
        ) : (
          <EyeIcon aria-hidden className="size-4" />
        )}
      </button>
    </li>
  );
}

export function PromptReview() {
  const steps = useProject((s) => s.steps);
  const prompts = useProject((s) => s.constraints.prompts);
  const hidden = useProject((s) => s.constraints.hiddenPrompts);

  return (
    <ol className="flex flex-col gap-1" aria-label="Prompt cards">
      {steps.map((step) => {
        const text = prompts[step.index] ?? step.prompt;
        // Undo and redo change the text from outside, so a new text gives the row a fresh draft.
        return (
          <PromptRow
            key={`${step.index}:${text}`}
            step={step}
            text={text}
            edited={step.index in prompts}
            hidden={hidden.includes(step.index)}
          />
        );
      })}
    </ol>
  );
}
