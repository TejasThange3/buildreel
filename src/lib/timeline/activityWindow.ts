import { ACTIVITY_BIN_S, type ActivityTrack } from "@/shared/types";

// Each bin counts by how much of it the window covers, so a window clipping a busy bin's edge
// does not inherit the whole bin's score.
export function meanActivity(activity: ActivityTrack, from: number, to: number): number {
  if (to <= from) return 0;
  let sum = 0;
  for (let i = Math.floor(from / ACTIVITY_BIN_S); i < Math.ceil(to / ACTIVITY_BIN_S); i++) {
    const overlap = Math.min(to, (i + 1) * ACTIVITY_BIN_S) - Math.max(from, i * ACTIVITY_BIN_S);
    sum += (activity[i] ?? 0) * overlap;
  }
  return sum / (to - from);
}
