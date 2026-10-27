import type { AlignedEvent, BuildEvent } from "@/shared/types";

// offsetS is the SyncPanel nudge, added on top of the start time read from the recording.
export function alignEvents(
  events: BuildEvent[],
  startedAt: number,
  offsetS: number,
): AlignedEvent[] {
  return events.map((e) => ({ ...e, t: (e.at - startedAt) / 1000 + offsetS }));
}

type Prompt = Extract<BuildEvent, { kind: "prompt" }>;

// The prompt the sync panel calibrates against, chosen once per import: the first one inside the
// recording at the automatic start time, else the one closest to it. Keeping it fixed means
// marking it never swaps it for an earlier prompt that the new offset brings into range.
export function syncPrompt(
  events: BuildEvent[],
  startedAt: number,
  durationS: number,
): Prompt | undefined {
  let best: Prompt | undefined;
  let bestGap = Infinity;
  for (const e of events) {
    if (e.kind !== "prompt") continue;
    const t = (e.at - startedAt) / 1000;
    const gap = t < 0 ? -t : Math.max(0, t - durationS);
    if (gap < bestGap) {
      best = e;
      bestGap = gap;
    }
  }
  return best;
}

// The offset that puts `prompt` at `videoT` on the recording.
export function offsetFor(prompt: Prompt, startedAt: number, videoT: number): number {
  return videoT - (prompt.at - startedAt) / 1000;
}
