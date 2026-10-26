import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseClaudeLogs } from "@/lib/log/parseClaudeLog";
import { alignEvents } from "@/lib/timeline/align";
import { buildSteps } from "@/lib/timeline/steps";
import type { AlignedEvent } from "@/shared/types";

// Real session fixture against the two real OBS recordings it overlaps. Starts are the
// filename times (14-54-50 and 15-28-26 IST) in UTC; durations come from ffprobe.
const fixture = (name: string) =>
  readFileSync(`tests/fixtures/desktop-session/${name}.jsonl`, "utf8");
const { events } = parseClaudeLogs([fixture("main-session"), fixture("side-question")]);
const recording1 = { startedAt: Date.UTC(2026, 9, 26, 9, 24, 50), durationS: 1268.8 };
const recording2 = { startedAt: Date.UTC(2026, 9, 26, 9, 58, 26), durationS: 1209.8 };

describe("alignment on the real build", () => {
  it("places each recording's own prompt where the frames show it", () => {
    // Frame checks: submitted at about 16.6 s in recording 1 and about 20.0 s in recording 2.
    const one = buildSteps(alignEvents(events, recording1.startedAt, 0), recording1.durationS, []);
    const two = buildSteps(alignEvents(events, recording2.startedAt, 0), recording2.durationS, []);
    expect(one.steps.map((s) => s.title)).toEqual(["You can start with phase zero."]);
    expect(one.steps[0]?.promptT).toBeCloseTo(18.98, 2);
    expect(two.steps.map((s) => s.title)).toEqual(["Okay, you can continue with phase one."]);
    expect(two.steps[0]?.promptT).toBeCloseTo(20.32, 2);
    expect([one.droppedSteps, two.droppedSteps]).toEqual([5, 5]);
  });

  it("applies the sync nudge to every event", () => {
    const nudged = alignEvents(events, recording1.startedAt, -2.4);
    const plain = alignEvents(events, recording1.startedAt, 0);
    expect(nudged.every((e, i) => Math.abs(e.t - (plain[i]?.t ?? 0) + 2.4) < 1e-9)).toBe(true);
  });
});

const prompt = (t: number, text: string): AlignedEvent => ({
  kind: "prompt",
  at: 0,
  t,
  text,
  sessionId: "s1",
});
const toolAt = (t: number, label: string): AlignedEvent => ({
  kind: "tool",
  at: 0,
  t,
  tool: "Bash",
  label,
});
const turnEnd = (t: number): AlignedEvent => ({ kind: "turnEnd", at: 0, t });

describe("buildSteps", () => {
  it("splits work at the turn end and review at the next prompt", () => {
    const { steps } = buildSteps(
      [
        toolAt(1, "orphan before any prompt"),
        prompt(10, "Add a parser."),
        toolAt(12, "Ran tests"),
        turnEnd(20),
        prompt(30, "Now the planner."),
        toolAt(31, "Edited fit.ts"),
        turnEnd(40),
      ],
      50,
      [],
    );
    expect(steps.map((s) => [s.index, s.promptT, s.workEnd, s.reviewEnd])).toEqual([
      [1, 10, 20, 30],
      [2, 30, 40, 50],
    ]);
    expect(steps[0]?.tools).toEqual([{ t: 12, label: "Ran tests" }]);
  });

  it("ends work at the last tool when no turn end was logged, or at the prompt if idle", () => {
    const { steps } = buildSteps(
      [prompt(0, "one"), toolAt(5, "Ran a"), toolAt(8, "Ran b"), prompt(12, "two")],
      20,
      [],
    );
    expect(steps.map((s) => s.workEnd)).toEqual([8, 12]);
  });

  it("clamps a turn that outlives the recording", () => {
    const { steps } = buildSteps(
      [prompt(10, "long job"), toolAt(25, "Ran build"), turnEnd(90)],
      30,
      [],
    );
    expect(steps[0]).toMatchObject({ workEnd: 30, reviewEnd: 30 });
    expect(steps[0]?.tools).toHaveLength(1);
  });

  it("drops and counts steps outside the recording and renumbers the rest", () => {
    const { steps, droppedSteps } = buildSteps(
      [prompt(-5, "before"), turnEnd(-1), prompt(3, "inside"), prompt(70, "after")],
      60,
      [],
    );
    expect(droppedSteps).toBe(2);
    expect(steps.map((s) => [s.index, s.prompt, s.reviewEnd])).toEqual([[1, "inside", 60]]);
  });

  it("titles a step with its first sentence, cut at a word", () => {
    const long = "Make the export panel show progress for every encoded frame and let me cancel it";
    const { steps } = buildSteps(
      [
        prompt(0, "Fix the sync. Then rerun tests."),
        prompt(1, "first line\nsecond"),
        prompt(2, long),
      ],
      3,
      [],
    );
    expect(steps.map((s) => s.title)).toEqual([
      "Fix the sync.",
      "first line",
      "Make the export panel show progress for every…",
    ]);
  });

  it("averages activity over the review window only", () => {
    // Bins are 0.5 s: work covers bins 0-3, review bins 4-7.
    const activity = [1, 1, 1, 1, 0.2, 0.4, 0.6, 0.8];
    const { steps } = buildSteps([prompt(0, "go"), turnEnd(2)], 4, activity);
    expect(steps[0]?.reviewActivity).toBeCloseTo(0.5, 9);
  });
});
