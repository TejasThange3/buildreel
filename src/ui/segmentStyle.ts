import type { Segment } from "@/shared/types";

// Prompt cards are dictated, so they carry the voice accent; agent work is hatched like a blur of
// fast-forward; real time is solid; cards are outlines. Shared by the editor and the landing page.
export const SEGMENT_CLASS: Record<Segment["mode"], string> = {
  hold: "bg-voice/80",
  fast: "bg-[repeating-linear-gradient(135deg,rgb(255_255_255/0.28)_0_3px,transparent_3px_7px)]",
  real: "bg-fg/70",
  card: "outline outline-1 -outline-offset-1 outline-line-strong",
};
