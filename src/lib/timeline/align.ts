import type { AlignedEvent, BuildEvent } from "@/shared/types";

// offsetS is the SyncPanel nudge, added on top of the start time read from the recording.
export function alignEvents(
  events: BuildEvent[],
  startedAt: number,
  offsetS: number,
): AlignedEvent[] {
  return events.map((e) => ({ ...e, t: (e.at - startedAt) / 1000 + offsetS }));
}
