"use client";

import { CheckIcon, CopySimpleIcon } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { postDraft, type PostDraft } from "@/lib/render/postDraft";
import { useProject } from "@/state/store";

const NETWORKS: { key: keyof PostDraft; label: string }[] = [
  { key: "x", label: "X" },
  { key: "linkedin", label: "LinkedIn" },
];

type Copy = "idle" | "copied" | "failed";

export function PostDraftPanel() {
  const steps = useProject((s) => s.steps);
  const constraints = useProject((s) => s.constraints);
  const rawS = useProject((s) => s.recording?.probe.durationS ?? 0);
  const reelS = useProject((s) => s.edl.totalS);
  const [network, setNetwork] = useState<keyof PostDraft>("x");
  const [copy, setCopy] = useState<Copy>("idle");
  const draft = useMemo(
    () => postDraft(steps, constraints, rawS, reelS),
    [steps, constraints, rawS, reelS],
  );
  const text = draft[network];

  useEffect(() => {
    if (copy === "idle") return;
    const timer = setTimeout(() => setCopy("idle"), 1800);
    return () => clearTimeout(timer);
  }, [copy]);

  if (steps.length === 0) return null;

  // Clipboard writes fail without focus or permission; the text stays selectable either way.
  const copyText = () =>
    navigator.clipboard.writeText(text).then(
      () => setCopy("copied"),
      () => setCopy("failed"),
    );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div
          role="radiogroup"
          aria-label="Post draft network"
          className="inline-flex rounded-full bg-surface p-1 outline outline-1 -outline-offset-1 outline-line"
        >
          {NETWORKS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={network === key}
              onClick={() => setNetwork(key)}
              className="h-8 rounded-full px-3.5 text-xs text-fg-muted transition-colors hover:text-fg aria-checked:bg-fg aria-checked:text-canvas aria-checked:hover:text-canvas"
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={copyText}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-line-strong px-4 text-sm font-medium transition-colors hover:bg-white/5"
        >
          {copy === "copied" ? (
            <CheckIcon aria-hidden className="size-4" />
          ) : (
            <CopySimpleIcon aria-hidden className="size-4" />
          )}
          {copy === "copied" ? "Copied" : "Copy"}
        </button>
      </div>
      <textarea
        readOnly
        value={text}
        aria-label={`${network === "x" ? "X" : "LinkedIn"} post draft`}
        rows={network === "x" ? 6 : 10}
        className="w-full resize-none rounded-xl bg-surface p-3 text-sm leading-relaxed text-fg-muted outline outline-1 -outline-offset-1 outline-line focus:outline-line-strong"
      />
      <p aria-live="polite" className="font-mono text-xs text-fg-subtle tabular-nums">
        {copy === "failed"
          ? "Copy was blocked. Select the text and copy it by hand."
          : network === "x"
            ? `${text.length} / 280`
            : `${text.length} characters`}
      </p>
    </div>
  );
}
