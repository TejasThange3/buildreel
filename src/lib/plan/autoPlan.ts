import type { Constraints, EDL, Segment, Step } from "@/shared/types";

// Output seconds of one part of a step, and how far fitting may shrink or grow it.
type Part = { dur: number; min: number; max: number };

type StepPlan = { step: Step; hold: Part; fast: Part };

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

function draftPlan(step: Step, constraints: Constraints): StepPlan {
  return {
    step,
    hold: holdPart(step.prompt),
    fast: fastPart(step, constraints.speed[step.index]),
  };
}

function stepSegments({ step, hold, fast }: StepPlan): Segment[] {
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
  return segments;
}

export function planReel(steps: Step[], constraints: Constraints): EDL {
  const plans = steps
    .filter((s) => !constraints.dropped.includes(s.index))
    .map((s) => draftPlan(s, constraints));
  const segments = plans.flatMap(stepSegments);
  return { segments, totalS: segments.reduce((sum, s) => sum + s.outDur, 0) };
}
