import type { Step } from "@/shared/types";

// Output seconds of one part of a step, and how far fitting may shrink or grow it.
export type Part = { dur: number; min: number; max: number };

export type StepPlan = { step: Step; hold: Part; fast: Part; real: Part };

// Real time goes first, then fast-forward, then prompt cards: the prompt is the caption the
// reel exists to show.
const SHRINK_ORDER = ["real", "fast", "hold"] as const;
const EPSILON = 1e-9;

const planSeconds = (p: StepPlan) => p.hold.dur + p.fast.dur + p.real.dur;
const totalSeconds = (plans: StepPlan[]) => plans.reduce((sum, p) => sum + planSeconds(p), 0);
const copy = (p: StepPlan): StepPlan => ({
  ...p,
  hold: { ...p.hold },
  fast: { ...p.fast },
  real: { ...p.real },
});

// Each pass takes the same share of every step's slack, so steps shrink together rather than
// the first ones losing everything.
function shrink(plans: StepPlan[], budgetS: number): StepPlan[] {
  const out = plans.map(copy);
  for (const key of SHRINK_ORDER) {
    const over = totalSeconds(out) - budgetS;
    const slack = out.reduce((sum, p) => sum + p[key].dur - p[key].min, 0);
    if (over <= EPSILON || slack <= 0) continue;
    const share = Math.min(1, over / slack);
    for (const p of out) p[key].dur -= (p[key].dur - p[key].min) * share;
  }
  return out;
}

function extendReal(plans: StepPlan[], budgetS: number): StepPlan[] {
  const out = plans.map(copy);
  const under = budgetS - totalSeconds(out);
  const room = out.reduce((sum, p) => sum + p.real.max - p.real.dur, 0);
  if (under <= EPSILON || room <= 0) return out;
  const share = Math.min(1, under / room);
  for (const p of out) p.real.dur += (p.real.max - p.real.dur) * share;
  return out;
}

// Lowest importance goes first; on a tie the later step goes, keeping the start of the story.
function leastImportant(
  plans: StepPlan[],
  importance: Map<number, number>,
  pinned: number[],
): StepPlan | undefined {
  let victim: StepPlan | undefined;
  for (const p of plans) {
    if (pinned.includes(p.step.index)) continue;
    const score = importance.get(p.step.index) ?? 0;
    if (!victim || score <= (importance.get(victim.step.index) ?? 0)) victim = p;
  }
  return victim;
}

// Fits the steps into budgetS: shrink, then drop the least important unpinned step until they
// fit, then grow real time into any room left. Pinned steps are never dropped, so a reel of only
// pinned steps may run over.
export function fitToTarget(
  plans: StepPlan[],
  budgetS: number,
  importance: Map<number, number>,
  pinned: number[],
): StepPlan[] {
  let kept = plans;
  for (;;) {
    const fitted = shrink(kept, budgetS);
    if (totalSeconds(fitted) <= budgetS + EPSILON) return extendReal(fitted, budgetS);
    const victim = leastImportant(kept, importance, pinned);
    if (!victim) return fitted;
    kept = kept.filter((p) => p !== victim);
  }
}
