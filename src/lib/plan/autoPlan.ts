import type { Constraints, EDL, Segment, Step } from "@/shared/types";

// Output seconds of one part of a step, and how far fitting may shrink or grow it.
type Part = { dur: number; min: number; max: number };

type StepPlan = { step: Step; hold: Part };

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;

// The prompt card stays up long enough to read: about 3.5 words a second, 2 to 5 seconds,
// and fitting may shorten it to 2 seconds.
function holdPart(prompt: string): Part {
  const dur = clamp(wordCount(prompt) / 3.5, 2, 5);
  return { dur, min: Math.min(dur, 2), max: dur };
}

function draftPlan(step: Step): StepPlan {
  return { step, hold: holdPart(step.prompt) };
}

function stepSegments({ step, hold }: StepPlan): Segment[] {
  return [
    {
      id: `${step.index}-hold`,
      step: step.index,
      mode: "hold",
      srcT: step.promptT,
      outDur: hold.dur,
      overlay: { kind: "prompt", text: step.prompt },
    },
  ];
}

export function planReel(steps: Step[], constraints: Constraints): EDL {
  const plans = steps.filter((s) => !constraints.dropped.includes(s.index)).map(draftPlan);
  const segments = plans.flatMap(stepSegments);
  return { segments, totalS: segments.reduce((sum, s) => sum + s.outDur, 0) };
}
