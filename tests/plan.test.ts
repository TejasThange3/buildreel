import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { activityTrack } from "@/lib/media/activity";
import { planReel } from "@/lib/plan/autoPlan";
import { bestWindow, meanActivity } from "@/lib/timeline/activityWindow";
import type { Constraints, EDL, Step } from "@/shared/types";

const constraints = (patch: Partial<Constraints> = {}): Constraints => ({
  targetS: 90,
  pinned: [],
  dropped: [],
  emphasis: {},
  speed: {},
  titles: {},
  ...patch,
});

// Step k starts at k * 100 s: prompt, 60 s of agent work, then 40 s of review.
function step(index: number, words: number, tools: number, reviewActivity: number): Step {
  const promptT = (index - 1) * 100;
  return {
    index,
    prompt: Array.from({ length: words }, (_, i) => `w${i}`).join(" "),
    title: `Step ${index}`,
    promptT,
    workEnd: promptT + 60,
    reviewEnd: promptT + 100,
    tools: Array.from({ length: tools }, (_, i) => ({ t: promptT + i, label: `Ran ${i}` })),
    reviewActivity,
  };
}

const steps = Array.from({ length: 12 }, (_, i) => step(i + 1, 6 + i * 2, i % 4, (i % 5) / 5));
// Busy screen everywhere, so every review is worth real time.
const busy = Array.from({ length: 2400 }, (_, bin) => 0.2 + ((bin * 37) % 11) / 20);
const stepsIn = (edl: EDL) => [...new Set(edl.segments.flatMap((s) => (s.step ? [s.step] : [])))];
const part = (edl: EDL, id: string) => edl.segments.find((s) => s.id === id);

