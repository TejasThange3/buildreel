import { describe, expect, it } from "vitest";
import { postDraft } from "@/lib/render/postDraft";
import type { Constraints, Step } from "@/shared/types";

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
};

describe("postDraft", () => {
  const draft = postDraft(steps, constraints, 1260, 88);

  it("lists kept steps under the titles the reel shows", () => {
    expect(draft.linkedin).toContain("1. SRT caption export\n2. Project files");
    expect(draft.linkedin).not.toContain("Post draft");
  });

  it("counts every prompt and dictated word, as the outro card does", () => {
    expect(draft.x).toContain("3 prompts, 28 words dictated with Wispr Flow.");
    expect(draft.x).toContain("21 min of building cut to a 88 s reel.");
  });

  it("drops steps from the end until the X post fits 280 characters", () => {
    const long = Array.from({ length: 12 }, (_, i) =>
      step(i + 1, "word", `A fairly long step title number ${i + 1}`),
    );
    const x = postDraft(long, { ...constraints, dropped: [], titles: {} }, 1260, 88).x;
    expect(x.length).toBeLessThanOrEqual(280);
    expect(x).toContain("1. A fairly long step title number 1");
    expect(x).not.toContain("12. A fairly");
    expect(x.endsWith("Reel made with Buildreel.")).toBe(true);
  });
});
