import { bestWindow } from "@/lib/timeline/activityWindow";
import type { ActivityTrack, Constraints, EDL, Segment, Step } from "@/shared/types";

// Output seconds of one part of a step, and how far fitting may shrink or grow it.
type Part = { dur: number; min: number; max: number };

type StepPlan = { step: Step; hold: Part; fast: Part; real: Part };

// Below this mean activity even the best review window is a still screen, not worth real time.
// Activity is scaled so a static screen sits at 0 (see lib/media/activity.ts).
const REAL_MIN_ACTIVITY = 0.05;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;

// The prompt card stays up long enough to read: about 3.5 words a second, 2 to 5 seconds,
// and fitting may shorten it to 2 seconds.
function holdPart(prompt: string): Part {
  const dur = clamp(wordCount(prompt) / 3.5, 2, 5);
  return { dur, min: Math.min(dur, 2), max: dur };
}

// The agent's work plays at about 20x, 1.5 to 3 seconds, never slower than real time; fitting
// may shorten it to 1.5 seconds. A speed forced by steering fixes the length.
function fastPart(step: Step, forcedSpeed: number | undefined): Part {
  const workLen = step.workEnd - step.promptT;
  if (forcedSpeed) {
    const dur = workLen / Math.max(forcedSpeed, 1);
    return { dur, min: dur, max: dur };
  }
  const dur = Math.min(clamp(workLen / 20, 1.5, 3), workLen);
  return { dur, min: Math.min(dur, 1.5), max: dur };
}

// The checking moment plays in real time: the most active window of the review, up to 6
// seconds, shrinkable to 3 and growable to the whole review. Steered emphasis keeps it even on
// a still screen.
function realPart(step: Step, activity: ActivityTrack, emphasized: boolean): Part {
  const reviewLen = step.reviewEnd - step.workEnd;
  const dur = Math.min(reviewLen, 6);
  const best = bestWindow(activity, step.workEnd, step.reviewEnd, dur);
  if (dur <= 0 || (best.activity < REAL_MIN_ACTIVITY && !emphasized)) {
    return { dur: 0, min: 0, max: 0 };
  }
  return { dur, min: Math.min(dur, 3), max: reviewLen };
}

function draftPlan(step: Step, activity: ActivityTrack, constraints: Constraints): StepPlan {
  return {
    step,
    hold: holdPart(step.prompt),
    fast: fastPart(step, constraints.speed[step.index]),
    real: realPart(step, activity, step.index in constraints.emphasis),
  };
}

function stepSegments(
  { step, hold, fast, real }: StepPlan,
  activity: ActivityTrack,
  constraints: Constraints,
): Segment[] {
  const segments: Segment[] = [
    {
      id: `${step.index}-hold`,
      step: step.index,
      mode: "hold",
      srcT: step.promptT,
      outDur: hold.dur,
      overlay: { kind: "prompt", text: step.prompt },
    },
  ];
  if (fast.dur > 0) {
    const src: [number, number] = [step.promptT, step.workEnd];
    segments.push({
      id: `${step.index}-fast`,
      step: step.index,
      mode: "fast",
      src,
      speed: (src[1] - src[0]) / fast.dur,
      outDur: fast.dur,
      overlay: { kind: "tools", tools: step.tools },
    });
  }
  if (real.dur > 0) {
    // The window is chosen at the final length, after fitting.
    const { start } = bestWindow(activity, step.workEnd, step.reviewEnd, real.dur);
    segments.push({
      id: `${step.index}-real`,
      step: step.index,
      mode: "real",
      src: [start, start + real.dur],
      outDur: real.dur,
      overlay: { kind: "title", text: constraints.titles[step.index] ?? step.title },
    });
  }
  return segments;
}

export function planReel(steps: Step[], activity: ActivityTrack, constraints: Constraints): EDL {
  const plans = steps
    .filter((s) => !constraints.dropped.includes(s.index))
    .map((s) => draftPlan(s, activity, constraints));
  const segments = plans.flatMap((plan) => stepSegments(plan, activity, constraints));
  return { segments, totalS: segments.reduce((sum, s) => sum + s.outDur, 0) };
}
