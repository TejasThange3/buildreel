import type { EDL, Segment } from "@/shared/types";

export type Remapped = { segment: Segment; local: number; srcT?: number };

// Source frame for a time into a segment; cards have none. Fast-forward is capped at its
// source end so float error never steps past the work phase.
function sourceTime(segment: Segment, local: number): number | undefined {
  switch (segment.mode) {
    case "card":
      return undefined;
    case "hold":
      return segment.srcT;
    case "real":
      return segment.src[0] + local;
    case "fast":
      return Math.min(segment.src[0] + local * segment.speed, segment.src[1]);
  }
}

// Output time to segment, time into it and source frame. Times outside the reel clamp to its
// first or last frame; zero-length segments are never shown, and an empty EDL shows nothing.
export function remap(edl: EDL, outT: number): Remapped | undefined {
  const shown = edl.segments.filter((s) => s.outDur > 0);
  const last = shown.at(-1);
  let start = 0;
  for (const segment of shown) {
    if (outT < start + segment.outDur || segment === last) {
      const local = Math.min(Math.max(outT - start, 0), segment.outDur);
      return { segment, local, srcT: sourceTime(segment, local) };
    }
    start += segment.outDur;
  }
  return undefined;
}

// Where each step first appears in the reel, for jumping to it; steps cut from the reel are absent.
export function stepStarts(edl: EDL): Map<number, number> {
  const starts = new Map<number, number>();
  let at = 0;
  for (const segment of edl.segments) {
    if (segment.step !== undefined && !starts.has(segment.step)) starts.set(segment.step, at);
    at += segment.outDur;
  }
  return starts;
}
