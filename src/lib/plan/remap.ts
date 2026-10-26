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
// first or last frame; an empty EDL has nothing to show.
export function remap(edl: EDL, outT: number): Remapped | undefined {
  const last = edl.segments.at(-1);
  let start = 0;
  for (const segment of edl.segments) {
    if (outT < start + segment.outDur || segment === last) {
      const local = Math.min(Math.max(outT - start, 0), segment.outDur);
      return { segment, local, srcT: sourceTime(segment, local) };
    }
    start += segment.outDur;
  }
  return undefined;
}
