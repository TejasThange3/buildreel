import type { PatchOp } from "@/shared/steer";
import type { Constraints } from "@/shared/types";

export type ApplyResult = { constraints: Constraints; applied: PatchOp[]; skipped: PatchOp[] };

const withKey = (record: Record<number, number>, key: number, value: number) => {
  const next = { ...record };
  if (value === 0) delete next[key];
  else next[key] = value;
  return next;
};

// Applies steering ops in order. An op naming a step outside 1..stepCount is skipped whole, so a
// half-wrong instruction never changes the wrong step; keep and drop undo each other per step.
export function applyOps(constraints: Constraints, ops: PatchOp[], stepCount: number): ApplyResult {
  const valid = (step: number) => step >= 1 && step <= stepCount;
  const applied: PatchOp[] = [];
  const skipped: PatchOp[] = [];
  let next = constraints;

  for (const op of ops) {
    const steps = "steps" in op ? op.steps : "step" in op ? [op.step] : [];
    if (!steps.every(valid)) {
      skipped.push(op);
      continue;
    }
    applied.push(op);
    switch (op.op) {
      case "setTarget":
        next = { ...next, targetS: op.seconds };
        break;
      case "keep":
        next = {
          ...next,
          pinned: [...new Set([...next.pinned, ...op.steps])].sort((a, b) => a - b),
          dropped: next.dropped.filter((s) => !op.steps.includes(s)),
        };
        break;
      case "drop":
        next = {
          ...next,
          dropped: [...new Set([...next.dropped, ...op.steps])].sort((a, b) => a - b),
          pinned: next.pinned.filter((s) => !op.steps.includes(s)),
        };
        break;
      case "emphasize":
        next = { ...next, emphasis: withKey(next.emphasis, op.step, op.seconds) };
        break;
      case "setSpeed":
        next = { ...next, speed: withKey(next.speed, op.step, op.factor) };
        break;
      case "setTitle":
        next = { ...next, titles: { ...next.titles, [op.step]: op.text } };
        break;
      case "setIntro":
        next = { ...next, intro: op.text };
        break;
      case "setOutro":
        next = { ...next, outro: op.text };
        break;
    }
  }
  return { constraints: next, applied, skipped };
}

const list = (steps: number[]) =>
  steps.length === 1
    ? `step ${steps[0]}`
    : `steps ${steps.slice(0, -1).join(", ")} and ${steps.at(-1)}`;

// One short phrase per op, for the line under the steer box: "length 60 s, keep step 4".
export function describeOps(ops: PatchOp[]): string {
  return ops
    .map((op) => {
      switch (op.op) {
        case "setTarget":
          return `length ${op.seconds} s`;
        case "keep":
          return `keep ${list(op.steps)}`;
        case "drop":
          return `drop ${list(op.steps)}`;
        case "emphasize":
          return op.seconds === 0
            ? `normal review on step ${op.step}`
            : `${op.seconds} s more review on step ${op.step}`;
        case "setSpeed":
          return `step ${op.step} at ${op.factor}x`;
        case "setTitle":
          return `step ${op.step} titled "${op.text}"`;
        case "setIntro":
          return `intro "${op.text}"`;
        case "setOutro":
          return `outro "${op.text}"`;
      }
    })
    .join(", ");
}
