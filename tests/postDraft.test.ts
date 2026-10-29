import { describe, expect, it } from "vitest";
import { postDraft, xLength } from "@/lib/render/postDraft";
import type { Constraints, EDL, Segment, Step } from "@/shared/types";

const step = (index: number, prompt: string, title: string): Step => ({
  index,
  prompt,
  title,
  promptT: index * 100,
  workEnd: index * 100 + 60,
  reviewEnd: index * 100 + 90,
  tools: [],
  reviewActivity: 0.5,
});

// A reel that shows the given steps, 10 s each, plus a zero-length leftover of step 99.
const reel = (shown: number[]): EDL => {
  const segments: Segment[] = [
    ...shown.map((s): Segment => ({
      id: `${s}-real`,
      step: s,
      mode: "real",
      src: [0, 10],
      outDur: 10,
    })),
    { id: "99-real", step: 99, mode: "real", src: [0, 0], outDur: 0 },
  ];
  return { segments, totalS: 88 };
};

const steps = [
  step(1, "Add SRT caption export next to the mp4 export", "SRT caption export"),
  step(2, "Add a post draft for X and LinkedIn with a copy button", "Post draft"),
  step(3, "Add save and load of the project", "Save and load"),
];

const constraints: Constraints = {
  targetS: 90,
  pinned: [],
  dropped: [2],
  emphasis: {},
  speed: {},
  titles: { 3: "Project files" },
  prompts: {},
  hiddenPrompts: [],
};

describe("postDraft", () => {
  const draft = postDraft(steps, constraints, reel([1, 3]), 1260);

  it("lists the steps in the reel under the titles the reel shows", () => {
    expect(draft.linkedin).toContain("1. SRT caption export\n2. Project files");
    expect(draft.linkedin).not.toContain("Post draft");
  });

  it("leaves out steps cut to fit the length, not only dropped ones", () => {
    const cut = postDraft(steps, { ...constraints, dropped: [] }, reel([3]), 1260);
    expect(cut.linkedin).toContain("1. Project files");
    expect(cut.linkedin).not.toContain("SRT caption export");
  });

  it("counts every prompt and dictated word, as the outro card does", () => {
    expect(draft.x).toContain("3 prompts, 28 words dictated with Wispr Flow.");
    expect(draft.x).toContain("21 min of building cut to a 88 s reel.");
  });

  it("drops steps from the end until the X post fits 280 characters", () => {
    const long = Array.from({ length: 12 }, (_, i) =>
      step(i + 1, "word", `A fairly long step title number ${i + 1}`),
    );
    const shown = long.map((s) => s.index);
    const x = postDraft(long, { ...constraints, dropped: [], titles: {} }, reel(shown), 1260).x;
    expect(xLength(x)).toBeLessThanOrEqual(280);
    expect(x).toContain("1. A fairly long step title number 1");
    expect(x).not.toContain("12. A fairly");
    expect(x.endsWith("Reel made with Buildreel.")).toBe(true);
  });

  it("weighs CJK titles double, as X does", () => {
    expect(xLength("ab")).toBe(2);
    expect(xLength("字幕")).toBe(4);
    const cjk = [1, 2, 3].map((i) => step(i, "word", "字".repeat(40)));
    const x = postDraft(cjk, { ...constraints, dropped: [], titles: {} }, reel([1, 2, 3]), 1260).x;
    expect(xLength(x)).toBeLessThanOrEqual(280);
    expect(x.length).toBeLessThan(280);
  });
});
