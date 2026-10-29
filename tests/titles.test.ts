import { describe, expect, it } from "vitest";
import { TitlesRequestSchema, TitlesResponseSchema } from "@/shared/titles";
import type { Constraints, Step } from "@/shared/types";
import { titlesRequest } from "@/state/titlesClient";

const step = (index: number, prompt: string): Step => ({
  index,
  prompt,
  title: prompt.slice(0, 20),
  promptT: index * 100,
  workEnd: index * 100 + 60,
  reviewEnd: index * 100 + 90,
  tools: [],
  reviewActivity: 0.5,
});

const constraints: Constraints = {
  targetS: 90,
  pinned: [],
  dropped: [],
  emphasis: {},
  speed: {},
  titles: { 2: "My own title" },
  prompts: { 4: "Add captions" },
  hiddenPrompts: [3],
};

const steps = [
  step(1, "x".repeat(700)),
  step(2, "Add a post draft"),
  step(3, "Paste the private notes"),
  step(4, "Add SRT caption export next to the mp4 export"),
];

describe("titlesRequest", () => {
  const request = titlesRequest(steps, constraints);

  it("asks only for untitled, visible prompts, as edited and cut short", () => {
    expect(request?.steps.map((s) => s.index)).toEqual([1, 4]);
    expect(request?.steps[0]?.prompt).toHaveLength(300);
    expect(request?.steps[1]?.prompt).toBe("Add captions");
    expect(TitlesRequestSchema.safeParse(request).success).toBe(true);
  });

  it("asks nothing when every step is titled or hidden", () => {
    expect(titlesRequest(steps.slice(1, 3), constraints)).toBeUndefined();
  });
});

describe("titles schemas", () => {
  it("refuses repeated step indexes and overlong titles", () => {
    const repeated = {
      steps: [
        { index: 1, prompt: "a" },
        { index: 1, prompt: "b" },
      ],
    };
    expect(TitlesRequestSchema.safeParse(repeated).success).toBe(false);
    const long = { titles: [{ index: 1, title: "t".repeat(49) }] };
    expect(TitlesResponseSchema.safeParse(long).success).toBe(false);
  });
});
