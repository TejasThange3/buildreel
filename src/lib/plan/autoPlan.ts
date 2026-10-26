import { bestWindow } from "@/lib/timeline/activityWindow";
import type { ActivityTrack, Constraints, EDL, Segment, Step } from "@/shared/types";
import { fitToTarget, type Part, type StepPlan } from "./fit";

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

// importance = reviewActivity 0.5 + tool count 0.3 + prompt length 0.2, the last two scaled by
// the largest among the steps, so "something visibly happened" weighs most.
function importanceOf(steps: Step[]): Map<number, number> {
  const maxTools = Math.max(1, ...steps.map((s) => s.tools.length));
  const maxWords = Math.max(1, ...steps.map((s) => wordCount(s.prompt)));
  return new Map(
    steps.map((s) => [
      s.index,
      s.reviewActivity * 0.5 +
        (s.tools.length / maxTools) * 0.3 +
        (wordCount(s.prompt) / maxWords) * 0.2,
    ]),
  );
}

// Emphasis is added after fitting, so asking for more of a step can push the reel past target.
function withEmphasis(plan: StepPlan, constraints: Constraints): StepPlan {
  const extra = constraints.emphasis[plan.step.index] ?? 0;
  const dur = Math.min(plan.real.dur + extra, plan.real.max);
  return { ...plan, real: { ...plan.real, dur } };
}

const INTRO_S = 2.5;
const OUTRO_S = 3;

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const minutes = Math.round(seconds / 60);
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

// All prompts and words count, including steps left out of the cut: the card is about the build.
function statsText(steps: Step[], keptSteps: number, rawS: number, reelS: number): string {
  const words = steps.reduce((sum, s) => sum + wordCount(s.prompt), 0);
  return [
    `${keptSteps} steps from ${steps.length} prompts, ${words} words dictated`,
    `${formatDuration(rawS)} of recording in ${formatDuration(reelS)}`,
  ].join("\n");
}

const card = (id: string, outDur: number, kind: "title" | "stats", text: string): Segment => ({
  id,
  mode: "card",
  outDur,
  overlay: { kind, text },
});

const sumSeconds = (segments: Segment[]) => segments.reduce((sum, s) => sum + s.outDur, 0);

export function planReel(
  steps: Step[],
  activity: ActivityTrack,
  constraints: Constraints,
  durationS: number,
): EDL {
  const kept = steps.filter((s) => !constraints.dropped.includes(s.index));
  const plans = fitToTarget(
    kept.map((s) => draftPlan(s, activity, constraints)),
    constraints.targetS - INTRO_S - OUTRO_S,
    importanceOf(kept),
    constraints.pinned,
  ).map((plan) => withEmphasis(plan, constraints));
  const body = plans.flatMap((plan) => stepSegments(plan, activity, constraints));
  const totalS = INTRO_S + sumSeconds(body) + OUTRO_S;
  const outro = constraints.outro ?? statsText(steps, plans.length, durationS, totalS);
  const segments = [
    card("intro", INTRO_S, "title", constraints.intro ?? "How I built it"),
    ...body,
    card("outro", OUTRO_S, "stats", outro),
  ];
  return { segments, totalS };
}
