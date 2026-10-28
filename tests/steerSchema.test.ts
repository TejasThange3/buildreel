import { describe, expect, it } from "vitest";
import { SteerRequestSchema } from "@/shared/steer";

const step = (index: number) => ({ index, title: "t", excerpt: "e", outDur: 5, kept: true });
const request = (indexes: number[]) => ({
  instruction: "make it a minute",
  targetS: 90,
  steps: indexes.map(step),
});

describe("SteerRequestSchema", () => {
  it("accepts steps numbered 1..N in order", () => {
    expect(SteerRequestSchema.safeParse(request([1, 2, 3])).success).toBe(true);
  });

  it("rejects gaps, duplicates and a lone high index", () => {
    expect(SteerRequestSchema.safeParse(request([1, 3])).success).toBe(false);
    expect(SteerRequestSchema.safeParse(request([1, 1, 2])).success).toBe(false);
    expect(SteerRequestSchema.safeParse(request([80])).success).toBe(false);
  });

  it("rejects a blank instruction", () => {
    expect(SteerRequestSchema.safeParse({ ...request([1]), instruction: "   " }).success).toBe(
      false,
    );
  });
});
