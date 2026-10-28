"use client";

import { ArrowClockwiseIcon, ArrowCounterClockwiseIcon } from "@phosphor-icons/react";
import { type FormEvent, useState } from "react";
import { type SteerOutcome, useProject } from "@/state/store";

// Wispr Flow types the spoken sentence into this box; the app only ever reads typed text.
export function SteerBox() {
  const steer = useProject((s) => s.steer);
  const undo = useProject((s) => s.undo);
  const redo = useProject((s) => s.redo);
  const canUndo = useProject((s) => s.past.length > 0);
  const canRedo = useProject((s) => s.future.length > 0);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<SteerOutcome>();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const instruction = text.trim();
    if (!instruction || pending) return;
    setPending(true);
    const result = await steer(instruction);
    setPending(false);
    setOutcome(result);
    if (result.ok) setText("");
  };

  return (
    <section aria-label="Steer the reel">
      <form onSubmit={submit} className="flex items-center gap-2">
        <label className="sr-only" htmlFor="steer">
          Tell Buildreel what to change
        </label>
        <div
          data-active={text.length > 0}
          className="flex min-w-0 flex-1 items-center rounded-full border border-line-strong bg-surface shadow-[inset_0_1px_0_rgb(255_255_255/0.06)] transition-[border-color,box-shadow] duration-300 focus-within:border-voice/60 data-[active=true]:shadow-[0_0_0_4px_rgb(255_122_89/0.12),inset_0_1px_0_rgb(255_255_255/0.06)]"
        >
          <span aria-hidden className="ml-4 size-2 shrink-0 rounded-full bg-voice" />
          <input
            id="steer"
            value={text}
            onChange={(e) => setText(e.target.value)}
            readOnly={pending}
            maxLength={500}
            autoComplete="off"
            placeholder="Hold your Wispr Flow key and say what to change"
            className="h-12 min-w-0 flex-1 bg-transparent px-3 font-mono text-sm text-fg outline-none read-only:opacity-60 placeholder:font-sans placeholder:text-fg-subtle"
          />
          <button
            type="submit"
            disabled={!pending && text.trim().length === 0}
            aria-disabled={pending}
            className="mr-1.5 h-9 shrink-0 rounded-full bg-fg px-4 text-[13px] font-medium text-canvas transition-opacity disabled:opacity-40 aria-disabled:opacity-40"
          >
            {pending ? "Planning…" : "Apply"}
          </button>
        </div>
        <button
          type="button"
          onClick={undo}
          disabled={!canUndo}
          aria-label="Undo"
          title="Undo"
          className="grid size-10 shrink-0 place-items-center rounded-full border border-line text-fg-muted transition-colors hover:border-line-strong hover:text-fg disabled:opacity-35 disabled:hover:border-line disabled:hover:text-fg-muted"
        >
          <ArrowCounterClockwiseIcon aria-hidden className="size-4" />
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={!canRedo}
          aria-label="Redo"
          title="Redo"
          className="grid size-10 shrink-0 place-items-center rounded-full border border-line text-fg-muted transition-colors hover:border-line-strong hover:text-fg disabled:opacity-35 disabled:hover:border-line disabled:hover:text-fg-muted"
        >
          <ArrowClockwiseIcon aria-hidden className="size-4" />
        </button>
      </form>
      <p aria-live="polite" className="mt-2.5 min-h-5 px-4 font-mono text-xs">
        {outcome?.ok && (
          <>
            <span className="text-voice">Applied:</span>{" "}
            <span className="text-fg-muted">{outcome.summary}</span>
            {outcome.note && <span className="text-fg-subtle"> ({outcome.note})</span>}
          </>
        )}
        {outcome && !outcome.ok && <span className="text-fg-muted">{outcome.message}</span>}
      </p>
    </section>
  );
}
