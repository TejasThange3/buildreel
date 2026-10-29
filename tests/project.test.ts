import { describe, expect, it } from "vitest";
import { openProject, saveProject } from "@/shared/project";
import type { Constraints } from "@/shared/types";

const constraints: Constraints = {
  targetS: 60,
  pinned: [3],
  dropped: [2],
  emphasis: { 3: 4 },
  speed: { 1: 120 },
  titles: { 3: "Project files" },
  prompts: { 1: "Add captions" },
  hiddenPrompts: [2],
  intro: "Three features by voice",
};
const recording = { name: "2026-10-29 13-30-00.mp4", durationS: 1260.4 };

describe("project file", () => {
  const autoTitles = { 1: "Caption export" };
  const text = saveProject({ recording, offsetS: -2.5, constraints, autoTitles });

  it("opens what it saved for the same recording", () => {
    expect(openProject(text, 1260.1)).toEqual({ ok: true, offsetS: -2.5, constraints, autoTitles });
  });

  it("keeps the recording's start time, so reopening elsewhere keeps the sync", () => {
    const pinned = saveProject({
      recording: { ...recording, startedAt: 1_793_260_248_000 },
      offsetS: -0.8,
      constraints,
      autoTitles,
    });
    expect(openProject(pinned, 1260.4)).toMatchObject({ ok: true, startedAt: 1_793_260_248_000 });
    expect(openProject(text, 1260.4)).toMatchObject({ ok: true, startedAt: undefined });
  });

  it("refuses a different recording, naming the one it was saved for", () => {
    const opened = openProject(text, 900);
    expect(opened.ok).toBe(false);
    if (!opened.ok) expect(opened.message).toContain("2026-10-29 13-30-00.mp4");
  });

  it("refuses broken JSON and files from elsewhere", () => {
    expect(openProject("{", 1260).ok).toBe(false);
    expect(openProject('{"name":"buildreel","version":"1.0.0"}', 1260).ok).toBe(false);
  });

  it("refuses constraints out of range", () => {
    const bad = JSON.parse(text);
    bad.constraints.targetS = 5000;
    expect(openProject(JSON.stringify(bad), 1260).ok).toBe(false);
  });
});