describe("planReel", () => {
  it("builds hold, fast and real segments with intro and outro when there is room", () => {
    const edl = planReel([step(1, 14, 2, 0.5)], busy, constraints({ targetS: 300 }), 100);
    expect(edl.segments.map((s) => s.id)).toEqual(["intro", "1-hold", "1-fast", "1-real", "outro"]);
    expect(part(edl, "1-hold")).toMatchObject({ mode: "hold", srcT: 0, outDur: 4 });
    expect(part(edl, "1-fast")).toMatchObject({ mode: "fast", src: [0, 60], speed: 20, outDur: 3 });
    // No pressure, so real time grows from 6 s to the whole 40 s review.
    expect(part(edl, "1-real")).toMatchObject({ mode: "real", src: [60, 100], outDur: 40 });
    expect(part(edl, "1-real")?.overlay).toEqual({ kind: "title", text: "Step 1" });
    expect(edl.totalS).toBeCloseTo(2.5 + 4 + 3 + 40 + 3, 9);
  });

  it.each([30, 60, 90, 200])("lands exactly on a %i s target", (targetS) => {
    const edl = planReel(steps, busy, constraints({ targetS }), 1200);
    expect(edl.totalS).toBeCloseTo(targetS, 6);
    expect(edl.segments.reduce((sum, s) => sum + s.outDur, 0)).toBeCloseTo(edl.totalS, 9);
  });

  it("gives the same plan for the same input", () => {
    const c = constraints({ targetS: 60, pinned: [2], emphasis: { 5: 3 } });
    expect(planReel(steps, busy, c, 1200)).toEqual(planReel(steps, busy, c, 1200));
  });

  it("shrinks real time first, leaving prompt cards and fast-forward alone under mild pressure", () => {
    const three = steps.slice(0, 3);
    const roomy = planReel(three, busy, constraints({ targetS: 1000 }), 300);
    const tight = planReel(three, busy, constraints({ targetS: roomy.totalS - 20 }), 300);
    for (const id of ["1-hold", "2-fast", "3-hold"]) {
      expect(part(tight, id)?.outDur).toBe(part(roomy, id)?.outDur);
    }
    expect(part(tight, "1-real")?.outDur).toBeLessThan(part(roomy, "1-real")?.outDur ?? 0);
  });

  it("never drops pinned steps and never shows dropped ones", () => {
    const edl = planReel(
      steps,
      busy,
      constraints({ targetS: 30, pinned: [1, 2], dropped: [12] }),
      1200,
    );
    expect(stepsIn(edl)).toEqual(expect.arrayContaining([1, 2]));
    expect(stepsIn(edl)).not.toContain(12);
  });

  it("drops the least important step first, the later one on a tie", () => {
    const twins = [step(1, 10, 1, 0.5), step(2, 10, 1, 0.5), step(3, 30, 3, 0.9)];
    // Three steps need at least 25 s (each 2 + 1.5 + 3, plus the cards), two need 18.5 s.
    const tight = planReel(twins, busy, constraints({ targetS: 22 }), 300);
    expect(stepsIn(tight)).toEqual([1, 3]);
  });

  it("lets pinned steps run over the target rather than drop them", () => {
    const all = steps.map((s) => s.index);
    expect(
      planReel(steps, busy, constraints({ targetS: 30, pinned: all }), 1200).totalS,
    ).toBeGreaterThan(30);
  });

  it("adds emphasis after fitting, up to the review length", () => {
    const base = planReel(steps, busy, constraints({ targetS: 60 }), 1200);
    const kept = stepsIn(base)[0] ?? 0;
    const more = planReel(steps, busy, constraints({ targetS: 60, emphasis: { [kept]: 4 } }), 1200);
    expect(more.totalS).toBeCloseTo(64, 6);
    const huge = planReel(
      [step(1, 10, 1, 0.5)],
      busy,
      constraints({ targetS: 20, emphasis: { 1: 500 } }),
      100,
    );
    expect(part(huge, "1-real")?.outDur).toBe(40);
  });

  it("keeps a forced fast-forward speed instead of shrinking it", () => {
    const edl = planReel(
      steps,
      busy,
      constraints({ targetS: 40, pinned: [1], speed: { 1: 10 } }),
      1200,
    );
    expect(part(edl, "1-fast")).toMatchObject({ speed: 10, outDur: 6 });
  });

  it("honours a forced slow-motion speed exactly", () => {
    const edl = planReel(
      [step(1, 10, 1, 0.5)],
      busy,
      constraints({ targetS: 300, speed: { 1: 0.5 } }),
      100,
    );
    expect(part(edl, "1-fast")).toMatchObject({ speed: 0.5, outDur: 120 });
  });

  it("leaves out real time for a still review unless it is emphasized", () => {
    const still = new Array<number>(240).fill(0);
    const one = [step(1, 10, 1, 0)];
    expect(
      part(planReel(one, still, constraints({ targetS: 300 }), 100), "1-real"),
    ).toBeUndefined();
    const emphasized = planReel(one, still, constraints({ targetS: 300, emphasis: { 1: 2 } }), 100);
    expect(part(emphasized, "1-real")?.outDur).toBeGreaterThan(0);
  });

  it("writes build stats on the outro and honours steered card text", () => {
    const edl = planReel(steps, busy, constraints({ targetS: 60, titles: { 1: "Parser" } }), 1260);
    const kept = stepsIn(edl).length;
    expect(part(edl, "outro")?.overlay).toEqual({
      kind: "stats",
      text: `${kept} steps from 12 prompts, 204 words dictated\n21 min of recording in 60 s`,
    });
    const steered = planReel(
      steps,
      busy,
      constraints({ intro: "Buildreel", outro: "Thanks" }),
      1260,
    );
    expect(part(steered, "intro")?.overlay).toEqual({ kind: "title", text: "Buildreel" });
    expect(part(steered, "outro")?.overlay).toEqual({ kind: "stats", text: "Thanks" });
  });
});

describe("bestWindow", () => {
  it("finds the window switch in real OBS activity", () => {
    const fixture = z
      .object({ packets: z.array(z.tuple([z.number(), z.number(), z.number()])) })
      .parse(JSON.parse(readFileSync("tests/fixtures/obs-packets-60s.json", "utf8")));
    const activity = activityTrack(
      fixture.packets.map(([ms, bytes, key]) => ({
        timestamp: ms / 1000,
        byteLength: bytes,
        type: key ? "key" : "delta",
      })),
      60,
    );
    // The switch is 36 s into this minute (916 s into the original recording).
    const { start } = bestWindow(activity, 0, 60, 3);
    expect(start).toBeGreaterThan(33);
    expect(start).toBeLessThan(37);
  });

  it("matches a fine brute-force scan", () => {
    for (let trial = 0; trial < 50; trial++) {
      const activity = Array.from(
        { length: 40 },
        (_, i) => ((i * 7919 + trial * 104729) % 97) / 97,
      );
      const from = (trial % 13) * 0.37;
      const to = from + 3 + (trial % 7) * 1.3;
      const length = Math.min(0.7 + (trial % 5) * 0.91, to - from);
      let brute = 0;
      for (let s = from; s <= to - length + 1e-9; s += 0.01) {
        brute = Math.max(brute, meanActivity(activity, s, s + length));
      }
      expect(bestWindow(activity, from, to, length).activity).toBeGreaterThanOrEqual(brute - 1e-9);
    }
  });
});
