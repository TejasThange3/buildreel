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

// The `length`-second window inside [from, to] with the most screen change. Activity is constant
// within a bin, so the score is piecewise linear in the start, with breaks where the window's
// start or end meets a bin boundary; only those starts (plus the two ends) need trying. They are
// tried in order and the earliest wins ties, so the result is deterministic. A later start must
// beat the best by more than float noise, or equal windows would drift to a later start.
const TIE = 1e-9;

export function bestWindow(
  activity: ActivityTrack,
  from: number,
  to: number,
  length: number,
): { start: number; activity: number } {
  const last = Math.max(to - length, from);
  const starts = [from, last];
  const firstBin = Math.ceil(from / ACTIVITY_BIN_S);
  for (let k = firstBin; k * ACTIVITY_BIN_S <= last + length; k++) {
    const boundary = k * ACTIVITY_BIN_S;
    for (const start of [boundary, boundary - length]) {
      if (start > from && start < last) starts.push(start);
    }
  }
  let best = { start: from, activity: -1 };
  for (const start of starts.sort((a, b) => a - b)) {
    const score = meanActivity(activity, start, start + length);
    if (score > best.activity + TIE) best = { start, activity: score };
  }
  return best;
}
