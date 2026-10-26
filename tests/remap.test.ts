import { describe, expect, it } from "vitest";
import { remap } from "@/lib/plan/remap";
import type { EDL } from "@/shared/types";

// card 2 s | hold 3 s at 10 | fast 2 s over [10, 50] at 20x | real 4 s from 60 | card 1 s
const edl: EDL = {
  segments: [
    { id: "intro", mode: "card", outDur: 2 },
    { id: "1-hold", step: 1, mode: "hold", srcT: 10, outDur: 3 },
    { id: "1-fast", step: 1, mode: "fast", src: [10, 50], speed: 20, outDur: 2 },
    { id: "1-real", step: 1, mode: "real", src: [60, 64], outDur: 4 },
    { id: "outro", mode: "card", outDur: 1 },
  ],
  totalS: 12,
};

const at = (outT: number) => {
  const r = remap(edl, outT);
  return r && { id: r.segment.id, local: r.local, srcT: r.srcT };
};

describe("remap", () => {
  it.each([
    [0, { id: "intro", local: 0, srcT: undefined }],
    [2.5, { id: "1-hold", local: 0.5, srcT: 10 }],
    [5.5, { id: "1-fast", local: 0.5, srcT: 20 }],
    [8, { id: "1-real", local: 1, srcT: 61 }],
    [11.5, { id: "outro", local: 0.5, srcT: undefined }],
  ])("maps output %s s into its segment", (outT, expected) => {
    expect(at(outT)).toEqual(expected);
  });

  it("starts the next segment exactly at a boundary", () => {
    expect(at(5)).toEqual({ id: "1-fast", local: 0, srcT: 10 });
    expect(at(7)).toEqual({ id: "1-real", local: 0, srcT: 60 });
  });

  it("never steps past the end of a fast-forward", () => {
    const r = remap(edl, 7 - 1e-12);
    expect(r?.segment.id).toBe("1-fast");
    expect(r?.srcT).toBeLessThanOrEqual(50);
  });

  it("clamps times outside the reel to its first and last frame", () => {
    expect(at(-3)).toEqual({ id: "intro", local: 0, srcT: undefined });
    expect(at(99)).toEqual({ id: "outro", local: 1, srcT: undefined });
    expect(remap({ segments: [], totalS: 0 }, 1)).toBeUndefined();
  });

  it("moves source time forward monotonically through a real segment", () => {
    const times = [7, 8, 9, 10.999].map((t) => remap(edl, t)?.srcT ?? -1);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(times[3]).toBeCloseTo(63.999, 9);
  });
});

describe("zero-length segments", () => {
  it("are never shown, even at the end boundary", () => {
    const withEmpty: EDL = {
      segments: [
        { id: "h", step: 1, mode: "hold", srcT: 10, outDur: 2 },
        { id: "r", step: 1, mode: "real", src: [99, 99], outDur: 0 },
      ],
      totalS: 2,
    };
    expect(remap(withEmpty, 2)).toMatchObject({ segment: { id: "h" }, srcT: 10 });
    expect(
      remap({ segments: [{ id: "c", mode: "card", outDur: 0 }], totalS: 0 }, 0),
    ).toBeUndefined();
  });
});
