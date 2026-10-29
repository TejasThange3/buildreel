import { describe, expect, it } from "vitest";
import { applyOps, describeOps } from "@/lib/plan/applyOps";
import { PatchOpSchema, type PatchOp } from "@/shared/steer";
import type { Constraints } from "@/shared/types";

const base = (patch: Partial<Constraints> = {}): Constraints => ({
  targetS: 90,
  pinned: [],
  dropped: [],
  emphasis: {},
  speed: {},
  titles: {},
  prompts: {},
  hiddenPrompts: [],
  ...patch,
});

describe("applyOps", () => {
  it("applies the demo sentence: a minute, keeping step 4", () => {
    const ops: PatchOp[] = [
      { op: "setTarget", seconds: 60 },
      { op: "keep", steps: [4] },
    ];
    const { constraints, applied, skipped } = applyOps(base({ dropped: [4] }), ops, 6);
    expect(constraints.targetS).toBe(60);
    expect(constraints.pinned).toEqual([4]);
    expect(constraints.dropped).toEqual([]);
    expect(applied).toEqual(ops);
    expect(skipped).toEqual([]);
  });

  it("makes keep and drop undo each other, in order", () => {
    const { constraints } = applyOps(
      base(),
      [
        { op: "keep", steps: [2, 3] },
        { op: "drop", steps: [3, 1] },
      ],
      4,
    );
    expect(constraints.pinned).toEqual([2]);
    expect(constraints.dropped).toEqual([1, 3]);
  });

  it("skips an op whole when any step index is out of range", () => {
    const ops: PatchOp[] = [
      { op: "drop", steps: [2, 9] },
      { op: "emphasize", step: 0, seconds: 5 },
      { op: "setTitle", step: 5, text: "Too far" },
      { op: "setTarget", seconds: 45 },
    ];
    const { constraints, applied, skipped } = applyOps(base(), ops, 4);
    expect(constraints.dropped).toEqual([]);
    expect(constraints.emphasis).toEqual({});
    expect(constraints.titles).toEqual({});
    expect(constraints.targetS).toBe(45);
    expect(applied).toEqual([{ op: "setTarget", seconds: 45 }]);
    expect(skipped).toHaveLength(3);
  });

  it("sets emphasis and speed, and clears emphasis at zero", () => {
    const { constraints } = applyOps(
      base({ emphasis: { 1: 4 } }),
      [
        { op: "emphasize", step: 2, seconds: 6 },
        { op: "emphasize", step: 1, seconds: 0 },
        { op: "setSpeed", step: 3, factor: 40 },
      ],
      3,
    );
    expect(constraints.emphasis).toEqual({ 2: 6 });
    expect(constraints.speed).toEqual({ 3: 40 });
  });

  it("sets titles, intro and outro without touching the input", () => {
    const input = base();
    const { constraints } = applyOps(
      input,
      [
        { op: "setTitle", step: 3, text: "The sync fix" },
        { op: "setIntro", text: "Building Buildreel" },
        { op: "setOutro", text: "Thanks for watching" },
      ],
      3,
    );
    expect(constraints.titles).toEqual({ 3: "The sync fix" });
    expect(constraints.intro).toBe("Building Buildreel");
    expect(constraints.outro).toBe("Thanks for watching");
    expect(input).toEqual(base());
  });
});

describe("PatchOpSchema", () => {
  it("rejects out-of-bounds values and extra fields", () => {
    expect(PatchOpSchema.safeParse({ op: "setTarget", seconds: 5 }).success).toBe(false);
    expect(PatchOpSchema.safeParse({ op: "keep", steps: [] }).success).toBe(false);
    expect(PatchOpSchema.safeParse({ op: "keep", steps: [1.5] }).success).toBe(false);
    expect(PatchOpSchema.safeParse({ op: "setIntro", text: "x", extra: 1 }).success).toBe(false);
    expect(PatchOpSchema.safeParse({ op: "keep", steps: [2] }).success).toBe(true);
  });
});

describe("describeOps", () => {
  it("summarises ops in plain words", () => {
    expect(
      describeOps([
        { op: "setTarget", seconds: 60 },
        { op: "keep", steps: [4] },
        { op: "drop", steps: [1, 2, 3] },
        { op: "emphasize", step: 5, seconds: 4 },
      ]),
    ).toBe("length 60 s, keep step 4, drop steps 1, 2 and 3, 4 s more review on step 5");
  });
});
